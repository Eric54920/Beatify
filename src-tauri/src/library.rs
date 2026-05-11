use std::path::{Path, PathBuf};

use uuid::Uuid;
use walkdir::WalkDir;

use crate::db::Db;
use crate::error::AppResult;
use crate::metadata::{is_supported, read_local};
use crate::model::{SourceKind, Track};

pub struct ScanReport {
    pub added: usize,
    pub updated: usize,
    pub removed: usize,
}

pub fn scan_folder(db: &Db, folder: &Path) -> AppResult<ScanReport> {
    let mut added = 0usize;
    let mut updated = 0usize;
    let mut seen: Vec<String> = Vec::new();

    for entry in WalkDir::new(folder).follow_links(true).into_iter().flatten() {
        let path = entry.path();
        if !entry.file_type().is_file() || !is_supported(path) {
            continue;
        }
        let uri = match path.to_str() {
            Some(s) => s.to_string(),
            None => continue,
        };
        seen.push(uri.clone());

        let metadata = entry.metadata().ok();
        let last_modified = metadata
            .as_ref()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64);
        let file_size = metadata.as_ref().map(|m| m.len());

        let existing = db.get_track_by_uri(&uri)?;
        // Skip re-reading metadata if file hasn't changed.
        if let Some(t) = &existing {
            if t.last_modified == last_modified && !t.missing {
                continue;
            }
        }

        let info = match read_local(path) {
            Ok(v) => v,
            Err(e) => {
                log::warn!("metadata read failed for {}: {}", uri, e);
                continue;
            }
        };

        let id = existing
            .as_ref()
            .map(|t| t.id.clone())
            .unwrap_or_else(|| Uuid::new_v4().to_string());

        let track = Track {
            id,
            source: SourceKind::Local,
            uri: uri.clone(),
            title: info.title,
            artist: info.artist,
            album: info.album,
            album_artist: info.album_artist,
            genre: info.genre,
            year: info.year,
            track_number: info.track_number,
            duration_ms: info.duration_ms,
            file_size,
            format: info.format,
            has_cover: info.has_cover,
            added_at: existing
                .as_ref()
                .map(|t| t.added_at)
                .unwrap_or_else(|| chrono::Utc::now().timestamp_millis()),
            last_modified,
            missing: false,
            source_id: None,
        };

        db.upsert_track(&track)?;
        // Cache lyrics extracted from the tag (None clears stale lyrics if removed from file).
        db.set_track_lyrics(&track.id, info.lyrics.as_deref())?;
        if existing.is_some() {
            updated += 1;
        } else {
            added += 1;
        }
    }

    // Delete tracks that no longer exist on disk under this folder.
    let folder_path_str = folder.to_string_lossy().to_string();
    let mut removed = 0usize;
    for t in db.list_tracks_for_folder(&folder_path_str)? {
        if !seen.contains(&t.uri) {
            db.delete_track(&t.id)?;
            removed += 1;
        }
    }

    Ok(ScanReport {
        added,
        updated,
        removed,
    })
}

pub fn rescan_all(db: &Db) -> AppResult<ScanReport> {
    let mut total = ScanReport {
        added: 0,
        updated: 0,
        removed: 0,
    };
    for folder in db.list_folders()? {
        let path = PathBuf::from(&folder.path);
        if !path.exists() {
            continue;
        }
        let r = scan_folder(db, &path)?;
        total.added += r.added;
        total.updated += r.updated;
        total.removed += r.removed;
    }
    Ok(total)
}
