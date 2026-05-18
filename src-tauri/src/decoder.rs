/// Custom symphonia-based audio decoder that bypasses rodio's SymphoniaDecoder.
///
/// rodio 0.20 has `unreachable!()` for SeekError during format probing, which
/// panics on M4A/ALAC files where the MP4 container must seek to locate the
/// moov atom. Calling symphonia directly with a file-extension hint selects the
/// correct format reader without triggering the multi-reader probe race.
///
/// `SymphDecoder` also implements `rodio::Source::try_seek` so in-place seeking
/// works for FLAC (via SEEKTABLE), MP4 (sample table), and other indexed formats
/// without stopping and rebuilding the sink.
use std::io;
use std::time::Duration;

use rodio::source::SeekError;
use rodio::Source;
use symphonia::core::audio::{AudioBufferRef, Signal};
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::errors::Error as SymphError;
use symphonia::core::formats::{FormatOptions, SeekMode, SeekTo};
use symphonia::core::io::{MediaSource, MediaSourceStream};
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use symphonia::core::units::Time;

use crate::audio::AudioInput;
use crate::error::{AppError, AppResult};

// --- MediaSource impl for AudioInput ----------------------------------------

impl MediaSource for AudioInput {
    fn is_seekable(&self) -> bool { true }
    fn byte_len(&self) -> Option<u64> {
        match self {
            AudioInput::File(r) => r.get_ref().metadata().ok().map(|m| m.len()),
            AudioInput::Memory(c) => Some(c.get_ref().len() as u64),
        }
    }
}

// --- SymphDecoder -----------------------------------------------------------

pub struct SymphDecoder {
    format: Box<dyn symphonia::core::formats::FormatReader>,
    sym_dec: Box<dyn symphonia::core::codecs::Decoder>,
    track_id: u32,
    rate: u32,
    chans: u16,
    duration: Option<Duration>,
    buf: Vec<i16>,
    pos: usize,
}

impl SymphDecoder {
    pub fn new(input: AudioInput, extension: Option<&str>) -> AppResult<Self> {
        let mss = MediaSourceStream::new(Box::new(input), Default::default());
        let mut hint = Hint::new();
        if let Some(ext) = extension {
            hint.with_extension(ext);
        }
        let probed = symphonia::default::get_probe()
            .format(
                &hint,
                mss,
                &FormatOptions { enable_gapless: true, ..Default::default() },
                &MetadataOptions::default(),
            )
            .map_err(|e| AppError::Audio(e.to_string()))?;

        let track = probed
            .format
            .tracks()
            .iter()
            .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
            .ok_or_else(|| AppError::Audio("no supported audio track".into()))?;

        let track_id = track.id;
        let rate = track.codec_params.sample_rate.unwrap_or(44100);
        let chans = track
            .codec_params
            .channels
            .map(|c| c.count() as u16)
            .unwrap_or(2);
        let duration = track
            .codec_params
            .time_base
            .zip(track.codec_params.n_frames)
            .map(|(base, n)| {
                let t = base.calc_time(n);
                Duration::from_secs(t.seconds) + Duration::from_secs_f64(t.frac)
            });

        let sym_dec = symphonia::default::get_codecs()
            .make(&track.codec_params, &DecoderOptions::default())
            .map_err(|e| AppError::Audio(e.to_string()))?;

        let mut s = Self {
            format: probed.format,
            sym_dec,
            track_id,
            rate,
            chans,
            duration,
            buf: Vec::new(),
            pos: 0,
        };
        s.refill();
        Ok(s)
    }

    fn refill(&mut self) -> bool {
        loop {
            let packet = match self.format.next_packet() {
                Ok(p) => p,
                Err(_) => return false,
            };
            if packet.track_id() != self.track_id {
                continue;
            }
            let decoded = match self.sym_dec.decode(&packet) {
                Ok(d) => d,
                Err(SymphError::DecodeError(_)) => continue,
                Err(_) => return false,
            };
            self.buf.clear();
            self.pos = 0;
            buf_to_i16(&decoded, &mut self.buf, self.chans as usize);
            return !self.buf.is_empty();
        }
    }
}

impl Iterator for SymphDecoder {
    type Item = i16;
    fn next(&mut self) -> Option<i16> {
        if self.pos >= self.buf.len() {
            if !self.refill() {
                return None;
            }
        }
        let s = self.buf[self.pos];
        self.pos += 1;
        Some(s)
    }
}

impl Source for SymphDecoder {
    fn current_frame_len(&self) -> Option<usize> {
        let rem = self.buf.len().saturating_sub(self.pos);
        if rem == 0 { None } else { Some(rem) }
    }
    fn channels(&self) -> u16 { self.chans }
    fn sample_rate(&self) -> u32 { self.rate }
    fn total_duration(&self) -> Option<Duration> { self.duration }

    fn try_seek(&mut self, pos: Duration) -> Result<(), SeekError> {
        let time = Time::new(pos.as_secs(), pos.subsec_nanos() as f64 / 1_000_000_000.0);
        self.format
            .seek(
                SeekMode::Accurate,
                SeekTo::Time { time, track_id: Some(self.track_id) },
            )
            .map_err(|e| SeekError::Other(Box::new(io::Error::other(e.to_string()))))?;
        self.sym_dec.reset();
        self.buf.clear();
        self.pos = 0;
        Ok(())
    }
}

// --- Sample conversion ------------------------------------------------------

fn buf_to_i16(buf: &AudioBufferRef, out: &mut Vec<i16>, n_chans: usize) {
    macro_rules! push_float {
        ($b:expr) => {{
            let frames = $b.frames();
            let src_chans = $b.spec().channels.count();
            out.reserve(frames * n_chans);
            for i in 0..frames {
                for ch in 0..n_chans {
                    let s = $b.chan(ch.min(src_chans - 1))[i];
                    let v = (s as f64 * i16::MAX as f64)
                        .clamp(i16::MIN as f64, i16::MAX as f64) as i16;
                    out.push(v);
                }
            }
        }};
    }
    macro_rules! push_signed {
        ($b:expr, $scale:expr) => {{
            let frames = $b.frames();
            let src_chans = $b.spec().channels.count();
            out.reserve(frames * n_chans);
            for i in 0..frames {
                for ch in 0..n_chans {
                    let raw = $b.chan(ch.min(src_chans - 1))[i] as f64;
                    let v = (raw / $scale * i16::MAX as f64)
                        .clamp(i16::MIN as f64, i16::MAX as f64) as i16;
                    out.push(v);
                }
            }
        }};
    }
    macro_rules! push_unsigned {
        ($b:expr, $max:expr) => {{
            let frames = $b.frames();
            let src_chans = $b.spec().channels.count();
            out.reserve(frames * n_chans);
            for i in 0..frames {
                for ch in 0..n_chans {
                    let raw = $b.chan(ch.min(src_chans - 1))[i] as f64;
                    let v = ((raw / $max) * 2.0 - 1.0)
                        .clamp(-1.0, 1.0);
                    out.push((v * i16::MAX as f64) as i16);
                }
            }
        }};
    }
    match buf {
        AudioBufferRef::F32(b) => push_float!(b),
        AudioBufferRef::F64(b) => push_float!(b),
        AudioBufferRef::S8(b) => push_signed!(b, i8::MAX as f64),
        AudioBufferRef::S16(b) => {
            let frames = b.frames();
            let src_chans = b.spec().channels.count();
            out.reserve(frames * n_chans);
            for i in 0..frames {
                for ch in 0..n_chans {
                    out.push(b.chan(ch.min(src_chans - 1))[i]);
                }
            }
        }
        AudioBufferRef::S24(b) => {
            let frames = b.frames();
            let src_chans = b.spec().channels.count();
            out.reserve(frames * n_chans);
            for i in 0..frames {
                for ch in 0..n_chans {
                    let raw = b.chan(ch.min(src_chans - 1))[i].into_i32() as f64;
                    let v = (raw / 8_388_607.0 * i16::MAX as f64)
                        .clamp(i16::MIN as f64, i16::MAX as f64) as i16;
                    out.push(v);
                }
            }
        }
        AudioBufferRef::S32(b) => push_signed!(b, i32::MAX as f64),
        AudioBufferRef::U8(b) => {
            let frames = b.frames();
            let src_chans = b.spec().channels.count();
            out.reserve(frames * n_chans);
            for i in 0..frames {
                for ch in 0..n_chans {
                    let s = b.chan(ch.min(src_chans - 1))[i] as i16;
                    out.push((s - 128) * 256);
                }
            }
        }
        AudioBufferRef::U16(b) => push_unsigned!(b, u16::MAX as f64),
        AudioBufferRef::U24(b) => {
            let frames = b.frames();
            let src_chans = b.spec().channels.count();
            out.reserve(frames * n_chans);
            for i in 0..frames {
                for ch in 0..n_chans {
                    let raw = b.chan(ch.min(src_chans - 1))[i].into_u32() as f64;
                    let v = ((raw / 16_777_215.0) * 2.0 - 1.0)
                        .clamp(-1.0, 1.0);
                    out.push((v * i16::MAX as f64) as i16);
                }
            }
        }
        AudioBufferRef::U32(b) => push_unsigned!(b, u32::MAX as f64),
    }
}
