export type SourceKind = "local" | "remote";
export type RemoteKind = "webdav" | "http";

export interface Track {
  id: string;
  source: SourceKind;
  uri: string;
  title: string;
  artist: string;
  album: string;
  album_artist: string | null;
  genre: string | null;
  year: number | null;
  track_number: number | null;
  duration_ms: number | null;
  file_size: number | null;
  format: string | null;
  has_cover: boolean;
  added_at: number;
  last_modified: number | null;
  missing: boolean;
  source_id: number | null;
  bit_depth: number | null;
  sample_rate: number | null;
  bit_rate: number | null;
}

export interface Folder {
  id: number;
  path: string;
  added_at: number;
}

export interface RemoteSource {
  id: number;
  kind: RemoteKind;
  name: string;
  url: string;
  username: string | null;
  password: string | null;
  added_at: number;
}

export interface PlayerState {
  current_track_id: string | null;
  is_playing: boolean;
  position_ms: number;
  duration_ms: number;
  volume: number;
}

export interface PlayerSnapshot {
  current_track: Track | null;
  is_playing: boolean;
  position_ms: number;
  duration_ms: number;
  volume: number;
  finished: boolean;
}

export interface HistoryEntry {
  id: number;
  track_id: string;
  played_at: number;
}

export interface HistoryWithTrack {
  entry: HistoryEntry;
  track: Track;
}

export interface LyricLine {
  time_ms: number | null;
  text: string;
}

export interface Lyrics {
  synced: boolean;
  lines: LyricLine[];
}

export interface MetadataPatch {
  title?: string;
  artist?: string;
  album?: string;
  album_artist?: string;
  genre?: string;
  year?: number;
  track_number?: number;
}
