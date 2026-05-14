use std::io::Cursor;
use std::path::Path;
use std::time::Duration;

use percent_encoding::percent_decode_str;
use quick_xml::events::Event;
use quick_xml::Reader;
use reqwest::blocking::{Client, Response};
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, CONTENT_TYPE};
use url::Url;
use uuid::Uuid;

use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::metadata::{self, is_supported};
use crate::model::{RemoteSource, SourceKind, Track};

#[derive(Debug, Clone)]
pub struct WebdavEntry {
    pub href_url: String,
    pub display_name: String,
    pub size: Option<u64>,
}

fn http_client() -> AppResult<Client> {
    Client::builder()
        .timeout(Duration::from_secs(60))
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(AppError::Http)
}

fn auth_request(
    client: &Client,
    method: reqwest::Method,
    url: &str,
    source: &RemoteSource,
) -> reqwest::blocking::RequestBuilder {
    let mut req = client.request(method, url);
    if let Some(user) = source.username.as_deref() {
        req = req.basic_auth(user, source.password.clone());
    }
    req
}

pub fn list_recursive(source: &RemoteSource) -> AppResult<Vec<WebdavEntry>> {
    let client = http_client()?;
    let mut headers = HeaderMap::new();
    headers.insert(HeaderName::from_static("depth"), HeaderValue::from_static("infinity"));
    headers.insert(
        CONTENT_TYPE,
        HeaderValue::from_static("application/xml; charset=utf-8"),
    );

    let propfind_body = r#"<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname/>
    <d:getcontentlength/>
    <d:resourcetype/>
  </d:prop>
</d:propfind>"#;

    let req = auth_request(
        &client,
        reqwest::Method::from_bytes(b"PROPFIND").expect("static method"),
        &source.url,
        source,
    )
    .headers(headers.clone())
    .body(propfind_body);

    let resp = req.send().map_err(AppError::Http)?;
    let status = resp.status();
    if !status.is_success() && status.as_u16() != 207 {
        return list_with_depth_one(&client, source);
    }
    let body = resp.text().map_err(AppError::Http)?;
    parse_propfind_xml(&source.url, &body)
}

fn list_with_depth_one(client: &Client, source: &RemoteSource) -> AppResult<Vec<WebdavEntry>> {
    let mut out = Vec::new();
    let mut stack = vec![source.url.clone()];
    let mut visited = std::collections::HashSet::new();
    while let Some(current) = stack.pop() {
        if !visited.insert(current.clone()) {
            continue;
        }
        let mut headers = HeaderMap::new();
        headers.insert(HeaderName::from_static("depth"), HeaderValue::from_static("1"));
        headers.insert(
            CONTENT_TYPE,
            HeaderValue::from_static("application/xml; charset=utf-8"),
        );
        let body = r#"<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname/>
    <d:getcontentlength/>
    <d:resourcetype/>
  </d:prop>
</d:propfind>"#;
        let resp = auth_request(
            client,
            reqwest::Method::from_bytes(b"PROPFIND").expect("static"),
            &current,
            source,
        )
        .headers(headers)
        .body(body)
        .send()
        .map_err(AppError::Http)?;
        let status = resp.status();
        if !status.is_success() && status.as_u16() != 207 {
            log::warn!("PROPFIND {} -> {}", current, status);
            continue;
        }
        let text = resp.text().map_err(AppError::Http)?;
        let entries = parse_propfind_xml(&current, &text)?;
        for e in entries {
            if e.href_url.trim_end_matches('/') == current.trim_end_matches('/') {
                continue;
            }
            if e.href_url.ends_with('/') {
                stack.push(e.href_url.clone());
            } else {
                out.push(e);
            }
        }
    }
    Ok(out)
}

fn parse_propfind_xml(base_url: &str, xml: &str) -> AppResult<Vec<WebdavEntry>> {
    let base = Url::parse(base_url).map_err(|e| AppError::Other(e.to_string()))?;

    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);

    let mut out = Vec::new();
    let mut buf = Vec::new();

    let mut in_response = false;
    let mut current_href: Option<String> = None;
    let mut current_name: Option<String> = None;
    let mut current_size: Option<u64> = None;
    let mut is_collection = false;
    let mut text_target: Option<TextField> = None;

    enum TextField {
        Href,
        Name,
        Length,
    }

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                let name = e.name();
                let local = local_name(name.as_ref());
                match local {
                    "response" => {
                        in_response = true;
                        current_href = None;
                        current_name = None;
                        current_size = None;
                        is_collection = false;
                    }
                    "href" if in_response => text_target = Some(TextField::Href),
                    "displayname" if in_response => text_target = Some(TextField::Name),
                    "getcontentlength" if in_response => text_target = Some(TextField::Length),
                    "collection" if in_response => is_collection = true,
                    _ => {}
                }
            }
            Ok(Event::End(e)) => {
                let name = e.name();
                let local = local_name(name.as_ref());
                match local {
                    "response" => {
                        if let Some(href) = current_href.take() {
                            let abs = base
                                .join(&href)
                                .map(|u| u.to_string())
                                .unwrap_or_else(|_| href.clone());
                            let href_url = if is_collection && !abs.ends_with('/') {
                                format!("{}/", abs)
                            } else {
                                abs
                            };
                            let display = current_name.take().unwrap_or_else(|| {
                                let path = base.join(&href_url).ok();
                                path.and_then(|p| {
                                    p.path_segments()
                                        .and_then(|seg| {
                                            seg.filter(|s| !s.is_empty()).last().map(|s| s.to_string())
                                        })
                                })
                                .map(|s| percent_decode_str(&s).decode_utf8_lossy().to_string())
                                .unwrap_or_else(|| href_url.clone())
                            });
                            out.push(WebdavEntry {
                                href_url,
                                display_name: display,
                                size: current_size.take(),
                            });
                        }
                        in_response = false;
                    }
                    "href" | "displayname" | "getcontentlength" => text_target = None,
                    _ => {}
                }
            }
            Ok(Event::Text(t)) => {
                if let Some(target) = &text_target {
                    let value = t.unescape().unwrap_or_default().to_string();
                    match target {
                        TextField::Href => current_href = Some(value),
                        TextField::Name => current_name = Some(value),
                        TextField::Length => current_size = value.parse::<u64>().ok(),
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(AppError::Other(format!("xml parse: {e}"))),
            _ => {}
        }
        buf.clear();
    }

    Ok(out)
}

fn local_name(name: &[u8]) -> &str {
    let s = std::str::from_utf8(name).unwrap_or("");
    match s.rsplit_once(':') {
        Some((_, local)) => local,
        None => s,
    }
}

pub fn sync_source(db: &Db, source: &RemoteSource, covers_dir: &Path) -> AppResult<usize> {
    let entries = list_recursive(source)?;
    let mut count = 0usize;
    let mut seen_uris: Vec<String> = Vec::new();

    for entry in entries {
        // Decide whether the entry is an audio file by looking at both displayName and URL path.
        let display_lower = entry.display_name.to_ascii_lowercase();
        let mut audio = is_supported(Path::new(&display_lower));
        if !audio {
            let url = match Url::parse(&entry.href_url) {
                Ok(u) => u,
                Err(_) => continue,
            };
            let last = url
                .path_segments()
                .and_then(|s| s.filter(|p| !p.is_empty()).last().map(|p| p.to_string()))
                .unwrap_or_default();
            audio = is_supported(Path::new(&last.to_ascii_lowercase()));
        }
        if !audio {
            continue;
        }

        seen_uris.push(entry.href_url.clone());
        let existing = db.get_track_by_uri(&entry.href_url)?;
        let id = existing
            .as_ref()
            .map(|t| t.id.clone())
            .unwrap_or_else(|| Uuid::new_v4().to_string());

        let format_hint = derive_format(&entry);

        // Re-extract tags whenever we don't yet have a duration (best heuristic for "metadata
        // hasn't been parsed yet") or this is brand new.
        let needs_extract = existing
            .as_ref()
            .map(|t| {
                t.duration_ms.is_none()
                    || (!t.has_cover && t.title == fallback_title_from_entry(&entry))
                    || t.sample_rate.is_none()
            })
            .unwrap_or(true);

        let extracted = if needs_extract {
            match fetch_track_bytes(source, &entry.href_url) {
                Ok(cursor) => {
                    let bytes = cursor.into_inner();
                    let fallback = fallback_title_from_entry(&entry);
                    let parsed = metadata::read_from_bytes(&bytes, &fallback, format_hint.clone());
                    let mut info = match parsed {
                        Ok(v) => Some(v),
                        Err(e) => {
                            log::warn!("metadata read failed for {}: {}", entry.href_url, e);
                            None
                        }
                    };
                    // Cache the cover image if present.
                    if let Some(ref r) = info {
                        if r.has_cover {
                            if let Some(cover) = metadata::extract_cover_bytes(&bytes) {
                                let target = covers_dir.join(&id);
                                if let Err(e) = std::fs::write(&target, &cover) {
                                    log::warn!("cover cache write failed: {}", e);
                                    if let Some(r2) = info.as_mut() {
                                        r2.has_cover = false;
                                    }
                                }
                            } else if let Some(r2) = info.as_mut() {
                                r2.has_cover = false;
                            }
                        }
                    }
                    info
                }
                Err(e) => {
                    log::warn!("download for metadata failed: {} {}", entry.href_url, e);
                    None
                }
            }
        } else {
            None
        };

        // Pull lyrics out before `extracted` is consumed below; we still want to cache it.
        let extracted_lyrics: Option<String> =
            extracted.as_ref().and_then(|r| r.lyrics.clone());

        let track = if let Some(r) = extracted {
            Track {
                id: id.clone(),
                source: SourceKind::Remote,
                uri: entry.href_url.clone(),
                title: r.title,
                artist: r.artist,
                album: r.album,
                album_artist: r.album_artist,
                genre: r.genre,
                year: r.year,
                track_number: r.track_number,
                duration_ms: r.duration_ms,
                file_size: entry.size,
                format: r.format.or(format_hint.clone()),
                has_cover: r.has_cover,
                added_at: existing
                    .as_ref()
                    .map(|t| t.added_at)
                    .unwrap_or_else(|| chrono::Utc::now().timestamp_millis()),
                last_modified: None,
                missing: false,
                source_id: Some(source.id),
                bit_depth: r.bit_depth,
                sample_rate: r.sample_rate,
                bit_rate: r.bit_rate,
            }
        } else if let Some(prev) = existing.clone() {
            // Use stored data, just refresh source linkage / format / size and clear missing flag.
            Track {
                missing: false,
                source_id: Some(source.id),
                file_size: entry.size.or(prev.file_size),
                format: prev.format.clone().or(format_hint.clone()),
                ..prev
            }
        } else {
            // Fallback minimal track if extraction failed and no previous row exists.
            Track {
                id: id.clone(),
                source: SourceKind::Remote,
                uri: entry.href_url.clone(),
                title: fallback_title_from_entry(&entry),
                artist: source.name.clone(),
                album: "WebDAV".to_string(),
                album_artist: None,
                genre: None,
                year: None,
                track_number: None,
                duration_ms: None,
                file_size: entry.size,
                format: format_hint.clone(),
                has_cover: false,
                added_at: chrono::Utc::now().timestamp_millis(),
                last_modified: None,
                missing: false,
                source_id: Some(source.id),
                bit_depth: None,
                sample_rate: None,
                bit_rate: None,
            }
        };

        db.upsert_track(&track)?;
        if let Some(ref text) = extracted_lyrics {
            db.set_track_lyrics(&track.id, Some(text.as_str()))?;
        }
        count += 1;
    }

    // Delete tracks that are no longer present on the server, along with their cached cover art.
    for t in db.list_tracks_for_remote_source(source.id)? {
        if !seen_uris.contains(&t.uri) {
            let cover = covers_dir.join(&t.id);
            let _ = std::fs::remove_file(&cover);
            db.delete_track(&t.id)?;
        }
    }
    Ok(count)
}

fn fallback_title_from_entry(entry: &WebdavEntry) -> String {
    let name = if entry.display_name.is_empty() {
        Url::parse(&entry.href_url)
            .ok()
            .and_then(|u| {
                u.path_segments()
                    .and_then(|s| s.filter(|p| !p.is_empty()).last().map(|p| p.to_string()))
            })
            .unwrap_or_else(|| entry.href_url.clone())
    } else {
        entry.display_name.clone()
    };
    Path::new(&name)
        .file_stem()
        .and_then(|s| s.to_str())
        .map(|s| s.to_string())
        .unwrap_or(name)
}

fn derive_format(entry: &WebdavEntry) -> Option<String> {
    Path::new(&entry.display_name)
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_ascii_uppercase())
        .or_else(|| {
            Url::parse(&entry.href_url).ok().and_then(|u| {
                u.path_segments()
                    .and_then(|s| s.last().map(|t| t.to_string()))
                    .and_then(|p| {
                        Path::new(&p)
                            .extension()
                            .and_then(|e| e.to_str())
                            .map(|s| s.to_ascii_uppercase())
                    })
            })
        })
}

pub fn fetch_track_bytes(source: &RemoteSource, uri: &str) -> AppResult<Cursor<Vec<u8>>> {
    let client = http_client()?;
    let resp: Response = auth_request(&client, reqwest::Method::GET, uri, source)
        .send()
        .map_err(AppError::Http)?
        .error_for_status()
        .map_err(AppError::Http)?;
    let bytes = resp.bytes().map_err(AppError::Http)?;
    Ok(Cursor::new(bytes.to_vec()))
}
