use std::path::{Path, PathBuf};

use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

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
pub fn rescan_library(app: AppHandle, state: State<'_, AppState>) -> AppResult<usize> {
    let report = library::rescan_all(&state.db)?;
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
    state.audio.seek(&state.db, position_ms)
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
