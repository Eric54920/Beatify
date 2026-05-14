import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import type {
  Folder,
  HistoryWithTrack,
  PlayerSnapshot,
  RemoteSource,
  Track,
} from "@/types";
import { api } from "@/lib/api";
import { useSettings } from "@/store/settings";

export type View =
  | "home"
  | "library"
  | "albums"
  | "artists"
  | "sources"
  | "settings";

interface PlayerStore {
  tracks: Track[];
  history: HistoryWithTrack[];
  queue: Track[];
  folders: Folder[];
  remoteSources: RemoteSource[];
  currentTrack: Track | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  volume: number;
  view: View;
  panelOpen: boolean;
  lyricsOpen: boolean;
  search: string;
  selectedAlbumKey: string | null;
  selectedArtist: string | null;
  coverArtCache: Record<string, string | null>;
  initialize: () => Promise<void>;
  refreshLibrary: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  refreshQueue: () => Promise<void>;
  refreshFolders: () => Promise<void>;
  refreshRemoteSources: () => Promise<void>;
  playTrack: (trackId: string, contextIds?: string[]) => Promise<void>;
  togglePlay: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (ms: number) => Promise<void>;
  setVolume: (v: number) => Promise<void>;
  setView: (v: View) => void;
  togglePanel: () => void;
  closePanel: () => void;
  toggleLyrics: () => void;
  closeLyrics: () => void;
  setSearch: (q: string) => void;
  setSelectedAlbumKey: (k: string | null) => void;
  setSelectedArtist: (a: string | null) => void;
  loadCover: (trackId: string) => Promise<string | null>;
}

export const usePlayer = create<PlayerStore>((set, get) => ({
  tracks: [],
  history: [],
  queue: [],
  folders: [],
  remoteSources: [],
  currentTrack: null,
  isPlaying: false,
  positionMs: 0,
  durationMs: 0,
  volume: 1,
  view: "home",
  panelOpen: false,
  lyricsOpen: false,
  search: "",
  selectedAlbumKey: null,
  selectedArtist: null,
  coverArtCache: {},

  initialize: async () => {
    await Promise.all([
      get().refreshLibrary(),
      get().refreshFolders(),
      get().refreshRemoteSources(),
      get().refreshHistory(),
      get().refreshQueue(),
    ]);
    const ps = await api.getPlayerState();
    set({
      isPlaying: ps.is_playing,
      positionMs: ps.position_ms,
      durationMs: ps.duration_ms,
      volume: ps.volume,
    });

    await listen<PlayerSnapshot>("player:state", (event) => {
      const s = event.payload;
      const { tracks } = get();
      // Prefer the freshest track data from the library over the snapshot
      // embedded in the event (which was locked at play time and may be stale).
      const currentTrack = s.current_track
        ? (tracks.find((t) => t.id === s.current_track!.id) ?? s.current_track)
        : null;
      set({
        currentTrack,
        isPlaying: s.is_playing,
        positionMs: s.position_ms,
        durationMs: s.duration_ms,
        volume: s.volume,
      });
    });

    await listen<Track | null>("player:ended", async () => {
      try {
        await get().next();
      } catch {
        /* noop */
      }
    });

    await listen("library:changed", async () => {
      await get().refreshLibrary();
      await get().refreshFolders();
      await get().refreshRemoteSources();
    });

    await listen("queue:changed", async () => {
      await get().refreshQueue();
    });
  },

  refreshLibrary: async () => {
    const tracks = await api.listTracks();
    set({ tracks });
  },
  refreshHistory: async () => {
    const history = await api.getHistory();
    set({ history });
  },
  refreshQueue: async () => {
    const queue = await api.getQueue();
    set({ queue });
  },
  refreshFolders: async () => {
    const folders = await api.listFolders();
    set({ folders });
  },
  refreshRemoteSources: async () => {
    const remoteSources = await api.listRemoteSources();
    set({ remoteSources });
  },

  playTrack: async (trackId, contextIds) => {
    if (contextIds && contextIds.length) {
      // Queue is the full context so navigation + shuffle/repeat have everything to work with.
      await api.setQueue(contextIds);
    } else {
      const queue = get().queue;
      if (!queue.find((t) => t.id === trackId)) {
        await api.setQueue([trackId, ...queue.map((t) => t.id)]);
      }
    }
    await api.playTrack(trackId);
    await get().refreshHistory();
    await get().refreshQueue();
  },

  togglePlay: async () => {
    await api.playPause();
  },
  next: async () => {
    const { queue, currentTrack } = get();
    const { shuffle, repeat } = useSettings.getState();

    // Repeat one: replay current track from the start.
    if (repeat === "one" && currentTrack) {
      await api.playTrack(currentTrack.id);
      await get().refreshHistory();
      return;
    }

    if (queue.length === 0) {
      await api.stop();
      return;
    }

    if (shuffle) {
      const candidates = queue.filter((t) => t.id !== currentTrack?.id);
      const pick = candidates.length
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : queue[0];
      await api.playTrack(pick.id);
      await get().refreshHistory();
      return;
    }

    const idx = currentTrack
      ? queue.findIndex((t) => t.id === currentTrack.id)
      : -1;
    if (idx >= 0 && idx + 1 < queue.length) {
      await api.playTrack(queue[idx + 1].id);
    } else if (repeat === "all") {
      await api.playTrack(queue[0].id);
    } else {
      await api.stop();
    }
    await get().refreshHistory();
  },
  previous: async () => {
    const { queue, currentTrack, positionMs } = get();
    // Apple Music behaviour: if more than 3s into the track, restart it.
    if (currentTrack && positionMs > 3000) {
      await api.playTrack(currentTrack.id);
      return;
    }
    if (queue.length === 0) return;
    const idx = currentTrack
      ? queue.findIndex((t) => t.id === currentTrack.id)
      : -1;
    if (idx > 0) {
      await api.playTrack(queue[idx - 1].id);
    } else if (currentTrack) {
      // Already at start — just restart current.
      await api.playTrack(currentTrack.id);
    }
  },
  seek: async (ms) => {
    await api.seek(Math.max(0, Math.floor(ms)));
  },
  setVolume: async (v) => {
    set({ volume: v });
    await api.setVolume(v);
  },
  setView: (v) =>
    set({
      view: v,
      panelOpen: false,
      selectedAlbumKey: null,
      selectedArtist: null,
    }),
  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
  closePanel: () => set({ panelOpen: false }),
  toggleLyrics: () => set((state) => ({ lyricsOpen: !state.lyricsOpen })),
  closeLyrics: () => set({ lyricsOpen: false }),
  setSearch: (q) => set({ search: q }),
  setSelectedAlbumKey: (k) => set({ selectedAlbumKey: k }),
  setSelectedArtist: (a) => set({ selectedArtist: a }),

  loadCover: async (trackId) => {
    const cache = get().coverArtCache;
    if (trackId in cache) return cache[trackId];
    try {
      const data = await api.getCoverArt(trackId);
      set({ coverArtCache: { ...get().coverArtCache, [trackId]: data } });
      return data;
    } catch {
      set({ coverArtCache: { ...get().coverArtCache, [trackId]: null } });
      return null;
    }
  },
}));
