import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Music2, Disc3, Users, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { usePlayer } from "@/store/player";
import { useT } from "@/lib/i18n";
import { CoverArt } from "@/components/CoverArt";
import { cn } from "@/lib/utils";
import type { Track } from "@/types";

const LIMIT = 12;
const ALBUM_LIMIT = 10;
const COLUMN_SIZE = 3;

// ─── seeded random ────────────────────────────────────────────────────────────

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    s = ((s ^ (s >>> 14)) >>> 0);
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function dailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// ─── album grouping ───────────────────────────────────────────────────────────

interface AlbumEntry {
  key: string;
  name: string;
  artist: string;
  cover: Track;
  tracks: Track[];
}

function buildAlbumMap(tracks: Track[]): Map<string, AlbumEntry> {
  const map = new Map<string, AlbumEntry>();
  for (const tr of tracks) {
    const key = `${tr.album}||${tr.album_artist ?? tr.artist}`;
    if (!map.has(key)) {
      map.set(key, { key, name: tr.album, artist: tr.album_artist ?? tr.artist, cover: tr, tracks: [] });
    }
    const entry = map.get(key)!;
    entry.tracks.push(tr);
    if (!entry.cover.has_cover && tr.has_cover) entry.cover = tr;
  }
  return map;
}

// ─── scroll row ───────────────────────────────────────────────────────────────

function ScrollRow({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 0);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sync]);

  const scroll = (dir: -1 | 1) => {
    ref.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  return (
    <div className="relative -mx-1 px-1">
      {/* left fade */}
      <div className={cn(
        "pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent transition-opacity duration-200",
        atStart ? "opacity-0" : "opacity-100"
      )} />
      {/* left button */}
      <button
        onClick={() => scroll(-1)}
        className={cn(
          "absolute left-2 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background shadow-md transition-all duration-200 hover:bg-foreground/[0.06]",
          atStart ? "pointer-events-none opacity-0" : "opacity-100"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        ref={ref}
        onScroll={sync}
        className={cn("no-scrollbar flex overflow-x-auto", className)}
      >
        {children}
      </div>

      {/* right fade */}
      <div className={cn(
        "pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent transition-opacity duration-200",
        atEnd ? "opacity-0" : "opacity-100"
      )} />
      {/* right button */}
      <button
        onClick={() => scroll(1)}
        className={cn(
          "absolute right-2 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background shadow-md transition-all duration-200 hover:bg-foreground/[0.06]",
          atEnd ? "pointer-events-none opacity-0" : "opacity-100"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── main view ────────────────────────────────────────────────────────────────

export function HomeView() {
  const t = useT();
  const { tracks, history } = usePlayer();

  const trackMap = useMemo(
    () => new Map(tracks.map((tr) => [tr.id, tr])),
    [tracks]
  );

  const albumMap = useMemo(() => buildAlbumMap(tracks), [tracks]);

  const recentlyPlayed = useMemo(() => {
    const seen = new Set<string>();
    const result: Track[] = [];
    for (const h of history) {
      if (!seen.has(h.entry.track_id)) {
        seen.add(h.entry.track_id);
        const tr = trackMap.get(h.entry.track_id);
        if (tr) result.push(tr);
        if (result.length >= LIMIT) break;
      }
    }
    return result;
  }, [history, trackMap]);

  const recentAlbums = useMemo(() => {
    const seen = new Set<string>();
    const result: AlbumEntry[] = [];
    for (const h of history) {
      const tr = trackMap.get(h.entry.track_id);
      if (!tr) continue;
      const key = `${tr.album}||${tr.album_artist ?? tr.artist}`;
      if (!seen.has(key)) {
        seen.add(key);
        const entry = albumMap.get(key);
        if (entry) result.push(entry);
        if (result.length >= ALBUM_LIMIT) break;
      }
    }
    return result;
  }, [history, trackMap, albumMap]);

  const mostPlayed = useMemo(() => {
    const counts = new Map<string, number>();
    for (const h of history) {
      counts.set(h.entry.track_id, (counts.get(h.entry.track_id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, LIMIT)
      .flatMap(([id]) => {
        const tr = trackMap.get(id);
        return tr ? [tr] : [];
      });
  }, [history, trackMap]);

  const recentlyAdded = useMemo(
    () => [...tracks].sort((a, b) => b.added_at - a.added_at).slice(0, LIMIT),
    [tracks]
  );

  const dailyPick = useMemo(
    () => seededShuffle(tracks, dailySeed()).slice(0, LIMIT),
    [tracks]
  );

  if (tracks.length === 0) {
    return (
      <div className="flex flex-1 flex-col min-h-0">
        <Header title={t("page.home.title")} />
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {t("page.home.empty")}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <Header title={t("page.home.title")} />
      <div className="flex-1 min-h-0 overflow-y-auto pb-20">
        <div className="flex flex-col gap-8 px-8">
          <StatsBar tracks={tracks} />
          {recentlyPlayed.length > 0 && (
            <Section title={t("page.home.recentlyPlayed")} tracks={recentlyPlayed} />
          )}
          {recentAlbums.length > 0 && (
            <AlbumSection title={t("page.home.recentAlbums")} albums={recentAlbums} />
          )}
          {mostPlayed.length > 0 && (
            <Section title={t("page.home.mostPlayed")} tracks={mostPlayed} />
          )}
          {recentlyAdded.length > 0 && (
            <Section title={t("page.home.recentlyAdded")} tracks={recentlyAdded} />
          )}
          {dailyPick.length > 0 && (
            <Section title={t("page.home.dailyPick")} tracks={dailyPick} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ tracks }: { tracks: Track[] }) {
  const t = useT();
  const stats = useMemo(() => {
    const albums = new Set(tracks.map((tr) => tr.album).filter(Boolean));
    const artists = new Set(tracks.map((tr) => tr.artist).filter(Boolean));
    const totalMs = tracks.reduce((sum, tr) => sum + (tr.duration_ms ?? 0), 0);
    return { tracks: tracks.length, albums: albums.size, artists: artists.size, totalMs };
  }, [tracks]);

  return (
    <div className="grid grid-cols-4 gap-3">
      <StatCard icon={Music2} value={stats.tracks.toLocaleString()} label={t("page.home.stats.tracks")} bg="bg-rose-500/10"    border="border-rose-500/20"    iconCls="text-rose-500" />
      <StatCard icon={Disc3}  value={stats.albums.toLocaleString()}  label={t("page.home.stats.albums")}  bg="bg-blue-500/10"    border="border-blue-500/20"    iconCls="text-blue-500" />
      <StatCard icon={Users}  value={stats.artists.toLocaleString()} label={t("page.home.stats.artists")} bg="bg-amber-500/10"   border="border-amber-500/20"   iconCls="text-amber-500" />
      <StatCard icon={Clock}  value={formatDuration(stats.totalMs)}  label={t("page.home.stats.duration")} bg="bg-emerald-500/10" border="border-emerald-500/20" iconCls="text-emerald-500" />
    </div>
  );
}

function StatCard({ icon: Icon, value, label, bg, border, iconCls }: {
  icon: React.ElementType; value: string; label: string; bg: string; border: string; iconCls: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl border px-4 py-4", bg, border)}>
      <Icon className={cn("absolute -right-3 -top-3 h-16 w-16 opacity-[0.08]", iconCls)} />
      <div className="relative flex flex-col gap-2.5">
        <Icon className={cn("h-4 w-4", iconCls)} />
        <div>
          <div className="text-2xl font-bold tabular-nums tracking-tight">{value}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin} min`;
  const hours = Math.floor(totalMin / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  return remH > 0 ? `${days} d ${remH} h` : `${days} d`;
}

// ─── header ───────────────────────────────────────────────────────────────────

function Header({ title }: { title: string }) {
  return (
    <header className="flex shrink-0 items-end gap-4 px-8 pt-[calc(var(--titlebar-height)+12px)] pb-5">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
    </header>
  );
}

// ─── track section ────────────────────────────────────────────────────────────

function Section({ title, tracks }: { title: string; tracks: Track[] }) {
  const ids = tracks.map((tr) => tr.id);
  const columns: Track[][] = [];
  for (let i = 0; i < tracks.length; i += COLUMN_SIZE) {
    columns.push(tracks.slice(i, i + COLUMN_SIZE));
  }

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-foreground/90">{title}</h2>
      <ScrollRow className="gap-2">
        {columns.map((col, ci) => (
          <div key={ci} className="flex w-[260px] shrink-0 flex-col">
            {col.map((track) => (
              <TrackRow key={track.id} track={track} contextIds={ids} />
            ))}
          </div>
        ))}
      </ScrollRow>
    </section>
  );
}

function TrackRow({ track, contextIds }: { track: Track; contextIds: string[] }) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const playing = currentTrack?.id === track.id;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors",
        playing ? "bg-foreground/[0.06]" : "hover:bg-foreground/[0.04]"
      )}
      onDoubleClick={() => (playing ? togglePlay() : playTrack(track.id, contextIds))}
    >
      <div className="relative shrink-0">
        <CoverArt trackId={track.id} hasCover={track.has_cover} size={44} className="rounded-md" />
        <button
          onClick={() => (playing ? togglePlay() : playTrack(track.id, contextIds))}
          className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100"
        >
          {playing && isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-sm font-medium", playing && "text-rose-400")}>{track.title}</div>
        <div className="truncate text-xs text-muted-foreground">{track.artist}</div>
      </div>
    </div>
  );
}

// ─── album section ────────────────────────────────────────────────────────────

function AlbumSection({ title, albums }: { title: string; albums: AlbumEntry[] }) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-foreground/90">{title}</h2>
      <ScrollRow className="gap-3">
        {albums.map((album) => (
          <AlbumCard key={album.key} album={album} />
        ))}
      </ScrollRow>
    </section>
  );
}

function AlbumCard({ album }: { album: AlbumEntry }) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const playing = album.tracks.some((tr) => tr.id === currentTrack?.id);
  const ids = album.tracks.map((tr) => tr.id);

  const handlePlay = () => {
    if (playing) togglePlay();
    else playTrack(album.tracks[0].id, ids);
  };

  return (
    <div className="group flex w-[120px] shrink-0 flex-col gap-2">
      <div className="relative overflow-hidden rounded-xl shadow-sm">
        <CoverArt trackId={album.cover.id} hasCover={album.cover.has_cover} size={120} className="rounded-xl" />
        <button
          onClick={handlePlay}
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 text-white transition-opacity",
            playing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          {playing && isPlaying ? <Pause className="h-6 w-6 drop-shadow" /> : <Play className="h-6 w-6 drop-shadow" />}
        </button>
      </div>
      <div className="px-0.5">
        <div className={cn("truncate text-sm font-medium leading-snug", playing && "text-rose-400")}>{album.name}</div>
        <div className="truncate text-xs text-muted-foreground">{album.artist}</div>
      </div>
    </div>
  );
}
