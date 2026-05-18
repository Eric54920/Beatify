import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { usePlayer } from "@/store/player";
import { useSettings } from "@/store/settings";
import { api } from "@/lib/api";
import type { Lyrics } from "@/types";
import { CoverArt } from "@/components/CoverArt";
import { Button } from "@/components/ui/button";
import { cn, formatTime } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const NON_DRAG =
  "button, input, textarea, select, a, [role='button'], [role='slider'], [data-no-drag]";

function startWindowDrag(e: React.MouseEvent | React.PointerEvent) {
  if ((e as React.MouseEvent).button !== 0) return;
  const target = e.target as HTMLElement | null;
  if (!target) return;
  if (target.closest(NON_DRAG)) return;
  // Fire-and-forget: must run synchronously while the gesture is still live.
  getCurrentWindow().startDragging().catch(() => {});
}

export function LyricsOverlay() {
  const open = usePlayer((s) => s.lyricsOpen);
  const close = usePlayer((s) => s.closeLyrics);
  const currentTrack = usePlayer((s) => s.currentTrack);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const positionMs = usePlayer((s) => s.positionMs);
  const durationMs = usePlayer((s) => s.durationMs);
  const volume = usePlayer((s) => s.volume);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const previous = usePlayer((s) => s.previous);
  const seek = usePlayer((s) => s.seek);
  const setVolume = usePlayer((s) => s.setVolume);
  const loadCover = usePlayer((s) => s.loadCover);
  const coverCached = usePlayer((s) =>
    currentTrack ? s.coverArtCache[currentTrack.id] : null
  );

  const shuffle = useSettings((s) => s.shuffle);
  const repeat = useSettings((s) => s.repeat);
  const toggleShuffle = useSettings((s) => s.toggleShuffle);
  const cycleRepeat = useSettings((s) => s.cycleRepeat);

  const t = useT();

  const [visible, setVisible] = useState(open);
  useEffect(() => {
    if (open) setVisible(true);
    else {
      const id = setTimeout(() => setVisible(false), 320);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open && currentTrack?.has_cover) {
      loadCover(currentTrack.id);
    }
  }, [open, currentTrack?.id, currentTrack?.has_cover, loadCover]);

  // Fetch lyrics per track.
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  useEffect(() => {
    if (!currentTrack) {
      setLyrics(null);
      return;
    }
    let cancelled = false;
    setLoadingLyrics(true);
    api
      .getLyrics(currentTrack.id)
      .then((res) => {
        if (!cancelled) setLyrics(res);
      })
      .catch(() => {
        if (!cancelled) setLyrics(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingLyrics(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id]);

  const activeIdx = useMemo(() => {
    if (!lyrics?.synced) return -1;
    let idx = -1;
    for (let i = 0; i < lyrics.lines.length; i++) {
      const time = lyrics.lines[i].time_ms;
      if (time == null) break;
      if (time <= positionMs) idx = i;
      else break;
    }
    return idx;
  }, [lyrics, positionMs]);

  const hasLyrics = !!(lyrics && lyrics.lines.length > 0);
  // Right pane is shown while we look the lyrics up too, so the layout doesn't flicker.
  const showRightPane = !!currentTrack && (loadingLyrics || hasLyrics);

  const onSeekToLine = useCallback((timeMs: number | null) => {
    if (timeMs != null) seek(timeMs);
  }, [seek]);

  const [scrubbing, setScrubbing] = useState<number | null>(null);
  const sliderValue = scrubbing ?? positionMs;
  const muted = volume === 0;
  const [lastVolume, setLastVolume] = useState(volume);
  useEffect(() => {
    if (volume > 0) setLastVolume(volume);
  }, [volume]);

  if (!visible) return null;

  return (
    <div
      data-tauri-drag-region
      onMouseDown={startWindowDrag}
      className={cn(
        "fixed inset-0 z-50 flex h-full w-full overflow-hidden bg-background",
        open ? "lyrics-enter" : "lyrics-exit"
      )}
    >
      {/* Blurred cover background */}
      <div className="pointer-events-none absolute inset-0">
        {coverCached ? (
          <img
            src={coverCached}
            alt=""
            className="absolute inset-0 h-full w-full scale-125 object-cover blur-[100px] saturate-150"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-rose-900/40 via-fuchsia-900/30 to-indigo-900/40" />
        )}
        <div className="absolute inset-0 bg-black/55" />
      </div>

      {/* Close button (top-right) */}
      <Button
        data-no-drag
        variant="ghost"
        size="icon"
        onClick={close}
        title={t("lyrics.close")}
        className="absolute right-4 top-[calc(var(--titlebar-height)+8px)] z-30 h-9 w-9 rounded-full bg-white/[0.06] text-white/80 hover:bg-white/[0.12] hover:text-white"
      >
        <ChevronDown className="h-5 w-5" />
      </Button>

      {/* Content */}
      <div className="relative z-20 flex h-full w-full text-white">
        {/* LEFT — cover, info, controls */}
        <section
          className={cn(
            "flex flex-col items-center justify-center gap-7 px-12 pt-[calc(var(--titlebar-height)+24px)] pb-12",
            showRightPane
              ? "w-[42%] min-w-[360px] shrink-0"
              : "mx-auto w-full max-w-[560px]"
          )}
        >
          <div className="aspect-square w-full max-w-[340px] overflow-hidden rounded-2xl bg-white/[0.06] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
            {currentTrack ? (
              <CoverArt
                trackId={currentTrack.id}
                hasCover={currentTrack.has_cover}
                size={340}
                className="!h-full !w-full rounded-2xl"
              />
            ) : null}
          </div>

          <div className="w-full max-w-[420px] text-center">
            <div className="truncate text-2xl font-bold leading-tight">
              {currentTrack?.title ?? t("common.nothingPlaying")}
            </div>
            <div className="mt-1 truncate text-sm text-white/70">
              {currentTrack
                ? `${currentTrack.artist}${currentTrack.album ? ` — ${currentTrack.album}` : ""}`
                : t("common.startHint")}
            </div>
          </div>

          {/* Scrubber */}
          <div className="w-full max-w-[420px]">
            <LightSlider
              value={sliderValue}
              max={Math.max(durationMs, 1)}
              disabled={!currentTrack}
              onChange={setScrubbing}
              onCommit={(v) => {
                setScrubbing(null);
                seek(v);
              }}
            />
            <div className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums text-white/60">
              <span>{formatTime(sliderValue)}</span>
              <span>{formatTime(durationMs)}</span>
            </div>
          </div>

          {/* Transport */}
          <div className="flex items-center gap-5" data-no-drag>
            <button
              onClick={toggleShuffle}
              className={cn(
                "rounded-full p-2 text-white/70 transition hover:bg-white/[0.08] hover:text-white",
                shuffle && "bg-white/[0.12] text-white"
              )}
              title={shuffle ? t("tooltip.shuffleOn") : t("tooltip.shuffleOff")}
            >
              <Shuffle className="h-5 w-5" />
            </button>
            <button
              onClick={previous}
              className="rounded-full p-2 text-white hover:bg-white/[0.08]"
              title={t("tooltip.previous")}
            >
              <SkipBack className="h-6 w-6 fill-current" />
            </button>
            <button
              onClick={togglePlay}
              disabled={!currentTrack}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
              title={isPlaying ? t("tooltip.pause") : t("tooltip.play")}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 fill-current" />
              ) : (
                <Play className="ml-0.5 h-6 w-6 fill-current" />
              )}
            </button>
            <button
              onClick={next}
              className="rounded-full p-2 text-white hover:bg-white/[0.08]"
              title={t("tooltip.next")}
            >
              <SkipForward className="h-6 w-6 fill-current" />
            </button>
            <button
              onClick={cycleRepeat}
              className={cn(
                "rounded-full p-2 text-white/70 transition hover:bg-white/[0.08] hover:text-white",
                repeat !== "off" && "bg-white/[0.12] text-white"
              )}
              title={
                repeat === "off"
                  ? t("tooltip.repeatOff")
                  : repeat === "all"
                  ? t("tooltip.repeatAll")
                  : t("tooltip.repeatOne")
              }
            >
              {repeat === "one" ? (
                <Repeat1 className="h-5 w-5" />
              ) : (
                <Repeat className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Volume */}
          <div className="flex w-full max-w-[280px] items-center gap-3">
            <button
              onClick={() => setVolume(muted ? lastVolume || 0.5 : 0)}
              className="text-white/70 hover:text-white"
              title={muted ? t("tooltip.unmute") : t("tooltip.mute")}
            >
              {muted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <div className="flex-1">
              <LightSlider
                value={volume}
                max={1}
                step={0.01}
                onChange={(v) => setVolume(v)}
              />
            </div>
          </div>
        </section>

        {/* RIGHT — scrolling lyrics (hidden when track has no lyrics so the left pane can center) */}
        {showRightPane && (
          <section className="relative flex-1 overflow-hidden">
            {loadingLyrics ? (
              <LyricsEmpty text="…" />
            ) : hasLyrics ? (
              <LyricsList
                lyrics={lyrics!}
                activeIdx={activeIdx}
                onSeekToLine={onSeekToLine}
              />
            ) : null}
          </section>
        )}
      </div>
    </div>
  );
}

function LyricsEmpty({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center px-12 text-center text-lg text-white/60">
      {text}
    </div>
  );
}

/**
 * Transform-based smooth lyrics scroller. We never touch native `scrollTop` —
 * instead a single CSS transform on the inner column moves all lines together
 * in one GPU-accelerated transition.
 */
function LyricsList({
  lyrics,
  activeIdx,
  onSeekToLine,
}: {
  lyrics: Lyrics;
  activeIdx: number;
  onSeekToLine: (timeMs: number | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const isManualRef = useRef(false);
  const manualDeltaRef = useRef(0);
  const autoOffsetRef = useRef(0);
  const resumeRef = useRef<ReturnType<typeof setTimeout>>();

  // Direct DOM write — zero React re-render during scroll
  const applyTransform = useCallback((animated: boolean) => {
    const el = innerRef.current;
    if (!el) return;
    el.style.transition = animated
      ? "transform 1200ms cubic-bezier(0.4, 0, 0.2, 1)"
      : "none";
    el.style.transform = `translate3d(0, ${autoOffsetRef.current + manualDeltaRef.current}px, 0)`;
  }, []);

  const calcAuto = useCallback(() => {
    const container = containerRef.current;
    if (!container || activeIdx < 0) return 0;
    const line = lineRefs.current.get(activeIdx);
    if (!line) return 0;
    return container.clientHeight / 2 - (line.offsetTop + line.offsetHeight / 2);
  }, [activeIdx]);

  // Keep a stable ref so the resume timeout always uses the latest active line
  const calcAutoRef = useRef(calcAuto);
  useEffect(() => { calcAutoRef.current = calcAuto; }, [calcAuto]);

  // When lyrics change (new song): snap to position immediately, reset manual state.
  useEffect(() => {
    isManualRef.current = false;
    manualDeltaRef.current = 0;
    autoOffsetRef.current = calcAutoRef.current();
    applyTransform(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lyrics, applyTransform]);

  // When active line changes: smooth animated scroll.
  // useEffect (not useLayoutEffect) so the browser has already painted the previous
  // position — CSS transition then correctly animates from that committed state.
  useEffect(() => {
    if (!isManualRef.current) {
      autoOffsetRef.current = calcAuto();
      applyTransform(true);
    }
  }, [calcAuto, applyTransform]);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (!isManualRef.current) {
        autoOffsetRef.current = calcAutoRef.current();
        applyTransform(false);
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    isManualRef.current = true;
    manualDeltaRef.current -= e.deltaY;
    applyTransform(false);

    clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(() => {
      isManualRef.current = false;
      manualDeltaRef.current = 0;
      autoOffsetRef.current = calcAutoRef.current();
      applyTransform(true);
    }, 3000);
  };

  const handleLineClick = useCallback((idx: number, timeMs: number | null) => {
    // Keep isManualRef.current = true so useLayoutEffect cannot override the
    // clicked-line position while the backend seek is still in flight.
    clearTimeout(resumeRef.current);
    manualDeltaRef.current = 0;
    isManualRef.current = true;
    const container = containerRef.current;
    const line = lineRefs.current.get(idx);
    if (container && line) {
      autoOffsetRef.current =
        container.clientHeight / 2 - (line.offsetTop + line.offsetHeight / 2);
      applyTransform(true);
    }
    onSeekToLine(timeMs);
    // Resume auto-scroll after the seek has had time to take effect.
    resumeRef.current = setTimeout(() => {
      isManualRef.current = false;
      manualDeltaRef.current = 0;
      autoOffsetRef.current = calcAutoRef.current();
      applyTransform(true);
    }, 2000);
  }, [applyTransform, onSeekToLine]);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className="h-full w-full overflow-hidden px-12 pt-[calc(var(--titlebar-height)+24px)]"
    >
      <div
        ref={innerRef}
        className="will-change-transform"
      >
        {lyrics.lines.map((line, idx) => {
          const active = idx === activeIdx;
          const distance = activeIdx < 0 ? 0 : Math.abs(idx - activeIdx);
          const opacity =
            activeIdx < 0
              ? 0.78
              : distance === 0
              ? 1
              : distance === 1
              ? 0.6
              : distance === 2
              ? 0.42
              : distance === 3
              ? 0.3
              : 0.22;
          return (
            <div
              key={idx}
              data-no-drag
              ref={(el) => {
                lineRefs.current.set(idx, el);
              }}
              onClick={() => handleLineClick(idx, line.time_ms)}
              className={cn(
                "origin-left cursor-pointer select-none py-4 text-3xl font-medium leading-snug text-white",
                active && "font-bold drop-shadow"
              )}
              style={{
                transform: active ? "scale(1.18)" : "scale(1)",
                opacity,
                transition:
                  "transform 1200ms cubic-bezier(0.4,0,0.2,1), opacity 1200ms cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              {line.text || " "}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * White/translucent slider tuned for the lyrics overlay.
 */
function LightSlider({
  value,
  max,
  step = 1,
  disabled,
  onChange,
  onCommit,
}: {
  value: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onChange?: (v: number) => void;
  onCommit?: (v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(false);

  const valueAtX = (x: number) => {
    if (!ref.current) return value;
    const rect = ref.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (x - rect.left) / rect.width));
    const v = ratio * max;
    if (step <= 0) return v;
    return Math.round(v / step) * step;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.button !== 0) return;
    setDragging(true);
    ref.current?.setPointerCapture(e.pointerId);
    onChange?.(valueAtX(e.clientX));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    onChange?.(valueAtX(e.clientX));
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    ref.current?.releasePointerCapture(e.pointerId);
    const v = valueAtX(e.clientX);
    onCommit?.(v);
  };

  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const tall = hover || dragging;

  return (
    <div
      ref={ref}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      data-no-drag
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        "flex h-3 w-full cursor-pointer items-center",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-white/15 transition-all",
          tall ? "h-[5px] bg-white/20" : "h-[3px]"
        )}
      >
        <div
          className="h-full rounded-full bg-white"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
