import { invoke } from "@tauri-apps/api/core";
import type {
  Folder,
  HistoryWithTrack,
  Lyrics,
  MetadataPatch,
  PlayerState,
  RemoteSource,
  Track,
} from "@/types";

export const api = {
  listTracks: () => invoke<Track[]>("list_tracks"),
  listFolders: () => invoke<Folder[]>("list_folders"),
  addLocalFolder: (path: string) =>
    invoke<Track[]>("add_local_folder", { path }),
  removeFolder: (id: number) => invoke<void>("remove_folder", { id }),
  rescanLibrary: () => invoke<number>("rescan_library"),

  listRemoteSources: () => invoke<RemoteSource[]>("list_remote_sources"),
  addWebdavSource: (input: {
    name: string;
    url: string;
    username?: string;
    password?: string;
  }) => invoke<RemoteSource>("add_webdav_source", input),
  updateWebdavSource: (input: {
    id: number;
    name: string;
    url: string;
    username?: string;
    password?: string;
  }) => invoke<import("@/types").RemoteSource>("update_webdav_source", input),
  removeRemoteSource: (id: number) =>
    invoke<void>("remove_remote_source", { id }),
  syncRemoteSource: (id: number) =>
    invoke<number>("sync_remote_source", { id }),
  syncAllRemoteSources: () => invoke<number>("sync_all_remote_sources"),

  addRemoteTrack: (input: {
    url: string;
    title?: string;
    artist?: string;
    album?: string;
  }) => invoke<Track>("add_remote_track", input),

  playTrack: (trackId: string) => invoke<void>("play_track", { trackId }),
  playPause: () => invoke<void>("play_pause"),
  resume: () => invoke<void>("resume"),
  pause: () => invoke<void>("pause"),
  stop: () => invoke<void>("stop_playback"),
  next: () => invoke<Track | null>("next_track"),
  previous: () => invoke<Track | null>("previous_track"),
  seek: (positionMs: number) => invoke<void>("seek", { positionMs }),
  setVolume: (volume: number) => invoke<void>("set_volume", { volume }),
  getPlayerState: () => invoke<PlayerState>("get_player_state"),

  getQueue: () => invoke<Track[]>("get_queue"),
  setQueue: (trackIds: string[]) => invoke<void>("set_queue", { trackIds }),
  addToQueue: (trackId: string) => invoke<void>("add_to_queue", { trackId }),
  clearQueue: () => invoke<void>("clear_queue"),

  getHistory: () => invoke<HistoryWithTrack[]>("get_history"),
  clearHistory: () => invoke<void>("clear_history"),

  updateTrackMetadata: (trackId: string, patch: MetadataPatch) =>
    invoke<Track>("update_track_metadata", { trackId, patch }),
  getCoverArt: (trackId: string) =>
    invoke<string | null>("get_cover_art", { trackId }),
  getLyrics: (trackId: string) =>
    invoke<Lyrics | null>("get_lyrics", { trackId }),
  speedTestSource: (opts: { folderPath?: string; sourceId?: number }) =>
    invoke<{ peak_kbps: number; avg_kbps: number }>("speed_test_source", {
      folderPath: opts.folderPath ?? null,
      sourceId: opts.sourceId ?? null,
    }),

  checkUpdate: () =>
    invoke<{
      current_version: string;
      latest_version: string;
      has_update: boolean;
      release_url: string;
    }>("check_update"),

  installUpdate: () => invoke<void>("install_update"),
};
