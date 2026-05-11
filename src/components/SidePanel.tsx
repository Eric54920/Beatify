import { useEffect, useMemo, useState } from "react";
import { Clock4, ListPlus, X } from "lucide-react";
import { usePlayer } from "@/store/player";
import { Button } from "@/components/ui/button";
import { TrackList } from "@/components/TrackList";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { useT } from "@/lib/i18n";

export function SidePanel() {
  const open = usePlayer((s) => s.panelOpen);
  const closePanel = usePlayer((s) => s.closePanel);
  const queue = usePlayer((s) => s.queue);
  const history = usePlayer((s) => s.history);
  const currentTrack = usePlayer((s) => s.currentTrack);
  const refreshHistory = usePlayer((s) => s.refreshHistory);
  const { toast } = useToast();
  const confirm = useConfirm();
  const t = useT();

  // Keep the panel mounted briefly while it slides out.
  const [visible, setVisible] = useState(open);
  useEffect(() => {
    if (open) setVisible(true);
    else {
      const id = setTimeout(() => setVisible(false), 220);
      return () => clearTimeout(id);
    }
  }, [open]);

  // Dedupe history (keep most recent play per track).
  const historyTracks = useMemo(() => {
    const seen = new Set<string>();
    const out = [];
    for (const h of history) {
      if (!seen.has(h.track.id)) {
        seen.add(h.track.id);
        out.push(h.track);
      }
    }
    return out;
  }, [history]);

  // Up Next = queue items after the currently playing track. If we can't locate
  // the current track in the queue, fall back to the whole queue.
  const upNext = useMemo(() => {
    if (!currentTrack) return queue;
    const idx = queue.findIndex((x) => x.id === currentTrack.id);
    return idx >= 0 ? queue.slice(idx + 1) : queue;
  }, [queue, currentTrack]);

  if (!visible) return null;

  return (
    <aside
      className={`${
        open ? "panel-enter" : "panel-exit"
      } flex h-full w-[380px] shrink-0 flex-col border-l bg-[hsl(var(--panel))]`}
    >
      <header className="flex items-center justify-between gap-3 px-5 pt-[calc(var(--titlebar-height)+12px)] pb-3">
        <div className="flex items-center gap-2">
          <ListPlus className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">{t("side.combined.title")}</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={closePanel}
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex flex-1 flex-col min-h-0">
        {/* Recently Played — top half */}
        <SectionHeader
          icon={<Clock4 className="h-3.5 w-3.5" />}
          title={t("side.history.title")}
          count={historyTracks.length}
          actionLabel={t("action.clear")}
          actionDisabled={!history.length}
          onAction={async () => {
            const ok = await confirm({
              title: t("confirm.clearHistory.title"),
              description: t("confirm.clearHistory.description"),
              confirmText: t("action.clear"),
              destructive: true,
            });
            if (!ok) return;
            await api.clearHistory();
            await refreshHistory();
            toast({ title: t("action.clear") });
          }}
        />
        <div className="min-h-0 flex-1 basis-0 overflow-hidden">
          <TrackList
            variant="compact"
            tracks={historyTracks}
            emptyHint={t("side.history.empty")}
          />
        </div>

        {/* Up Next — bottom half */}
        <div className="border-t border-border/40">
          <SectionHeader
            icon={<ListPlus className="h-3.5 w-3.5" />}
            title={t("side.queue.title")}
            count={upNext.length}
            actionLabel={t("action.clear")}
            actionDisabled={!queue.length}
            onAction={async () => {
              const ok = await confirm({
                title: t("confirm.clearQueue.title"),
                description: t("confirm.clearQueue.description"),
                confirmText: t("action.clear"),
                destructive: true,
              });
              if (!ok) return;
              await api.clearQueue();
              toast({ title: t("action.clear") });
            }}
          />
        </div>
        <div className="min-h-0 flex-1 basis-0 overflow-hidden">
          <TrackList
            variant="compact"
            tracks={upNext}
            contextIds={queue.map((tr) => tr.id)}
            emptyHint={t("side.queue.empty")}
          />
        </div>
      </div>
    </aside>
  );
}

function SectionHeader({
  icon,
  title,
  count,
  actionLabel,
  actionDisabled,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  actionLabel: string;
  actionDisabled?: boolean;
  onAction: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      <span className="flex items-center gap-2">
        {icon}
        {title}
        <span className="rounded-full bg-foreground/10 px-1.5 py-px text-[10px] tabular-nums text-foreground/70">
          {count}
        </span>
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-[11px]"
        disabled={actionDisabled}
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </div>
  );
}
