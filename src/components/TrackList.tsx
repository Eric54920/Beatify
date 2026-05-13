import { useMemo, useState } from "react";
import {
  Play,
  Pause,
  MoreHorizontal,
  ListPlus,
  Pencil,
  Cloud,
  AlertCircle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { Track } from "@/types";
import { CoverArt } from "@/components/CoverArt";
import { cn, formatBytes, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePlayer } from "@/store/player";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MetadataEditor } from "@/components/MetadataEditor";
import { useT } from "@/lib/i18n";

export type SortKey =
  | "title"
  | "artist"
  | "album"
  | "format"
  | "size"
  | "duration"
  | "plays"
  | "added";
export type SortDir = "asc" | "desc";

interface Props {
  tracks: Track[];
  /** When set, hides cover column (e.g. compact queue). */
  variant?: "default" | "compact";
  /** Optional context to use as queue when playing. */
  contextIds?: string[];
  emptyHint?: React.ReactNode;
  /** When true, show clickable column headers + arrows. */
  sortable?: boolean;
}

export function TrackList({
  tracks,
  variant = "default",
  contextIds,
  emptyHint,
  sortable = false,
}: Props) {
  const { currentTrack, isPlaying, playTrack, togglePlay, history } =
    usePlayer();
  const { toast } = useToast();
  const t = useT();
  const [editing, setEditing] = useState<Track | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "added",
    dir: "desc",
  });

  // Compute play counts on demand.
  const playCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of history) m.set(h.entry.track_id, (m.get(h.entry.track_id) ?? 0) + 1);
    return m;
  }, [history]);

  const sorted = useMemo(() => {
    if (!sortable) return tracks;
    const arr = [...tracks];
    const dir = sort.dir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const cmp = compare(a, b, sort.key, playCounts);
      return cmp * dir;
    });
    return arr;
  }, [tracks, sortable, sort, playCounts]);

  if (!sorted.length) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">
        {emptyHint ?? "No tracks yet."}
      </div>
    );
  }

  const ids = contextIds ?? sorted.map((tr) => tr.id);

  if (variant === "compact") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-20">
          {sorted.map((track) => {
            const playing = currentTrack?.id === track.id;
            return (
              <div
                key={track.id}
                onDoubleClick={() => playTrack(track.id, ids)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-foreground/[0.04]",
                  playing && "bg-foreground/[0.06]"
                )}
              >
                <div className="relative">
                  <CoverArt
                    trackId={track.id}
                    hasCover={track.has_cover}
                    size={40}
                    className="rounded-md"
                  />
                  <button
                    onClick={() => {
                      if (playing) togglePlay();
                      else playTrack(track.id, ids);
                    }}
                    className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    {playing && isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "truncate font-medium",
                      playing && "text-rose-400"
                    )}
                  >
                    {track.title}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {track.artist}
                  </div>
                </div>
                <div className="text-xs tabular-nums text-muted-foreground">
                  {formatTime(track.duration_ms ?? 0)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const onHeaderClick = (key: SortKey) => {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  };

  const headerCols: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "title", label: t("col.title") },
    { key: "artist", label: t("col.artist") },
    { key: "album", label: t("col.album") },
    { key: "format", label: t("col.format") },
    { key: "size", label: t("col.size"), align: "right" },
    { key: "duration", label: t("col.time"), align: "right" },
    { key: "plays", label: t("col.plays"), align: "right" },
  ];

  return (
    <div className="flex h-full flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto pb-20">
        <div className="sticky top-0 z-10 grid grid-cols-[44px_36px_minmax(0,3fr)_minmax(0,2fr)_minmax(0,2fr)_64px_80px_60px_60px_44px] items-center gap-3 border-b border-border/40 bg-background px-6 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <div />
        <div />
        {headerCols.map((c) => (
          <SortHeader
            key={c.key}
            label={c.label}
            colKey={c.key}
            sort={sort}
            onSort={onHeaderClick}
            sortable={sortable}
            align={c.align}
          />
        ))}
        <div />
        </div>
        {sorted.map((track) => {
          const playing = currentTrack?.id === track.id;
          const plays = playCounts.get(track.id) ?? 0;
          return (
            <div
              key={track.id}
              className={cn(
                "group grid grid-cols-[44px_36px_minmax(0,3fr)_minmax(0,2fr)_minmax(0,2fr)_64px_80px_60px_60px_44px] items-center gap-3 px-6 py-1.5 transition-colors",
                playing
                  ? "now-playing-glow"
                  : "hover:bg-foreground/[0.04]"
              )}
              onDoubleClick={() => playTrack(track.id, ids)}
            >
              <div className="flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 data-[playing=true]:opacity-100"
                  data-playing={playing}
                  onClick={() => {
                    if (playing) togglePlay();
                    else playTrack(track.id, ids);
                  }}
                >
                  {playing && isPlaying ? (
                    <Pause className="h-4 w-4 text-rose-400" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <CoverArt
                trackId={track.id}
                hasCover={track.has_cover}
                size={36}
                className="rounded-md shadow-sm"
              />
              <div className="min-w-0">
                <div
                  className={cn(
                    "truncate text-sm font-medium",
                    playing && "text-rose-400"
                  )}
                >
                  {track.title}
                  {track.source === "remote" && (
                    <Cloud className="ml-1 inline h-3 w-3 text-muted-foreground" />
                  )}
                  {track.missing && (
                    <AlertCircle className="ml-1 inline h-3 w-3 text-destructive" />
                  )}
                </div>
              </div>

              <div className="truncate text-sm text-muted-foreground">
                {track.artist}
              </div>
              <div className="truncate text-sm text-muted-foreground">
                {track.album}
              </div>
              <div className="truncate text-xs uppercase tracking-wide text-muted-foreground/80">
                {track.format ?? ""}
              </div>
              <div className="text-right text-xs tabular-nums text-muted-foreground/80">
                {formatBytes(track.file_size ?? undefined)}
              </div>
              <div className="text-right text-sm tabular-nums text-muted-foreground">
                {formatTime(track.duration_ms ?? 0)}
              </div>
              <div className="text-right text-sm tabular-nums text-muted-foreground">
                {plays || ""}
              </div>

              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={async () => {
                        await api.addToQueue(track.id);
                        toast({ title: t("action.addToQueue") });
                      }}
                    >
                      <ListPlus className="h-4 w-4" /> {t("action.addToQueue")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditing(track)}>
                      <Pencil className="h-4 w-4" /> {t("action.editInfo")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={async () => {
                        const queue = (await api.getQueue()).map((q) => q.id);
                        await api.setQueue(queue.filter((id) => id !== track.id));
                        toast({ title: t("action.removeFromQueue") });
                      }}
                    >
                      {t("action.removeFromQueue")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <MetadataEditor
          track={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </div>
  );
}

function SortHeader({
  label,
  colKey,
  sort,
  onSort,
  sortable,
  align,
}: {
  label: string;
  colKey: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSort: (k: SortKey) => void;
  sortable: boolean;
  align?: "right";
}) {
  const active = sort.key === colKey;
  return (
    <button
      disabled={!sortable}
      onClick={() => sortable && onSort(colKey)}
      className={cn(
        "flex items-center gap-1 transition-colors",
        align === "right" && "justify-end",
        sortable && "hover:text-foreground",
        active && "text-foreground",
        !sortable && "cursor-default"
      )}
    >
      {label}
      {sortable && active && (
        sort.dir === "asc" ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )
      )}
    </button>
  );
}

function compare(
  a: Track,
  b: Track,
  key: SortKey,
  playCounts: Map<string, number>
): number {
  switch (key) {
    case "title":
      return a.title.localeCompare(b.title);
    case "artist":
      return a.artist.localeCompare(b.artist);
    case "album":
      return a.album.localeCompare(b.album);
    case "format":
      return (a.format ?? "").localeCompare(b.format ?? "");
    case "size":
      return (a.file_size ?? 0) - (b.file_size ?? 0);
    case "duration":
      return (a.duration_ms ?? 0) - (b.duration_ms ?? 0);
    case "plays":
      return (
        (playCounts.get(a.id) ?? 0) - (playCounts.get(b.id) ?? 0)
      );
    case "added":
      return a.added_at - b.added_at;
  }
}
