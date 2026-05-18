use std::fs::File;
use std::io::{BufReader, Cursor, Read, Seek, SeekFrom};
use std::path::Path;
use std::sync::Arc;
use std::time::{Duration, Instant};

use parking_lot::Mutex;
use rodio::{OutputStream, OutputStreamHandle, Sink, Source};
use tauri::{AppHandle, Emitter};

use crate::db::Db;
use crate::decoder::SymphDecoder;
use crate::error::{AppError, AppResult};
use crate::model::{SourceKind, Track};
use crate::webdav;

/// A unified Read + Seek source backing rodio's decoder.
pub enum AudioInput {
    File(BufReader<File>),
    Memory(Cursor<Vec<u8>>),
}

impl Read for AudioInput {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        match self {
            AudioInput::File(r) => r.read(buf),
            AudioInput::Memory(r) => r.read(buf),
        }
    }
}

impl Seek for AudioInput {
    fn seek(&mut self, pos: SeekFrom) -> std::io::Result<u64> {
        match self {
            AudioInput::File(r) => r.seek(pos),
            AudioInput::Memory(r) => r.seek(pos),
        }
    }
}

pub struct AudioEngine {
    _stream: OutputStream,
    handle: OutputStreamHandle,
    inner: Arc<Mutex<Inner>>,
    app: AppHandle,
}

struct Inner {
    sink: Option<Sink>,
    current_track: Option<Track>,
    started_at: Option<Instant>,
    base_position_ms: u64,
    duration_ms: u64,
    volume: f32,
    paused_at: Option<Instant>,
    progress_generation: u64,
}

// SAFETY: cpal's Stream on macOS is !Send because of CoreAudio property listeners.
// We keep `_stream` on whichever thread first holds the AudioEngine and never send
// it elsewhere; only the Sink (which is Send) crosses thread boundaries.
unsafe impl Send for AudioEngine {}
unsafe impl Sync for AudioEngine {}

impl AudioEngine {
    pub fn new(app: AppHandle) -> AppResult<Self> {
        let (stream, handle) =
            OutputStream::try_default().map_err(|e| AppError::Audio(e.to_string()))?;
        let inner = Inner {
            sink: None,
            current_track: None,
            started_at: None,
            base_position_ms: 0,
            duration_ms: 0,
            volume: 0.5,
            paused_at: None,
            progress_generation: 0,
        };
        Ok(Self {
            _stream: stream,
            handle,
            inner: Arc::new(Mutex::new(inner)),
            app,
        })
    }

    pub fn play(&self, db: &Db, track: Track) -> AppResult<()> {
        let input = open_input(db, &track)?;
        let ext = track.uri.rsplit('.').next().map(|e| e.to_lowercase());
        let decoder = SymphDecoder::new(input, ext.as_deref())?;
        let total_duration_ms = track.duration_ms.unwrap_or_else(|| {
            decoder
                .total_duration()
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0)
        });

        let mut g = self.inner.lock();
        if let Some(sink) = g.sink.take() {
            sink.stop();
        }

        let sink = Sink::try_new(&self.handle).map_err(|e| AppError::Audio(e.to_string()))?;
        sink.set_volume(g.volume);
        sink.append(decoder);
        sink.play();

        g.sink = Some(sink);
        g.current_track = Some(track);
        g.started_at = Some(Instant::now());
        g.base_position_ms = 0;
        g.duration_ms = total_duration_ms;
        g.paused_at = None;
        g.progress_generation = g.progress_generation.wrapping_add(1);
        let gen = g.progress_generation;
        drop(g);

        self.spawn_progress_task(gen);
        self.emit_state();
        Ok(())
    }

    pub fn resume(&self) -> AppResult<()> {
        let mut g = self.inner.lock();
        if let Some(sink) = &g.sink {
            if sink.is_paused() {
                sink.play();
                if let Some(paused_at) = g.paused_at.take() {
                    if let Some(started) = g.started_at {
                        let pause_len = Instant::now().duration_since(paused_at);
                        g.started_at = Some(started + pause_len);
                    }
                }
            }
        }
        drop(g);
        self.emit_state();
        Ok(())
    }

    pub fn pause(&self) -> AppResult<()> {
        let mut g = self.inner.lock();
        if let Some(sink) = &g.sink {
            if !sink.is_paused() {
                sink.pause();
                g.paused_at = Some(Instant::now());
            }
        }
        drop(g);
        self.emit_state();
        Ok(())
    }

    pub fn toggle(&self) -> AppResult<()> {
        let is_paused = {
            let g = self.inner.lock();
            g.sink.as_ref().map(|s| s.is_paused()).unwrap_or(true)
        };
        if is_paused {
            self.resume()
        } else {
            self.pause()
        }
    }

    pub fn stop(&self) -> AppResult<()> {
        let mut g = self.inner.lock();
        if let Some(sink) = g.sink.take() {
            sink.stop();
        }
        g.current_track = None;
        g.started_at = None;
        g.base_position_ms = 0;
        g.duration_ms = 0;
        g.paused_at = None;
        g.progress_generation = g.progress_generation.wrapping_add(1);
        drop(g);
        self.emit_state();
        Ok(())
    }

    pub fn seek(&self, db: Arc<Db>, position_ms: u64) -> AppResult<()> {
        let track = {
            let g = self.inner.lock();
            match g.current_track.clone() {
                Some(t) => t,
                None => return Ok(()),
            }
        };

        // Optimistically update the position display so the UI feels instant.
        {
            let mut g = self.inner.lock();
            g.base_position_ms = position_ms;
            g.started_at = Some(Instant::now());
            g.paused_at = None;
            g.progress_generation = g.progress_generation.wrapping_add(1);
        }
        self.emit_state();

        let inner = self.inner.clone();
        let app = self.app.clone();
        let handle = self.handle.clone();

        std::thread::spawn(move || {
            // Fast path: ask the running sink to seek in place.
            // For formats with a seek index (FLAC SEEKTABLE, MP3 Xing/VBRI TOC,
            // WAV) this is O(1) and completes in one audio-thread callback (~10ms).
            let fast_ok = {
                let g = inner.lock();
                g.sink
                    .as_ref()
                    .map(|s| sink_try_seek(s, Duration::from_millis(position_ms)))
                    .unwrap_or(false)
            };

            if fast_ok {
                let gen = {
                    let g = inner.lock();
                    g.progress_generation
                };
                spawn_progress_task_static(gen, app, inner);
                return;
            }

            // Slow path: rebuild decoder with O(1) native seek via symphonia.
            // Only reached for formats/files where in-place seek is unsupported.
            let input = match open_input(&db, &track) {
                Ok(i) => i,
                Err(_) => return,
            };
            let ext = track.uri.rsplit('.').next().map(|e| e.to_lowercase());
            let mut decoder = match SymphDecoder::new(input, ext.as_deref()) {
                Ok(d) => d,
                Err(_) => return,
            };
            let total_duration_ms = track.duration_ms.unwrap_or_else(|| {
                decoder
                    .total_duration()
                    .map(|d| d.as_millis() as u64)
                    .unwrap_or(0)
            });
            let _ = decoder.try_seek(Duration::from_millis(position_ms));

            let gen = {
                let mut g = inner.lock();
                if let Some(old) = g.sink.take() {
                    old.stop();
                }
                let new_sink = match Sink::try_new(&handle) {
                    Ok(s) => s,
                    Err(_) => return,
                };
                new_sink.set_volume(g.volume);
                new_sink.append(decoder);
                new_sink.play();
                g.sink = Some(new_sink);
                g.base_position_ms = position_ms;
                g.duration_ms = total_duration_ms;
                g.started_at = Some(Instant::now());
                g.paused_at = None;
                g.progress_generation = g.progress_generation.wrapping_add(1);
                g.progress_generation
            };
            let _ = app.emit("player:state", &{
                let g = inner.lock();
                PlayerSnapshot {
                    current_track: g.current_track.clone(),
                    is_playing: g.sink.as_ref().map(|s| !s.is_paused() && !s.empty()).unwrap_or(false),
                    position_ms: compute_position(&g),
                    duration_ms: g.duration_ms,
                    volume: g.volume,
                    finished: false,
                }
            });
            spawn_progress_task_static(gen, app, inner);
        });

        Ok(())
    }

    pub fn set_volume(&self, volume: f32) {
        let mut g = self.inner.lock();
        let v = volume.clamp(0.0, 1.0);
        g.volume = v;
        if let Some(sink) = &g.sink {
            sink.set_volume(v);
        }
        drop(g);
        self.emit_state();
    }

    pub fn snapshot(&self) -> PlayerSnapshot {
        let g = self.inner.lock();
        let is_playing = g
            .sink
            .as_ref()
            .map(|s| !s.is_paused() && !s.empty())
            .unwrap_or(false);
        let position_ms = compute_position(&g);
        PlayerSnapshot {
            current_track: g.current_track.clone(),
            is_playing,
            position_ms,
            duration_ms: g.duration_ms,
            volume: g.volume,
            finished: g.sink.as_ref().map(|s| s.empty()).unwrap_or(true),
        }
    }

    fn emit_state(&self) {
        let snap = self.snapshot();
        let _ = self.app.emit("player:state", &snap);
    }

    fn spawn_progress_task(&self, generation: u64) {
        spawn_progress_task_static(generation, self.app.clone(), self.inner.clone());
    }
}

fn spawn_progress_task_static(generation: u64, app: AppHandle, inner: Arc<Mutex<Inner>>) {
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_millis(500));
        let (snap, finished, current_gen) = {
            let g = inner.lock();
            let is_playing = g
                .sink
                .as_ref()
                .map(|s| !s.is_paused() && !s.empty())
                .unwrap_or(false);
            let position_ms = compute_position(&g);
            let finished = g.sink.as_ref().map(|s| s.empty()).unwrap_or(true);
            (
                PlayerSnapshot {
                    current_track: g.current_track.clone(),
                    is_playing,
                    position_ms,
                    duration_ms: g.duration_ms,
                    volume: g.volume,
                    finished,
                },
                finished,
                g.progress_generation,
            )
        };
        if current_gen != generation {
            break;
        }
        let _ = app.emit("player:state", &snap);
        if finished {
            let corrected = {
                let mut g = inner.lock();
                let elapsed = compute_elapsed(&g);
                if elapsed > 0 && elapsed != g.duration_ms {
                    g.duration_ms = elapsed;
                }
                PlayerSnapshot {
                    current_track: g.current_track.clone(),
                    is_playing: false,
                    position_ms: g.duration_ms,
                    duration_ms: g.duration_ms,
                    volume: g.volume,
                    finished: true,
                }
            };
            let _ = app.emit("player:state", &corrected);
            let _ = app.emit("player:ended", &corrected.current_track);
            break;
        }
    });
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PlayerSnapshot {
    pub current_track: Option<Track>,
    pub is_playing: bool,
    pub position_ms: u64,
    pub duration_ms: u64,
    pub volume: f32,
    pub finished: bool,
}

/// Raw elapsed playback time without any clamping — used to correct duration on finish.
fn compute_elapsed(g: &Inner) -> u64 {
    let elapsed_ms = match (g.started_at, g.paused_at) {
        (Some(start), Some(paused)) => paused.duration_since(start).as_millis() as u64,
        (Some(start), None) => start.elapsed().as_millis() as u64,
        _ => 0,
    };
    g.base_position_ms + elapsed_ms
}

fn compute_position(g: &Inner) -> u64 {
    if g.sink.is_none() {
        // Sink is absent during seek setup; report the target position, not 0.
        return g.base_position_ms;
    }
    let pos = compute_elapsed(g);
    if g.duration_ms > 0 {
        pos.min(g.duration_ms)
    } else {
        pos
    }
}

/// Wrapper around `Sink::try_seek` that treats an empty sink (sound_count == 0)
/// as a failure so the caller falls through to the rebuild path.
fn sink_try_seek(sink: &Sink, pos: Duration) -> bool {
    if sink.empty() {
        return false;
    }
    sink.try_seek(pos).is_ok()
}

fn open_input(db: &Db, track: &Track) -> AppResult<AudioInput> {
    match track.source {
        SourceKind::Local => {
            let file = File::open(Path::new(&track.uri))?;
            Ok(AudioInput::File(BufReader::new(file)))
        }
        SourceKind::Remote => {
            // If linked to a stored remote source, fetch with credentials.
            if let Some(sid) = track.source_id {
                if let Some(src) = db.get_remote_source(sid)? {
                    let cur = webdav::fetch_track_bytes(&src, &track.uri)?;
                    return Ok(AudioInput::Memory(cur));
                }
            }
            // Plain HTTP URL (no auth).
            let bytes = reqwest::blocking::get(&track.uri)
                .and_then(|r| r.error_for_status())?
                .bytes()?;
            Ok(AudioInput::Memory(Cursor::new(bytes.to_vec())))
        }
    }
}
