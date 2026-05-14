use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SourceKind {
    Local,
    Remote,
}

impl SourceKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            SourceKind::Local => "local",
            SourceKind::Remote => "remote",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "remote" => SourceKind::Remote,
            _ => SourceKind::Local,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RemoteKind {
    Webdav,
    Http,
}

impl RemoteKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            RemoteKind::Webdav => "webdav",
            RemoteKind::Http => "http",
        }
    }
    pub fn from_str(s: &str) -> Self {
        match s {
            "webdav" => RemoteKind::Webdav,
            _ => RemoteKind::Http,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub id: String,
    pub source: SourceKind,
    /// For local: absolute path. For remote: full URL or smb://… URI.
    pub uri: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: Option<String>,
    pub genre: Option<String>,
    pub year: Option<u32>,
    pub track_number: Option<u32>,
    pub duration_ms: Option<u64>,
    pub file_size: Option<u64>,
    pub format: Option<String>,
    pub has_cover: bool,
    pub added_at: i64,
    pub last_modified: Option<i64>,
    pub missing: bool,
    /// For remote tracks: links to a remote_source row.
    pub source_id: Option<i64>,
    pub bit_depth: Option<u32>,
    pub sample_rate: Option<u32>,
    pub bit_rate: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Folder {
    pub id: i64,
    pub path: String,
    pub added_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteSource {
    pub id: i64,
    pub kind: RemoteKind,
    pub name: String,
    pub url: String,
    pub username: Option<String>,
    /// Returned to the UI as `Some("")` placeholder; raw value stays in DB.
    pub password: Option<String>,
    pub added_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: i64,
    pub track_id: String,
    pub played_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerState {
    pub current_track_id: Option<String>,
    pub is_playing: bool,
    pub position_ms: u64,
    pub duration_ms: u64,
    pub volume: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MetadataPatch {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub album_artist: Option<String>,
    pub genre: Option<String>,
    pub year: Option<u32>,
    pub track_number: Option<u32>,
}
