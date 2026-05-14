import { useMemo } from "react";
import { Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TrackList } from "@/components/TrackList";
import { usePlayer } from "@/store/player";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/lib/i18n";

export function LibraryView() {
  const t = useT();
  const { tracks, search, setSearch } = usePlayer();
  const { toast } = useToast();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter(
      (tr) =>
        tr.title.toLowerCase().includes(q) ||
        tr.artist.toLowerCase().includes(q) ||
        tr.album.toLowerCase().includes(q)
    );
  }, [tracks, search]);

  const remoteCount = tracks.filter((tr) => tr.source === "remote").length;

  const onRescan = async () => {
    try {
      const local = await api.rescanLibrary();
      const remote = await api.syncAllRemoteSources();
      toast({
        title: t("action.syncDone"),
        description: t("action.syncDoneDesc", { local, remote }),
      });
    } catch (e: any) {
      toast({ title: t("action.syncFailed"), description: e?.toString() });
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <header className="flex shrink-0 items-end justify-between gap-4 px-8 pt-[calc(var(--titlebar-height)+12px)] pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("page.library.title")}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("page.library.tracks", { n: tracks.length })}
            {remoteCount > 0 && (
              <> {t("page.library.remoteSuffix", { n: remoteCount })}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search.placeholder")}
              className="h-9 rounded-full border-transparent bg-foreground/[0.06] pl-9 focus-visible:ring-1"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={onRescan}
            title={t("action.sync")}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <TrackList
        sortable
        tracks={filtered}
        emptyHint={
          tracks.length === 0
            ? t("page.library.empty")
            : t("page.library.noMatch")
        }
      />
    </div>
  );
}
