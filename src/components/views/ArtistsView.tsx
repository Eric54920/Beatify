import { useEffect, useMemo, useState } from "react";
import {
  Disc3,
  ListPlus,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  User,
} from "lucide-react";
import { usePlayer } from "@/store/player";
import { useT } from "@/lib/i18n";
import { CoverArt } from "@/components/CoverArt";
import { MetadataEditor } from "@/components/MetadataEditor";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  deriveArtists,
  tracksForArtist,
  type ArtistGroup,
} from "@/lib/grouping";
import { cn, formatTime } from "@/lib/utils";
import type { Track } from "@/types";

interface AlbumSection {
  album: string;
  year: number | null;
  coverTrackId?: string;
  tracks: Track[];
}

function groupTracksByAlbum(tracks: Track[]): AlbumSection[] {
  const map = new Map<string, AlbumSection>();
  for (const t of tracks) {
    let entry = map.get(t.album);
    if (!entry) {
      entry = {
        album: t.album,
        year: t.year ?? null,
        coverTrackId: t.has_cover ? t.id : undefined,
        tracks: [],
      };
      map.set(t.album, entry);
    }
    if (!entry.coverTrackId && t.has_cover) entry.coverTrackId = t.id;
    if (!entry.year && t.year) entry.year = t.year;
    entry.tracks.push(t);
  }
  return [...map.values()];
}

export function ArtistsView() {
  const t = useT();
  const tracks = usePlayer((s) => s.tracks);
  const selectedArtist = usePlayer((s) => s.selectedArtist);
  const setSelectedArtist = usePlayer((s) => s.setSelectedArtist);

  const artists = useMemo(() => deriveArtists(tracks), [tracks]);

  useEffect(() => {
    if (artists.length === 0) {
      if (selectedArtist) setSelectedArtist(null);
      return;
    }
    if (!selectedArtist || !artists.find((a) => a.name === selectedArtist)) {
      setSelectedArtist(artists[0].name);
    }
  }, [artists, selectedArtist, setSelectedArtist]);

  const albumSections = useMemo<AlbumSection[]>(() => {
    if (!selectedArtist) return [];
    const groups = groupTracksByAlbum(tracksForArtist(tracks, selectedArtist));
    // Newest year first; albums without a year fall to the bottom but stay grouped together.
    return groups.sort((a, b) => {
      if (a.year == null && b.year == null) return a.album.localeCompare(b.album);
      if (a.year == null) return 1;
      if (b.year == null) return -1;
      return b.year - a.year;
    });
  }, [tracks, selectedArtist]);

  const currentArtist =
    artists.find((a) => a.name === selectedArtist) ?? null;
  const totalTracks = albumSections.reduce(
    (acc, s) => acc + s.tracks.length,
    0
  );
  // Flat list of every track for this artist in the visible order (album by year, then track number).
  // Used as the playback context so list-loop / next() can flow across albums in the displayed order.
  const allArtistTracks = useMemo<Track[]>(
    () => albumSections.flatMap((s) => s.tracks),
    [albumSections]
  );

  return (
    <div className="flex flex-1 min-h-0 min-w-0">
      <ArtistList
        artists={artists}
        selected={selectedArtist}
        onSelect={setSelectedArtist}
        title={t("page.artists.title")}
        countLabel={t("page.artists.count", { n: artists.length })}
        emptyLabel={t("page.artists.empty")}
      />

      <section className="relative flex flex-1 flex-col min-h-0 min-w-0">
        {currentArtist ? (
          <>
            <ArtistDetailHeader
              artist={currentArtist}
              subtitle={t("page.artists.albumsTracks", {
                albums: albumSections.length,
                tracks: totalTracks,
              })}
            />
            <div className="flex-1 min-h-0 overflow-y-auto pb-20">
              {albumSections.map((section) => (
                <AlbumSectionRow
                  key={section.album}
                  section={section}
                  contextTracks={allArtistTracks}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center px-8 pt-[calc(var(--titlebar-height)+12px)] text-sm text-muted-foreground">
            {t("page.artists.empty")}
          </div>
        )}
      </section>
    </div>
  );
}

function ArtistList({
  artists,
  selected,
  onSelect,
  title,
  countLabel,
  emptyLabel,
}: {
  artists: ArtistGroup[];
  selected: string | null;
  onSelect: (name: string) => void;
  title: string;
  countLabel: string;
  emptyLabel: string;
}) {
  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-border/50 bg-foreground/[0.02]">
      <header className="px-5 pt-[calc(var(--titlebar-height)+12px)] pb-3">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{countLabel}</p>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-20">
        {artists.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          artists.map((a) => {
            const active = selected === a.name;
            return (
              <button
                key={a.name}
                onClick={() => onSelect(a.name)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
                  active
                    ? "bg-foreground/[0.08]"
                    : "hover:bg-foreground/[0.04]"
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground/[0.06]">
                  {a.coverTrackId ? (
                    <CoverArt
                      trackId={a.coverTrackId}
                      hasCover
                      size={36}
                      className="!h-full !w-full rounded-full"
                    />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{a.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {a.trackCount}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

function ArtistDetailHeader({
  artist,
  subtitle,
}: {
  artist: ArtistGroup;
  subtitle: string;
}) {
  return (
    <header className="flex shrink-0 flex-col px-8 pt-[calc(var(--titlebar-height)+12px)] pb-5">
      <h2 className="truncate text-3xl font-bold tracking-tight">
        {artist.name}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </header>
  );
}

function AlbumSectionRow({
  section,
  contextTracks,
}: {
  section: AlbumSection;
  contextTracks: Track[];
}) {
  const t = useT();
  return (
    <section className="border-t border-border/40 px-6 py-4 first:border-t-0">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-foreground/[0.06]">
          {section.coverTrackId ? (
            <CoverArt
              trackId={section.coverTrackId}
              hasCover
              size={48}
              className="!h-full !w-full rounded-md"
            />
          ) : (
            <Disc3 className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{section.album}</div>
          <div className="text-[11px] text-muted-foreground">
            {section.year ? `${section.year} · ` : ""}
            {t("page.albums.trackCount", { n: section.tracks.length })}
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        {section.tracks.map((track, idx) => (
          <CompactTrackRow
            key={track.id}
            track={track}
            contextTracks={contextTracks}
            index={idx}
          />
        ))}
      </div>
    </section>
  );
}

function CompactTrackRow({
  track,
  contextTracks,
  index,
}: {
  track: Track;
  contextTracks: Track[];
  index: number;
}) {
  const t = useT();
  const { toast } = useToast();
  const currentTrack = usePlayer((s) => s.currentTrack);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const playTrack = usePlayer((s) => s.playTrack);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const [editing, setEditing] = useState(false);

  const playing = currentTrack?.id === track.id;
  const ids = contextTracks.map((tr) => tr.id);

  return (
    <div
      onDoubleClick={() => playTrack(track.id, ids)}
      className={cn(
        "group grid grid-cols-[28px_minmax(0,1fr)_56px_28px] items-center gap-3 rounded-md px-2 py-1.5 transition-colors",
        playing ? "bg-foreground/[0.06]" : "hover:bg-foreground/[0.04]"
      )}
    >
      <button
        onClick={() => (playing ? togglePlay() : playTrack(track.id, ids))}
        className="flex h-7 w-7 items-center justify-center text-muted-foreground"
      >
        <span
          className={cn(
            "text-xs tabular-nums",
            playing ? "text-rose-400" : "text-muted-foreground/70",
            "group-hover:hidden"
          )}
        >
          {playing && isPlaying ? "♪" : index + 1}
        </span>
        <span className="hidden group-hover:inline-flex">
          {playing && isPlaying ? (
            <Pause className="h-4 w-4 text-foreground" />
          ) : (
            <Play className="h-4 w-4 text-foreground" />
          )}
        </span>
      </button>
      <div
        className={cn(
          "truncate text-sm",
          playing && "font-medium text-rose-400"
        )}
      >
        {track.title}
      </div>
      <div className="text-right text-xs tabular-nums text-muted-foreground">
        {formatTime(track.duration_ms ?? 0)}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
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
          <DropdownMenuItem onClick={() => setEditing(true)}>
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

      {editing && (
        <MetadataEditor
          track={track}
          open={editing}
          onOpenChange={(o) => !o && setEditing(false)}
        />
      )}
    </div>
  );
}
