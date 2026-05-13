use std::path::Path;

use parking_lot::Mutex;
use rusqlite::{params, Connection, OptionalExtension};

use crate::error::AppResult;
use crate::model::{Folder, HistoryEntry, RemoteKind, RemoteSource, SourceKind, Track};

pub struct Db {
    conn: Mutex<Connection>,
}

impl Db {
    pub fn open(path: &Path) -> AppResult<Self> {
        let conn = Connection::open(path)?;
        conn.execute_batch(
            r#"
            PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS folders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL UNIQUE,
                added_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS remote_sources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kind TEXT NOT NULL,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                username TEXT,
                password TEXT,
                added_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tracks (
                id TEXT PRIMARY KEY,
                source TEXT NOT NULL,
                uri TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                album TEXT NOT NULL,
                album_artist TEXT,
                genre TEXT,
                year INTEGER,
                track_number INTEGER,
                duration_ms INTEGER,
                file_size INTEGER,
                format TEXT,
                has_cover INTEGER NOT NULL DEFAULT 0,
                added_at INTEGER NOT NULL,
                last_modified INTEGER,
                missing INTEGER NOT NULL DEFAULT 0,
                source_id INTEGER REFERENCES remote_sources(id) ON DELETE CASCADE,
                lyrics TEXT
            );

            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                track_id TEXT NOT NULL,
                played_at INTEGER NOT NULL,
                FOREIGN KEY(track_id) REFERENCES tracks(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS queue (
                position INTEGER PRIMARY KEY,
                track_id TEXT NOT NULL,
                FOREIGN KEY(track_id) REFERENCES tracks(id) ON DELETE CASCADE
            );
            "#,
        )?;

        // Best-effort migration for older DBs missing source_id.
        let _ = conn.execute("ALTER TABLE tracks ADD COLUMN source_id INTEGER", []);
        let _ = conn.execute("ALTER TABLE tracks ADD COLUMN lyrics TEXT", []);

        // Indexes (run after possible ALTER TABLE so source_id exists).
        conn.execute_batch(
            r#"
            CREATE INDEX IF NOT EXISTS idx_tracks_added ON tracks(added_at DESC);
            CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
            CREATE INDEX IF NOT EXISTS idx_tracks_source_id ON tracks(source_id);
            CREATE INDEX IF NOT EXISTS idx_history_played ON history(played_at DESC);
            "#,
        )?;

        Ok(Self { conn: Mutex::new(conn) })
    }

    // ---------- Folders ----------

    pub fn add_folder(&self, path: &str) -> AppResult<i64> {
        let conn = self.conn.lock();
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "INSERT OR IGNORE INTO folders(path, added_at) VALUES(?1, ?2)",
            params![path, now],
        )?;
        let id: i64 = conn.query_row(
            "SELECT id FROM folders WHERE path = ?1",
            params![path],
            |r| r.get(0),
        )?;
        Ok(id)
    }

    pub fn list_folders(&self) -> AppResult<Vec<Folder>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare("SELECT id, path, added_at FROM folders ORDER BY added_at DESC")?;
        let rows = stmt.query_map([], |r| {
            Ok(Folder {
                id: r.get(0)?,
                path: r.get(1)?,
                added_at: r.get(2)?,
            })
        })?;
        Ok(rows.filter_map(Result::ok).collect())
    }

    pub fn remove_folder(&self, id: i64) -> AppResult<()> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM folders WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ---------- Remote Sources ----------

    pub fn add_remote_source(
        &self,
        kind: RemoteKind,
        name: &str,
        url: &str,
        username: Option<&str>,
        password: Option<&str>,
    ) -> AppResult<i64> {
        let conn = self.conn.lock();
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "INSERT INTO remote_sources(kind, name, url, username, password, added_at)
             VALUES(?1, ?2, ?3, ?4, ?5, ?6)",
            params![kind.as_str(), name, url, username, password, now],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn list_remote_sources(&self) -> AppResult<Vec<RemoteSource>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            "SELECT id, kind, name, url, username, password, added_at FROM remote_sources ORDER BY added_at DESC",
        )?;
        let rows = stmt.query_map([], |r| {
            let kind_str: String = r.get(1)?;
            Ok(RemoteSource {
                id: r.get(0)?,
                kind: RemoteKind::from_str(&kind_str),
                name: r.get(2)?,
                url: r.get(3)?,
                username: r.get(4)?,
                password: r.get(5)?,
                added_at: r.get(6)?,
            })
        })?;
        Ok(rows.filter_map(Result::ok).collect())
    }

    pub fn get_remote_source(&self, id: i64) -> AppResult<Option<RemoteSource>> {
        let conn = self.conn.lock();
        conn.query_row(
            "SELECT id, kind, name, url, username, password, added_at FROM remote_sources WHERE id = ?1",
            params![id],
            |r| {
                let kind_str: String = r.get(1)?;
                Ok(RemoteSource {
                    id: r.get(0)?,
                    kind: RemoteKind::from_str(&kind_str),
                    name: r.get(2)?,
                    url: r.get(3)?,
                    username: r.get(4)?,
                    password: r.get(5)?,
                    added_at: r.get(6)?,
                })
            },
        )
        .optional()
        .map_err(Into::into)
    }

    pub fn update_remote_source(
        &self,
        id: i64,
        name: &str,
        url: &str,
        username: Option<&str>,
        password: Option<&str>,
    ) -> AppResult<()> {
        let conn = self.conn.lock();
        conn.execute(
            "UPDATE remote_sources SET name=?1, url=?2, username=?3, password=?4 WHERE id=?5",
            params![name, url, username, password, id],
        )?;
        Ok(())
    }

    pub fn remove_remote_source(&self, id: i64) -> AppResult<()> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM remote_sources WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn list_tracks_for_remote_source(&self, source_id: i64) -> AppResult<Vec<Track>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            r#"SELECT id, source, uri, title, artist, album, album_artist, genre, year,
                track_number, duration_ms, file_size, format, has_cover, added_at, last_modified, missing, source_id
                FROM tracks WHERE source_id = ?1"#,
        )?;
        let rows = stmt.query_map(params![source_id], track_from_row)?;
        Ok(rows.filter_map(Result::ok).collect())
    }

    // ---------- Tracks ----------

    pub fn upsert_track(&self, t: &Track) -> AppResult<()> {
        let conn = self.conn.lock();
        conn.execute(
            r#"INSERT INTO tracks(
                id, source, uri, title, artist, album, album_artist, genre, year,
                track_number, duration_ms, file_size, format, has_cover, added_at, last_modified, missing, source_id
            ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18)
            ON CONFLICT(uri) DO UPDATE SET
                title=excluded.title,
                artist=excluded.artist,
                album=excluded.album,
                album_artist=excluded.album_artist,
                genre=excluded.genre,
                year=excluded.year,
                track_number=excluded.track_number,
                duration_ms=excluded.duration_ms,
                file_size=excluded.file_size,
                format=excluded.format,
                has_cover=excluded.has_cover,
                last_modified=excluded.last_modified,
                missing=excluded.missing,
                source_id=excluded.source_id"#,
            params![
                t.id,
                t.source.as_str(),
                t.uri,
                t.title,
                t.artist,
                t.album,
                t.album_artist,
                t.genre,
                t.year,
                t.track_number,
                t.duration_ms.map(|v| v as i64),
                t.file_size.map(|v| v as i64),
                t.format,
                t.has_cover as i32,
                t.added_at,
                t.last_modified,
                t.missing as i32,
                t.source_id,
            ],
        )?;
        Ok(())
    }

    pub fn update_metadata(
        &self,
        id: &str,
        title: &str,
        artist: &str,
        album: &str,
        album_artist: Option<&str>,
        genre: Option<&str>,
        year: Option<u32>,
        track_number: Option<u32>,
    ) -> AppResult<()> {
        let conn = self.conn.lock();
        conn.execute(
            r#"UPDATE tracks SET
                title=?2, artist=?3, album=?4, album_artist=?5, genre=?6, year=?7, track_number=?8
                WHERE id=?1"#,
            params![id, title, artist, album, album_artist, genre, year, track_number],
        )?;
        Ok(())
    }

    pub fn get_track_lyrics(&self, id: &str) -> AppResult<Option<String>> {
        let conn = self.conn.lock();
        conn.query_row(
            "SELECT lyrics FROM tracks WHERE id = ?1",
            params![id],
            |r| r.get::<_, Option<String>>(0),
        )
        .optional()
        .map(|opt| opt.flatten())
        .map_err(Into::into)
    }

    pub fn set_track_lyrics(&self, id: &str, text: Option<&str>) -> AppResult<()> {
        let conn = self.conn.lock();
        conn.execute(
            "UPDATE tracks SET lyrics = ?2 WHERE id = ?1",
            params![id, text],
        )?;
        Ok(())
    }

    #[allow(dead_code)]
    pub fn mark_missing(&self, id: &str, missing: bool) -> AppResult<()> {
        let conn = self.conn.lock();
        conn.execute(
            "UPDATE tracks SET missing = ?2 WHERE id = ?1",
            params![id, missing as i32],
        )?;
        Ok(())
    }

    pub fn delete_track(&self, id: &str) -> AppResult<()> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM tracks WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn list_tracks(&self) -> AppResult<Vec<Track>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            r#"SELECT id, source, uri, title, artist, album, album_artist, genre, year,
                track_number, duration_ms, file_size, format, has_cover, added_at, last_modified, missing, source_id
                FROM tracks ORDER BY added_at DESC"#,
        )?;
        let rows = stmt.query_map([], track_from_row)?;
        Ok(rows.filter_map(Result::ok).collect())
    }

    pub fn list_tracks_for_folder(&self, folder_path: &str) -> AppResult<Vec<Track>> {
        let conn = self.conn.lock();
        // Ensure a trailing separator so "/foo/Music" doesn't also match "/foo/Music_old/...".
        let mut prefix = folder_path.to_string();
        if !prefix.ends_with('/') {
            prefix.push('/');
        }
        let pattern = format!("{}%", prefix);
        let mut stmt = conn.prepare(
            r#"SELECT id, source, uri, title, artist, album, album_artist, genre, year,
                track_number, duration_ms, file_size, format, has_cover, added_at, last_modified, missing, source_id
                FROM tracks WHERE source = 'local' AND uri LIKE ?1"#,
        )?;
        let rows = stmt.query_map(params![pattern], track_from_row)?;
        Ok(rows.filter_map(Result::ok).collect())
    }

    pub fn get_track(&self, id: &str) -> AppResult<Option<Track>> {
        let conn = self.conn.lock();
        conn.query_row(
            r#"SELECT id, source, uri, title, artist, album, album_artist, genre, year,
                track_number, duration_ms, file_size, format, has_cover, added_at, last_modified, missing, source_id
                FROM tracks WHERE id = ?1"#,
            params![id],
            track_from_row,
        )
        .optional()
        .map_err(Into::into)
    }

    pub fn get_track_by_uri(&self, uri: &str) -> AppResult<Option<Track>> {
        let conn = self.conn.lock();
        conn.query_row(
            r#"SELECT id, source, uri, title, artist, album, album_artist, genre, year,
                track_number, duration_ms, file_size, format, has_cover, added_at, last_modified, missing, source_id
                FROM tracks WHERE uri = ?1"#,
            params![uri],
            track_from_row,
        )
        .optional()
        .map_err(Into::into)
    }

    // ---------- History ----------

    pub fn add_history(&self, track_id: &str) -> AppResult<()> {
        let conn = self.conn.lock();
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "INSERT INTO history(track_id, played_at) VALUES(?1, ?2)",
            params![track_id, now],
        )?;
        Ok(())
    }

    pub fn list_history(&self, limit: i64) -> AppResult<Vec<HistoryEntry>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            "SELECT id, track_id, played_at FROM history ORDER BY played_at DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit], |r| {
            Ok(HistoryEntry {
                id: r.get(0)?,
                track_id: r.get(1)?,
                played_at: r.get(2)?,
            })
        })?;
        Ok(rows.filter_map(Result::ok).collect())
    }

    pub fn clear_history(&self) -> AppResult<()> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM history", [])?;
        Ok(())
    }

    // ---------- Queue ----------

    pub fn set_queue(&self, ids: &[String]) -> AppResult<()> {
        let mut conn = self.conn.lock();
        let tx = conn.transaction()?;
        tx.execute("DELETE FROM queue", [])?;
        for (idx, id) in ids.iter().enumerate() {
            tx.execute(
                "INSERT INTO queue(position, track_id) VALUES(?1, ?2)",
                params![idx as i64, id],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn list_queue(&self) -> AppResult<Vec<String>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare("SELECT track_id FROM queue ORDER BY position ASC")?;
        let rows = stmt.query_map([], |r| r.get::<_, String>(0))?;
        Ok(rows.filter_map(Result::ok).collect())
    }
}

fn track_from_row(r: &rusqlite::Row) -> rusqlite::Result<Track> {
    let source_str: String = r.get(1)?;
    Ok(Track {
        id: r.get(0)?,
        source: SourceKind::from_str(&source_str),
        uri: r.get(2)?,
        title: r.get(3)?,
        artist: r.get(4)?,
        album: r.get(5)?,
        album_artist: r.get(6)?,
        genre: r.get(7)?,
        year: r.get::<_, Option<i64>>(8)?.map(|v| v as u32),
        track_number: r.get::<_, Option<i64>>(9)?.map(|v| v as u32),
        duration_ms: r.get::<_, Option<i64>>(10)?.map(|v| v as u64),
        file_size: r.get::<_, Option<i64>>(11)?.map(|v| v as u64),
        format: r.get(12)?,
        has_cover: r.get::<_, i32>(13)? != 0,
        added_at: r.get(14)?,
        last_modified: r.get(15)?,
        missing: r.get::<_, i32>(16)? != 0,
        source_id: r.get(17)?,
    })
}
