use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct LyricLine {
    pub time_ms: Option<u64>,
    pub text: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Lyrics {
    pub synced: bool,
    pub lines: Vec<LyricLine>,
}

/// Parse a raw lyric string. Accepts standard LRC (`[mm:ss.xx]text`) and falls
/// back to plain-text lines (no timestamps).
pub fn parse(text: &str) -> Lyrics {
    let mut lines: Vec<LyricLine> = Vec::new();
    let mut synced = false;

    for raw in text.lines() {
        let raw = raw.trim();
        if raw.is_empty() {
            continue;
        }

        // Pull any leading bracketed segments. Segments may be either timestamps
        // (kept) or metadata like [ar:Artist] (dropped).
        let mut rest = raw;
        let mut times: Vec<u64> = Vec::new();
        loop {
            let r = rest.trim_start();
            if !r.starts_with('[') {
                rest = r;
                break;
            }
            let end = match r.find(']') {
                Some(i) => i,
                None => break,
            };
            let inner = &r[1..end];
            if let Some(t) = parse_time(inner) {
                times.push(t);
            }
            rest = &r[end + 1..];
        }

        let line_text = rest.trim().to_string();

        if times.is_empty() {
            // Unsynced line. Some embedded tags contain only plain lyrics.
            if !line_text.is_empty() {
                lines.push(LyricLine {
                    time_ms: None,
                    text: line_text,
                });
            }
        } else {
            synced = true;
            for t in &times {
                lines.push(LyricLine {
                    time_ms: Some(*t),
                    text: line_text.clone(),
                });
            }
        }
    }

    // Stable sort by time, putting unsynced entries at the end.
    lines.sort_by(|a, b| match (a.time_ms, b.time_ms) {
        (Some(x), Some(y)) => x.cmp(&y),
        (Some(_), None) => std::cmp::Ordering::Less,
        (None, Some(_)) => std::cmp::Ordering::Greater,
        (None, None) => std::cmp::Ordering::Equal,
    });

    Lyrics { synced, lines }
}

fn parse_time(s: &str) -> Option<u64> {
    let s = s.trim();
    let mut parts = s.splitn(2, ':');
    let mm: u64 = parts.next()?.parse().ok()?;
    let rest = parts.next()?;
    if let Some(dot) = rest.find('.') {
        let secs: u64 = rest[..dot].parse().ok()?;
        let frac_str = &rest[dot + 1..];
        if frac_str.is_empty() {
            return Some(mm * 60_000 + secs * 1000);
        }
        let frac: u64 = frac_str.parse().ok()?;
        let ms = match frac_str.len() {
            1 => frac * 100,
            2 => frac * 10,
            3 => frac,
            n => frac / 10u64.pow(n as u32 - 3),
        };
        Some(mm * 60_000 + secs * 1000 + ms)
    } else {
        let secs: u64 = rest.parse().ok()?;
        Some(mm * 60_000 + secs * 1000)
    }
}
