import { useMemo } from "react";
import { ChevronLeft, Disc3 } from "lucide-react";
import { usePlayer } from "@/store/player";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { CoverArt } from "@/components/CoverArt";
import { TrackList } from "@/components/TrackList";
import {
  deriveAlbums,
  parseAlbumKey,
  tracksForAlbum,
} from "@/lib/grouping";
import { formatTime } from "@/lib/utils";

export function AlbumsView() {
  const t = useT();
  const tracks = usePlayer((s) => s.tracks);
  const selectedAlbumKey = usePlayer((s) => s.selectedAlbumKey);
  const setSelectedAlbumKey = usePlayer((s) => s.setSelectedAlbumKey);

  const albums = useMemo(() => deriveAlbums(tracks), [tracks]);

  if (selectedAlbumKey) {
    return (
      <AlbumDetail
        keyValue={selectedAlbumKey}
        tracks={tracks}
        onBack={() => setSelectedAlbumKey(null)}
        backLabel={t("action.back")}
        trackCountLabel={(n) => t("page.albums.trackCount", { n })}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <header className="flex shrink-0 items-end justify-between gap-4 px-8 pt-[calc(var(--titlebar-height)+12px)] pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("page.albums.title")}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("page.albums.count", { n: albums.length })}
          </p>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-20">
        {albums.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t("page.albums.empty")}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-x-5 gap-y-7">
            {albums.map((a) => (
              <button
                key={a.key}
                onClick={() => setSelectedAlbumKey(a.key)}
                className="group text-left"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl bg-foreground/[0.06] shadow-sm transition-transform group-hover:-translate-y-0.5 group-hover:shadow-lg">
                  {a.coverTrackId ? (
                    <CoverArt
                      trackId={a.coverTrackId}
                      hasCover
                      size={256}
                      className="!h-full !w-full rounded-xl"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Disc3 className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="mt-2 truncate text-sm font-medium">{a.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {a.artist}
                  {a.year ? ` · ${a.year}` : ""}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AlbumDetail({
  keyValue,
  tracks,
  onBack,
  backLabel,
  trackCountLabel,
}: {
  keyValue: string;
  tracks: import("@/types").Track[];
  onBack: () => void;
  backLabel: string;
  trackCountLabel: (n: number) => string;
}) {
  const { name, artist } = parseAlbumKey(keyValue);
  const albumTracks = useMemo(
    () => tracksForAlbum(tracks, keyValue),
    [tracks, keyValue]
  );

  const totalMs = albumTracks.reduce(
    (acc, t) => acc + (t.duration_ms ?? 0),
    0
  );
  const year = albumTracks.find((t) => t.year)?.year ?? null;
  const coverId = albumTracks.find((t) => t.has_cover)?.id;

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <header className="flex shrink-0 items-end gap-5 px-8 pt-[calc(var(--titlebar-height)+12px)] pb-5">
        <CoverArt
          trackId={coverId}
          hasCover={!!coverId}
          size={160}
          className="h-40 w-40 rounded-2xl shadow-lg"
        />
        <div className="min-w-0 flex-1 pb-1">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-2 h-7 rounded-full text-muted-foreground"
            onClick={onBack}
          >
            <ChevronLeft className="h-4 w-4" /> {backLabel}
          </Button>
          <h1 className="truncate text-3xl font-bold tracking-tight">{name}</h1>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {artist}
            {year ? ` · ${year}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground/80">
            {trackCountLabel(albumTracks.length)} · {formatTime(totalMs)}
          </p>
        </div>
      </header>

      <TrackList tracks={albumTracks} />
    </div>
  );
}
