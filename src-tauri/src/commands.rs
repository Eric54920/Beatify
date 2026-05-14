use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::Arc;

#[cfg(target_os = "macos")]
extern "C" {
    fn fcntl(fd: i32, cmd: i32, ...) -> i32;
}

#[cfg(target_os = "macos")]
unsafe fn libc_fcntl(fd: i32, cmd: i32, arg: i32) -> i32 {
    fcntl(fd, cmd, arg)
}

use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

#[derive(serde::Serialize, Clone)]
pub struct SpeedSample {
    pub speed_kbps: f64,
    pub idx: usize,
}

#[derive(serde::Serialize)]
pub struct SpeedTestDone {
    pub peak_kbps: f64,
    pub avg_kbps: f64,
}

#[derive(serde::Serialize)]
pub struct UpdateInfo {
    pub current_version: String,
    pub latest_version: String,
    pub has_update: bool,
    pub release_url: String,
}

use crate::error::{AppError, AppResult};
use crate::library;
use crate::lyrics;
use crate::metadata;
use crate::model::{
    Folder, HistoryEntry, MetadataPatch, PlayerState, RemoteKind, RemoteSource, SourceKind, Track,
};
use crate::state::AppState;
use crate::webdav;

#[tauri::command]
pub fn list_tracks(state: State<'_, AppState>) -> AppResult<Vec<Track>> {
    state.db.list_tracks()
}

#[tauri::command]
pub fn list_folders(state: State<'_, AppState>) -> AppResult<Vec<Folder>> {
    state.db.list_folders()
}

#[tauri::command]
pub fn add_local_folder(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> AppResult<Vec<Track>> {
    let p = Path::new(&path);
    if !p.exists() || !p.is_dir() {
        return Err(AppError::NotFound(format!("not a directory: {}", path)));
    }
    state.db.add_folder(&path)?;
    library::scan_folder(&state.db, p)?;
    state.watcher.watch(&path);
    let _ = app.emit("library:changed", ());
    state.db.list_tracks()
}

#[tauri::command]
pub fn remove_folder(
    app: AppHandle,
    state: State<'_, AppState>,
    id: i64,
) -> AppResult<()> {
    if let Some(folder) = state
        .db
        .list_folders()?
        .into_iter()
        .find(|f| f.id == id)
    {
        state.watcher.unwatch(&folder.path);
        for t in state.db.list_tracks_for_folder(&folder.path)? {
            state.db.delete_track(&t.id)?;
        }
    }
    state.db.remove_folder(id)?;
    let _ = app.emit("library:changed", ());
    Ok(())
}

#[tauri::command]
pub async fn rescan_library(app: AppHandle, state: State<'_, AppState>) -> AppResult<usize> {
    let db = state.db.clone();
    let report = tokio::task::spawn_blocking(move || library::rescan_all(&db))
        .await
        .map_err(|e| AppError::Other(e.to_string()))??;
    let _ = app.emit("library:changed", ());
    Ok(report.added + report.updated + report.removed)
}

#[tauri::command]
pub fn add_remote_track(
    app: AppHandle,
    state: State<'_, AppState>,
    url: String,
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
) -> AppResult<Track> {
    let parsed = url::Url::parse(&url).map_err(|e| AppError::Other(e.to_string()))?;
    if let Some(existing) = state.db.get_track_by_uri(&url)? {
        return Ok(existing);
    }
    let derived_title = title.unwrap_or_else(|| {
        parsed
            .path_segments()
            .and_then(|mut s| s.next_back())
            .map(|s| s.to_string())
            .unwrap_or_else(|| url.clone())
    });
    let track = Track {
        id: Uuid::new_v4().to_string(),
        source: SourceKind::Remote,
        uri: url.clone(),
        title: derived_title,
        artist: artist.unwrap_or_else(|| "Unknown Artist".to_string()),
        album: album.unwrap_or_else(|| "Remote".to_string()),
        album_artist: None,
        genre: None,
        year: None,
        track_number: None,
        duration_ms: None,
        file_size: None,
        format: parsed
            .path_segments()
            .and_then(|s| s.last())
            .and_then(|s| Path::new(s).extension().and_then(|e| e.to_str()))
            .map(|s| s.to_ascii_uppercase()),
        has_cover: false,
        added_at: chrono::Utc::now().timestamp_millis(),
        last_modified: None,
        missing: false,
        source_id: None,
        bit_depth: None,
        sample_rate: None,
        bit_rate: None,
    };
    state.db.upsert_track(&track)?;
    let _ = app.emit("library:changed", ());
    Ok(track)
}

// ---------- Remote sources (WebDAV) ----------

#[tauri::command]
pub fn list_remote_sources(state: State<'_, AppState>) -> AppResult<Vec<RemoteSource>> {
    let sources = state.db.list_remote_sources()?;
    // Strip passwords before returning to the UI.
    Ok(sources
        .into_iter()
        .map(|mut s| {
            if s.password.is_some() {
                s.password = Some(String::new());
            }
            s
        })
        .collect())
}

#[tauri::command]
pub fn add_webdav_source(
    app: AppHandle,
    state: State<'_, AppState>,
    name: String,
    url: String,
    username: Option<String>,
    password: Option<String>,
) -> AppResult<RemoteSource> {
    let id = state.db.add_remote_source(
        RemoteKind::Webdav,
        &name,
        &url,
        username.as_deref(),
        password.as_deref(),
    )?;
    let source = state
        .db
        .get_remote_source(id)?
        .ok_or_else(|| AppError::Other("source not found".into()))?;

    // Attempt initial sync (best effort).
    let _ = webdav::sync_source(&state.db, &source, &state.covers_dir);
    let _ = app.emit("library:changed", ());
    Ok(RemoteSource {
        password: source.password.as_ref().map(|_| String::new()),
        ..source
    })
}

#[tauri::command]
pub fn update_webdav_source(
    app: AppHandle,
    state: State<'_, AppState>,
    id: i64,
    name: String,
    url: String,
    username: Option<String>,
    password: Option<String>,
) -> AppResult<RemoteSource> {
    // Only update password when the caller sends a non-empty value.
    // An empty string means "unchanged" because the UI never receives the real password.
    let new_password = if password.as_deref().unwrap_or("").is_empty() {
        state
            .db
            .get_remote_source(id)?
            .and_then(|s| s.password)
    } else {
        password
    };

    state.db.update_remote_source(
        id,
        &name,
        &url,
        username.as_deref(),
        new_password.as_deref(),
    )?;

    let source = state
        .db
        .get_remote_source(id)?
        .ok_or_else(|| AppError::NotFound(id.to_string()))?;

    let _ = app.emit("library:changed", ());
    Ok(RemoteSource {
        password: source.password.as_ref().map(|_| String::new()),
        ..source
    })
}

#[tauri::command]
pub fn remove_remote_source(
    app: AppHandle,
    state: State<'_, AppState>,
    id: i64,
) -> AppResult<()> {
    // Explicitly remove tracks + their cached cover art (FK cascade is unreliable for
    // databases migrated from older schemas where source_id was added without a REFERENCES clause).
    for t in state.db.list_tracks_for_remote_source(id)? {
        let cover = state.covers_dir.join(&t.id);
        let _ = std::fs::remove_file(&cover);
        state.db.delete_track(&t.id)?;
    }
    state.db.remove_remote_source(id)?;
    let _ = app.emit("library:changed", ());
    Ok(())
}

#[tauri::command]
pub fn sync_remote_source(
    app: AppHandle,
    state: State<'_, AppState>,
    id: i64,
) -> AppResult<usize> {
    let source = state
        .db
        .get_remote_source(id)?
        .ok_or_else(|| AppError::NotFound(id.to_string()))?;
    let n = webdav::sync_source(&state.db, &source, &state.covers_dir)?;
    let _ = app.emit("library:changed", ());
    Ok(n)
}

#[tauri::command]
pub fn sync_all_remote_sources(
    app: AppHandle,
    state: State<'_, AppState>,
) -> AppResult<usize> {
    let mut total = 0usize;
    for s in state.db.list_remote_sources()? {
        match webdav::sync_source(&state.db, &s, &state.covers_dir) {
            Ok(n) => total += n,
            Err(e) => log::warn!("sync remote {} failed: {}", s.name, e),
        }
    }
    let _ = app.emit("library:changed", ());
    Ok(total)
}

// ---------- Playback ----------

#[tauri::command]
pub fn play_track(
    state: State<'_, AppState>,
    track_id: String,
) -> AppResult<()> {
    let track = state
        .db
        .get_track(&track_id)?
        .ok_or_else(|| AppError::NotFound(track_id.clone()))?;
    state.audio.play(&state.db, track.clone())?;
    state.db.add_history(&track.id)?;
    Ok(())
}

#[tauri::command]
pub fn play_pause(state: State<'_, AppState>) -> AppResult<()> {
    state.audio.toggle()
}

#[tauri::command]
pub fn resume(state: State<'_, AppState>) -> AppResult<()> {
    state.audio.resume()
}

#[tauri::command]
pub fn pause(state: State<'_, AppState>) -> AppResult<()> {
    state.audio.pause()
}

#[tauri::command]
pub fn stop_playback(state: State<'_, AppState>) -> AppResult<()> {
    state.audio.stop()
}

#[tauri::command]
pub fn next_track(state: State<'_, AppState>) -> AppResult<Option<Track>> {
    let queue = state.db.list_queue()?;
    let snap = state.audio.snapshot();
    let current_id = snap.current_track.as_ref().map(|t| t.id.clone());

    let next_id = match current_id {
        Some(id) => {
            let pos = queue.iter().position(|qid| qid == &id);
            match pos {
                Some(i) if i + 1 < queue.len() => Some(queue[i + 1].clone()),
                _ => None,
            }
        }
        None => queue.first().cloned(),
    };

    if let Some(id) = next_id {
        if let Some(track) = state.db.get_track(&id)? {
            state.audio.play(&state.db, track.clone())?;
            state.db.add_history(&track.id)?;
            return Ok(Some(track));
        }
    }
    state.audio.stop()?;
    Ok(None)
}

#[tauri::command]
pub fn previous_track(state: State<'_, AppState>) -> AppResult<Option<Track>> {
    let queue = state.db.list_queue()?;
    let snap = state.audio.snapshot();
    let current_id = snap.current_track.as_ref().map(|t| t.id.clone());

    let prev_id = match current_id {
        Some(id) => {
            let pos = queue.iter().position(|qid| qid == &id);
            match pos {
                Some(i) if i > 0 => Some(queue[i - 1].clone()),
                _ => None,
            }
        }
        None => None,
    };

    if let Some(id) = prev_id {
        if let Some(track) = state.db.get_track(&id)? {
            state.audio.play(&state.db, track.clone())?;
            state.db.add_history(&track.id)?;
            return Ok(Some(track));
        }
    }
    if let Some(t) = snap.current_track {
        state.audio.play(&state.db, t.clone())?;
        return Ok(Some(t));
    }
    Ok(None)
}

#[tauri::command]
pub fn seek(state: State<'_, AppState>, position_ms: u64) -> AppResult<()> {
    state.audio.seek(state.db.clone(), position_ms)
}

#[tauri::command]
pub fn set_volume(state: State<'_, AppState>, volume: f32) -> AppResult<()> {
    state.audio.set_volume(volume);
    Ok(())
}

#[tauri::command]
pub fn get_player_state(state: State<'_, AppState>) -> AppResult<PlayerState> {
    let snap = state.audio.snapshot();
    Ok(PlayerState {
        current_track_id: snap.current_track.as_ref().map(|t| t.id.clone()),
        is_playing: snap.is_playing,
        position_ms: snap.position_ms,
        duration_ms: snap.duration_ms,
        volume: snap.volume,
    })
}

#[tauri::command]
pub fn get_queue(state: State<'_, AppState>) -> AppResult<Vec<Track>> {
    let ids = state.db.list_queue()?;
    let mut out = Vec::with_capacity(ids.len());
    for id in ids {
        if let Some(t) = state.db.get_track(&id)? {
            out.push(t);
        }
    }
    Ok(out)
}

#[tauri::command]
pub fn set_queue(
    app: AppHandle,
    state: State<'_, AppState>,
    track_ids: Vec<String>,
) -> AppResult<()> {
    state.db.set_queue(&track_ids)?;
    let _ = app.emit("queue:changed", ());
    Ok(())
}

#[tauri::command]
pub fn add_to_queue(
    app: AppHandle,
    state: State<'_, AppState>,
    track_id: String,
) -> AppResult<()> {
    let mut ids = state.db.list_queue()?;
    if !ids.contains(&track_id) {
        ids.push(track_id);
        state.db.set_queue(&ids)?;
    }
    let _ = app.emit("queue:changed", ());
    Ok(())
}

#[tauri::command]
pub fn clear_queue(app: AppHandle, state: State<'_, AppState>) -> AppResult<()> {
    state.db.set_queue(&[])?;
    let _ = app.emit("queue:changed", ());
    Ok(())
}

#[tauri::command]
pub fn get_history(state: State<'_, AppState>) -> AppResult<Vec<HistoryWithTrack>> {
    let entries = state.db.list_history(200)?;
    let mut out = Vec::with_capacity(entries.len());
    for e in entries {
        if let Some(t) = state.db.get_track(&e.track_id)? {
            out.push(HistoryWithTrack { entry: e, track: t });
        }
    }
    Ok(out)
}

#[tauri::command]
pub fn clear_history(state: State<'_, AppState>) -> AppResult<()> {
    state.db.clear_history()
}

#[derive(serde::Serialize)]
pub struct HistoryWithTrack {
    pub entry: HistoryEntry,
    pub track: Track,
}

#[tauri::command]
pub fn update_track_metadata(
    app: AppHandle,
    state: State<'_, AppState>,
    track_id: String,
    patch: MetadataPatch,
) -> AppResult<Track> {
    let track = state
        .db
        .get_track(&track_id)?
        .ok_or_else(|| AppError::NotFound(track_id.clone()))?;

    if track.source == SourceKind::Local {
        let path = PathBuf::from(&track.uri);
        if path.exists() {
            metadata::write_metadata(&path, &patch)?;
        }
    }

    let title = patch.title.clone().unwrap_or(track.title.clone());
    let artist = patch.artist.clone().unwrap_or(track.artist.clone());
    let album = patch.album.clone().unwrap_or(track.album.clone());
    let album_artist = patch
        .album_artist
        .clone()
        .or_else(|| track.album_artist.clone());
    let genre = patch.genre.clone().or_else(|| track.genre.clone());
    let year = patch.year.or(track.year);
    let track_number = patch.track_number.or(track.track_number);

    state.db.update_metadata(
        &track.id,
        &title,
        &artist,
        &album,
        album_artist.as_deref(),
        genre.as_deref(),
        year,
        track_number,
    )?;

    let updated = state
        .db
        .get_track(&track.id)?
        .ok_or_else(|| AppError::NotFound(track.id.clone()))?;
    let _ = app.emit("library:changed", ());
    Ok(updated)
}

#[tauri::command]
pub fn get_lyrics(
    state: State<'_, AppState>,
    track_id: String,
) -> AppResult<Option<lyrics::Lyrics>> {
    // 1. Fast path: cached lyrics.
    if let Some(text) = state.db.get_track_lyrics(&track_id)? {
        return Ok(Some(lyrics::parse(&text)));
    }

    // 2. Back-fill from a local file's tag on demand (covers tracks added before this feature).
    let track = match state.db.get_track(&track_id)? {
        Some(t) => t,
        None => return Ok(None),
    };
    if track.source == SourceKind::Local {
        let path = Path::new(&track.uri);
        if path.exists() {
            if let Some(text) = metadata::read_lyrics_from_path(path) {
                state.db.set_track_lyrics(&track_id, Some(&text))?;
                return Ok(Some(lyrics::parse(&text)));
            }
        }
    }

    Ok(None)
}

#[tauri::command]
pub fn get_cover_art(state: State<'_, AppState>, track_id: String) -> AppResult<Option<String>> {
    let track = match state.db.get_track(&track_id)? {
        Some(t) => t,
        None => return Ok(None),
    };
    metadata::read_cover_data_url(&track, &state.covers_dir)
}

// ---------- Speed test ----------

#[tauri::command]
pub async fn speed_test_source(
    app: AppHandle,
    state: State<'_, AppState>,
    folder_path: Option<String>,
    source_id: Option<i64>,
) -> AppResult<SpeedTestDone> {
    const TEST_MS: u128 = 8_000;
    const SAMPLE_MS: u128 = 500;
    const CHUNK: usize = 512 * 1024; // 512 KB per read

    let mut samples: Vec<f64> = Vec::new();

    if let Some(path) = folder_path {
        let db = Arc::clone(&state.db);
        let app2 = app.clone();

        let result = tokio::task::spawn_blocking(move || {
            let tracks = db.list_tracks_for_folder(&path)?;
            // Collect all accessible file URIs, sorted by size desc so large files
            // contribute more data early in the test.
            let uris: Vec<String> = {
                let mut v: Vec<_> = tracks
                    .iter()
                    .filter(|t| !t.missing && std::path::Path::new(&t.uri).exists())
                    .collect();
                v.sort_by_key(|t| std::cmp::Reverse(t.file_size.unwrap_or(0)));
                v.iter().map(|t| t.uri.clone()).collect()
            };
            if uris.is_empty() {
                return Err(crate::error::AppError::Other("No accessible tracks in folder".into()));
            }

            let mut buf = vec![0u8; CHUNK];
            let start = std::time::Instant::now();
            let mut last_sample = start;
            let mut bytes_in_interval = 0usize;
            let mut idx = 0usize;
            let mut samples: Vec<f64> = Vec::new();

            'outer: for uri in uris.iter().cycle() {
                let mut file = match std::fs::File::open(uri) {
                    Ok(f) => f,
                    Err(_) => continue,
                };

                // Bypass macOS page cache so we measure actual disk throughput.
                #[cfg(target_os = "macos")]
                {
                    use std::os::unix::io::AsRawFd;
                    const F_NOCACHE: i32 = 48;
                    unsafe { libc_fcntl(file.as_raw_fd(), F_NOCACHE, 1i32); }
                }

                loop {
                    if start.elapsed().as_millis() >= TEST_MS {
                        break 'outer;
                    }
                    let n = match file.read(&mut buf) {
                        Ok(0) => break, // EOF — move to next file
                        Ok(n) => n,
                        Err(_) => break,
                    };
                    bytes_in_interval += n;

                    let elapsed = last_sample.elapsed();
                    if elapsed.as_millis() >= SAMPLE_MS {
                        let kbps = (bytes_in_interval as f64 / 1024.0) / elapsed.as_secs_f64();
                        let _ = app2.emit("speed:sample", SpeedSample { speed_kbps: kbps, idx });
                        samples.push(kbps);
                        bytes_in_interval = 0;
                        last_sample = std::time::Instant::now();
                        idx += 1;
                    }
                }
            }
            Ok::<_, crate::error::AppError>(samples)
        })
        .await
        .map_err(|e| crate::error::AppError::Other(e.to_string()))??;

        samples = result;
    } else if let Some(id) = source_id {
        let source = state
            .db
            .get_remote_source(id)?
            .ok_or_else(|| crate::error::AppError::NotFound(id.to_string()))?;

        let tracks = state.db.list_tracks_for_remote_source(id)?;
        let uri = tracks
            .iter()
            .max_by_key(|t| t.file_size.unwrap_or(0))
            .map(|t| t.uri.clone())
            .ok_or_else(|| crate::error::AppError::Other("No tracks in source".into()))?;

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .danger_accept_invalid_certs(true)
            .build()?;

        let start = std::time::Instant::now();
        let mut last_sample = start;
        let mut bytes_in_interval = 0usize;
        let mut idx = 0usize;
        let mut offset: u64 = 0;

        while start.elapsed().as_millis() < TEST_MS {
            let range_end = offset + CHUNK as u64 - 1;
            let mut req = client
                .get(&uri)
                .header("Range", format!("bytes={}-{}", offset, range_end));
            if let Some(user) = &source.username {
                req = req.basic_auth(user, source.password.as_ref());
            }

            match req.send().await {
                Ok(resp) => match resp.bytes().await {
                    Ok(bytes) => {
                        let n = bytes.len();
                        if n == 0 {
                            break;
                        }
                        bytes_in_interval += n;
                        offset += n as u64;
                    }
                    Err(_) => break,
                },
                Err(_) => break,
            }

            let elapsed = last_sample.elapsed();
            if elapsed.as_millis() >= SAMPLE_MS {
                let kbps = (bytes_in_interval as f64 / 1024.0) / elapsed.as_secs_f64();
                let _ = app.emit("speed:sample", SpeedSample { speed_kbps: kbps, idx });
                samples.push(kbps);
                bytes_in_interval = 0;
                last_sample = std::time::Instant::now();
                idx += 1;
            }
        }
    }

    let peak = samples.iter().cloned().fold(0f64, f64::max);
    let avg = if samples.is_empty() {
        0.0
    } else {
        samples.iter().sum::<f64>() / samples.len() as f64
    };
    Ok(SpeedTestDone { peak_kbps: peak, avg_kbps: avg })
}

// ---------- Update check ----------

#[tauri::command]
pub fn check_update() -> AppResult<UpdateInfo> {
    let client = reqwest::blocking::Client::builder()
        .user_agent(concat!("Beatify/", env!("CARGO_PKG_VERSION")))
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(AppError::Http)?;

    let text = client
        .get("https://api.github.com/repos/Eric54920/Beatify/releases/latest")
        .send()?
        .error_for_status()?
        .text()?;

    let body: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| AppError::Other(e.to_string()))?;

    let tag = body["tag_name"].as_str().unwrap_or("").trim_start_matches('v');
    let release_url = body["html_url"]
        .as_str()
        .unwrap_or("https://github.com/Eric54920/Beatify/releases")
        .to_string();

    let current = env!("CARGO_PKG_VERSION").to_string();
    let has_update = !tag.is_empty() && version_gt(tag, &current);

    Ok(UpdateInfo {
        current_version: current,
        latest_version: tag.to_string(),
        has_update,
        release_url,
    })
}

fn version_gt(a: &str, b: &str) -> bool {
    let parse = |s: &str| -> Vec<u64> {
        s.split('.').filter_map(|p| p.parse().ok()).collect()
    };
    parse(a) > parse(b)
}

// ---------- Install update ----------

#[derive(Clone, serde::Serialize)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: Option<u64>,
}

#[tauri::command]
pub async fn install_update(app: AppHandle) -> AppResult<()> {
    use tauri_plugin_updater::UpdaterExt;

    let updater = app
        .updater_builder()
        .build()
        .map_err(|e| AppError::Other(e.to_string()))?;

    let update = updater
        .check()
        .await
        .map_err(|e| AppError::Other(e.to_string()))?
        .ok_or_else(|| AppError::Other("no update available".into()))?;

    let app_clone = app.clone();
    let mut downloaded: u64 = 0;

    update
        .download_and_install(
            move |chunk, total| {
                downloaded += chunk as u64;
                let _ = app_clone.emit(
                    "update:progress",
                    DownloadProgress {
                        downloaded,
                        total: total.map(|t| t as u64),
                    },
                );
            },
            || {},
        )
        .await
        .map_err(|e| AppError::Other(e.to_string()))?;

    app.restart();
}
