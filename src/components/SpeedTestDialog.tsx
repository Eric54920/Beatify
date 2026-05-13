import { useEffect, useRef, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Activity } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n";

const MAX_SAMPLES = 16;
const GRID_LINES = 4;

function formatSpeed(kbps: number): string {
  if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} MB/s`;
  return `${kbps.toFixed(0)} KB/s`;
}

function SpeedChart({ samples }: { samples: number[] }) {
  const W = 400;
  const H = 80;
  const PAD = { top: 6, right: 8, bottom: 4, left: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...samples, 1);
  const ceil = maxVal * 1.2;

  const xOf = (i: number) =>
    PAD.left + (i / (MAX_SAMPLES - 1)) * innerW;
  const yOf = (v: number) =>
    PAD.top + innerH - (v / ceil) * innerH;

  const points = samples
    .map((v, i) => `${xOf(i)},${yOf(v)}`)
    .join(" ");

  const areaPoints =
    points +
    ` ${xOf(samples.length - 1)},${H - PAD.bottom} ${xOf(0)},${H - PAD.bottom}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: H }}
      preserveAspectRatio="none"
    >
      {/* Grid lines */}
      {Array.from({ length: GRID_LINES }).map((_, i) => {
        const y = PAD.top + (innerH / GRID_LINES) * i;
        return (
          <line
            key={i}
            x1={PAD.left}
            y1={y}
            x2={W - PAD.right}
            y2={y}
            className="stroke-border/40"
            strokeWidth={0.5}
          />
        );
      })}

      {samples.length > 1 && (
        <>
          {/* Area fill */}
          <polygon
            points={areaPoints}
            className="fill-rose-500/10"
          />
          {/* Line */}
          <polyline
            points={points}
            className="stroke-rose-400"
            fill="none"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Last point dot */}
          <circle
            cx={xOf(samples.length - 1)}
            cy={yOf(samples[samples.length - 1])}
            r={2.5}
            className="fill-rose-400"
          />
        </>
      )}
    </svg>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  folderPath?: string;
  sourceId?: number;
  title: string;
}

export function SpeedTestDialog({
  open,
  onOpenChange,
  folderPath,
  sourceId,
  title,
}: Props) {
  const t = useT();
  const [samples, setSamples] = useState<number[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<{ peak: number; avg: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const unlistenRef = useRef<UnlistenFn | null>(null);

  const current = samples[samples.length - 1] ?? 0;

  const start = async () => {
    setSamples([]);
    setResult(null);
    setErrorMsg("");
    setStatus("running");

    unlistenRef.current = await listen<{ speed_kbps: number; idx: number }>(
      "speed:sample",
      (e) => {
        setSamples((prev) => {
          const next = [...prev, e.payload.speed_kbps];
          return next.length > MAX_SAMPLES ? next.slice(-MAX_SAMPLES) : next;
        });
      }
    );

    try {
      const r = await api.speedTestSource({ folderPath, sourceId });
      setResult({ peak: r.peak_kbps, avg: r.avg_kbps });
      setStatus("done");
    } catch (e: any) {
      setErrorMsg(e?.toString() ?? "Unknown error");
      setStatus("error");
    } finally {
      unlistenRef.current?.();
      unlistenRef.current = null;
    }
  };

  useEffect(() => {
    if (open) {
      start();
    } else {
      unlistenRef.current?.();
      unlistenRef.current = null;
      setSamples([]);
      setStatus("idle");
      setResult(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-rose-400" />
            {t("speedtest.title")} · {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Chart area */}
          <div className="rounded-xl border bg-card p-3">
            {samples.length === 0 ? (
              <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">
                {status === "running"
                  ? t("speedtest.measuring")
                  : t("speedtest.waiting")}
              </div>
            ) : (
              <SpeedChart samples={samples} />
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat
              label={t("speedtest.current")}
              value={samples.length > 0 ? formatSpeed(current) : "—"}
              highlight={status === "running"}
            />
            <Stat
              label={t("speedtest.peak")}
              value={result ? formatSpeed(result.peak) : samples.length > 0 ? formatSpeed(Math.max(...samples)) : "—"}
            />
            <Stat
              label={t("speedtest.avg")}
              value={result ? formatSpeed(result.avg) : "—"}
            />
          </div>

          {status === "error" && (
            <p className="text-xs text-destructive">{errorMsg}</p>
          )}

          <div className="flex justify-end gap-2">
            {status === "done" || status === "error" ? (
              <Button size="sm" variant="outline" onClick={start}>
                {t("speedtest.retest")}
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
              {t("action.cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card px-2 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div
        className={`mt-0.5 text-sm font-semibold tabular-nums ${
          highlight ? "text-rose-400" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
