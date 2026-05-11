use std::io::Cursor;
use std::path::Path;

use base64::Engine;
use lofty::config::WriteOptions;
use lofty::file::{AudioFile, TaggedFile, TaggedFileExt};
use lofty::probe::Probe;
use lofty::tag::{Accessor, ItemKey, Tag, TagExt};

use crate::error::{AppError, AppResult};
use crate::model::{MetadataPatch, SourceKind, Track};

const SUPPORTED_EXTENSIONS: &[&str] = &[
    "mp3", "flac", "m4a", "m4b", "aac", "ogg", "oga", "opus", "wav", "wma", "alac", "ape", "aiff",
];

pub fn is_supported(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| SUPPORTED_EXTENSIONS.contains(&e.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

pub struct ReadResult {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: Option<String>,
    pub genre: Option<String>,
    pub year: Option<u32>,
    pub track_number: Option<u32>,
    pub duration_ms: Option<u64>,
    pub has_cover: bool,
    pub format: Option<String>,
    pub lyrics: Option<String>,
}

pub fn read_local(path: &Path) -> AppResult<ReadResult> {
    let tagged = Probe::open(path)
        .map_err(|e| AppError::Other(format!("probe: {e}")))?
        .read()
        .map_err(|e| AppError::Other(format!("read: {e}")))?;

    let format = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_ascii_uppercase());

    Ok(build_read_result(&tagged, fallback_title_from_path(path), format))
}

pub fn read_from_bytes(
    bytes: &[u8],
    fallback_title: &str,
    format: Option<String>,
) -> AppResult<ReadResult> {
    let cursor = Cursor::new(bytes);
    let tagged = Probe::new(cursor)
        .guess_file_type()
        .map_err(|e| AppError::Other(format!("guess: {e}")))?
        .read()
        .map_err(|e| AppError::Other(format!("read: {e}")))?;

    Ok(build_read_result(&tagged, fallback_title.to_string(), format))
}

fn build_read_result(
    tagged: &TaggedFile,
    fallback_title: String,
    format: Option<String>,
) -> ReadResult {
    let properties = tagged.properties();
    let duration_ms = Some(properties.duration().as_millis() as u64);
    let tag = tagged.primary_tag().or_else(|| tagged.first_tag());

    let (title, artist, album, album_artist, genre, year, track_number, has_cover) =
        extract_fields(tag, &fallback_title);
    let lyrics = tag.and_then(extract_lyrics_text);

    ReadResult {
        title,
        artist,
        album,
        album_artist,
        genre,
        year,
        track_number,
        duration_ms,
        has_cover,
        format,
        lyrics,
    }
}

fn extract_lyrics_text(tag: &Tag) -> Option<String> {
    // ItemKey::Lyrics covers ID3 USLT, Vorbis LYRICS / UNSYNCEDLYRICS, MP4 ©lyr, etc.
    let raw = tag.get_string(&ItemKey::Lyrics)?;
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

/// Read lyrics from a local file's tag (used to back-fill cached lyrics on demand).
pub fn read_lyrics_from_path(path: &Path) -> Option<String> {
    let tagged = Probe::open(path).ok()?.read().ok()?;
    let tag = tagged.primary_tag().or_else(|| tagged.first_tag())?;
    extract_lyrics_text(tag)
}

fn extract_fields(
    tag: Option<&Tag>,
    fallback_title: &str,
) -> (
    String,
    String,
    String,
    Option<String>,
    Option<String>,
    Option<u32>,
    Option<u32>,
    bool,
) {
    match tag {
        Some(t) => {
            let title = t
                .title()
                .map(|s| s.to_string())
                .unwrap_or_else(|| fallback_title.to_string());
            let artist = t
                .artist()
                .map(|s| s.to_string())
                .unwrap_or_else(|| "Unknown Artist".to_string());
            let album = t
                .album()
                .map(|s| s.to_string())
                .unwrap_or_else(|| "Unknown Album".to_string());
            let album_artist = t.get_string(&ItemKey::AlbumArtist).map(|s| s.to_string());
            let genre = t.genre().map(|s| s.to_string());
            let year = t.year();
            let track_number = t.track();
            let has_cover = !t.pictures().is_empty();
            (
                title,
                artist,
                album,
                album_artist,
                genre,
                year,
                track_number,
                has_cover,
            )
        }
        None => (
            fallback_title.to_string(),
            "Unknown Artist".to_string(),
            "Unknown Album".to_string(),
            None,
            None,
            None,
            None,
            false,
        ),
    }
}

pub fn write_metadata(path: &Path, patch: &MetadataPatch) -> AppResult<()> {
    let mut tagged = Probe::open(path)
        .map_err(|e| AppError::Other(format!("probe: {e}")))?
        .read()
        .map_err(|e| AppError::Other(format!("read: {e}")))?;

    let tag_type = tagged.primary_tag_type();
    if tagged.primary_tag().is_none() {
        tagged.insert_tag(Tag::new(tag_type));
    }
    let tag = tagged.primary_tag_mut().expect("tag inserted above");

    if let Some(v) = &patch.title {
        tag.set_title(v.clone());
    }
    if let Some(v) = &patch.artist {
        tag.set_artist(v.clone());
    }
    if let Some(v) = &patch.album {
        tag.set_album(v.clone());
    }
    if let Some(v) = &patch.album_artist {
        tag.insert_text(ItemKey::AlbumArtist, v.clone());
    }
    if let Some(v) = &patch.genre {
        tag.set_genre(v.clone());
    }
    if let Some(v) = patch.year {
        tag.set_year(v);
    }
    if let Some(v) = patch.track_number {
        tag.set_track(v);
    }

    tag.save_to_path(path, WriteOptions::default())
        .map_err(|e| AppError::Other(format!("save: {e}")))?;
    Ok(())
}

/// Return the embedded cover art bytes from an in-memory file.
pub fn extract_cover_bytes(bytes: &[u8]) -> Option<Vec<u8>> {
    let cursor = Cursor::new(bytes);
    let tagged = Probe::new(cursor)
        .guess_file_type()
        .ok()?
        .read()
        .ok()?;
    let pic = tagged
        .primary_tag()
        .and_then(|t| t.pictures().first().cloned())
        .or_else(|| tagged.first_tag().and_then(|t| t.pictures().first().cloned()))?;
    Some(pic.data().to_vec())
}

/// Read cover art for any track: for local tracks reads from the file, for remote
/// tracks reads the cached cover bytes from `covers_dir/{track_id}`.
pub fn read_cover_data_url(track: &Track, covers_dir: &Path) -> AppResult<Option<String>> {
    match track.source {
        SourceKind::Local => read_cover_local(track),
        SourceKind::Remote => read_cover_from_cache(track, covers_dir),
    }
}

fn read_cover_local(track: &Track) -> AppResult<Option<String>> {
    let path = Path::new(&track.uri);
    if !path.exists() {
        return Ok(None);
    }
    let tagged = match Probe::open(path)
        .map_err(|e| AppError::Other(format!("probe: {e}")))?
        .read()
    {
        Ok(t) => t,
        Err(_) => return Ok(None),
    };
    let pic = tagged
        .primary_tag()
        .and_then(|t| t.pictures().first().cloned())
        .or_else(|| tagged.first_tag().and_then(|t| t.pictures().first().cloned()));
    if let Some(p) = pic {
        let mime = p.mime_type().map(|m| m.as_str()).unwrap_or("image/jpeg");
        let b64 = base64::engine::general_purpose::STANDARD.encode(p.data());
        Ok(Some(format!("data:{};base64,{}", mime, b64)))
    } else {
        Ok(None)
    }
}

fn read_cover_from_cache(track: &Track, covers_dir: &Path) -> AppResult<Option<String>> {
    let path = covers_dir.join(&track.id);
    if !path.exists() {
        return Ok(None);
    }
    let bytes = std::fs::read(&path)?;
    let mime = sniff_image_mime(&bytes);
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(Some(format!("data:{};base64,{}", mime, b64)))
}

fn sniff_image_mime(b: &[u8]) -> &'static str {
    if b.len() >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF {
        return "image/jpeg";
    }
    if b.len() >= 8
        && b[0] == 0x89
        && b[1] == 0x50
        && b[2] == 0x4E
        && b[3] == 0x47
        && b[4] == 0x0D
        && b[5] == 0x0A
        && b[6] == 0x1A
        && b[7] == 0x0A
    {
        return "image/png";
    }
    if b.len() >= 12 && &b[0..4] == b"RIFF" && &b[8..12] == b"WEBP" {
        return "image/webp";
    }
    if b.len() >= 4 && b[0] == 0x47 && b[1] == 0x49 && b[2] == 0x46 && b[3] == 0x38 {
        return "image/gif";
    }
    "image/jpeg"
}

fn fallback_title_from_path(path: &Path) -> String {
    path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled")
        .to_string()
}
