import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ListMusic,
  Mic2,
  Shuffle,
  Repeat,
  Repeat1,
} from "lucide-react";
import { usePlayer } from "@/store/player";
import { useSettings } from "@/store/settings";
import { Slider } from "@/components/ui/slider";
import { CoverArt } from "@/components/CoverArt";
import { cn, formatTime } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AudioWaveform } from "lucide-react";
import type { Track } from "@/types";

const LOSSLESS_FORMATS = new Set(["FLAC", "WAV", "AIFF", "APE", "ALAC"]);

function isLossless(track: Track): boolean {
  const fmt = (track.format ?? "").toUpperCase();
  if (LOSSLESS_FORMATS.has(fmt)) return true;
  // M4A container: ALAC (lossless) has bit_depth, AAC does not
  if (fmt === "M4A" && track.bit_depth != null) return true;
  return false;
}

function formatSampleRate(hz: number): string {
  return hz % 1000 === 0 ? `${hz / 1000} kHz` : `${(hz / 1000).toFixed(1)} kHz`;
}

export function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    positionMs,
    durationMs,
    volume,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    panelOpen,
    togglePanel,
    lyricsOpen,
    toggleLyrics,
  } = usePlayer();

  const [scrubbing, setScrubbing] = useState<number | null>(null);
  const [scrubHover, setScrubHover] = useState(false);
  const clearScrubTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [lastVolume, setLastVolume] = useState(volume);
  const t = useT();
  const shuffle = useSettings((s) => s.shuffle);
  const repeat = useSettings((s) => s.repeat);
  const toggleShuffle = useSettings((s) => s.toggleShuffle);
  const cycleRepeat = useSettings((s) => s.cycleRepeat);

  useEffect(() => {
    if (volume > 0) setLastVolume(volume);
  }, [volume]);

  const sliderValue = scrubbing != null ? scrubbing : positionMs;
  const muted = volume === 0;
  const scrubActive = scrubHover || scrubbing !== null;

  return (
    <div data-no-drag className="absolute inset-x-0 bottom-0 z-30 px-3 py-2">
      <div className="glass-floating overflow-hidden rounded-full">
        <div className="flex items-center gap-2 px-4 py-1.5">

          {/* ── Left: transport ── */}
          <div className="flex shrink-0 items-center gap-0.5">
            <IconBtn onClick={previous} title={t("tooltip.previous")} className="text-black hover:text-black">
              <SkipBack className="h-5 w-5 fill-current" />
            </IconBtn>
            <button
              onClick={togglePlay}
              disabled={!currentTrack}
              className="flex h-8 w-8 items-center justify-center rounded-full text-black transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
              title={isPlaying ? t("tooltip.pause") : t("tooltip.play")}
            >
              {isPlaying
                ? <Pause className="h-6 w-6 fill-current" />
                : <Play className="ml-0.5 h-6 w-6 fill-current" />}
            </button>
            <IconBtn onClick={next} title={t("tooltip.next")} className="text-black hover:text-black">
              <SkipForward className="h-5 w-5 fill-current" />
            </IconBtn>
          </div>

          {/* ── Center: cover + info + scrub ── */}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-2">

            {/* Cover + title / artist (blurs when scrubbing) */}
            <div
              className={cn(
                "flex items-center gap-2 transition-all duration-200",
                scrubActive && "pointer-events-none select-none opacity-30 blur-sm"
              )}
            >
              <CoverArt
                trackId={currentTrack?.id}
                hasCover={currentTrack?.has_cover}
                size={38}
                className="shrink-0 rounded-md shadow-sm"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14px] font-semibold leading-snug">
                  {currentTrack ? currentTrack.title : t("common.nothingPlaying")}
                </span>
                <span className="truncate text-[12px] leading-snug text-foreground/60">
                  {currentTrack
                    ? [currentTrack.artist, currentTrack.album].filter(Boolean).join(" · ")
                    : t("common.startHint")}
                </span>
              </div>
              {currentTrack && isLossless(currentTrack) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="shrink-0 cursor-default text-emerald-400 transition-opacity hover:opacity-80">
                      <AudioWaveform className="h-4 w-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={10}
                    className="p-0 bg-popover text-popover-foreground border border-border shadow-xl rounded-xl min-w-[168px] overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-2 px-3.5 pt-3 pb-2.5">
                      <AudioWaveform className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span className="text-[13px] font-semibold tracking-wide text-emerald-400">
                        {currentTrack.format ?? "Lossless"}
                      </span>
                      <span className="ml-auto text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {t("tooltip.lossless.label")}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="mx-3 h-px bg-border/60" />

                    {/* Stats grid */}
                    <div className="grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-1.5 px-3.5 py-2.5 text-[12px]">
                      {currentTrack.bit_depth != null && (
                        <>
                          <span className="text-muted-foreground">{t("tooltip.lossless.bitDepth")}</span>
                          <span className="text-right font-medium tabular-nums">
                            {currentTrack.bit_depth}-bit
                          </span>
                        </>
                      )}
                      {currentTrack.sample_rate != null && (
                        <>
                          <span className="text-muted-foreground">{t("tooltip.lossless.sampleRate")}</span>
                          <span className="text-right font-medium tabular-nums">
                            {formatSampleRate(currentTrack.sample_rate)}
                          </span>
                        </>
                      )}
                      {currentTrack.bit_rate != null && (
                        <>
                          <span className="text-muted-foreground">{t("tooltip.lossless.bitRate")}</span>
                          <span className="text-right font-medium tabular-nums">
                            {currentTrack.bit_rate.toLocaleString()} kbps
                          </span>
                        </>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Progress bar — tooltip is absolute inside, zero layout impact */}
            <ScrubBar
              value={sliderValue}
              max={Math.max(durationMs, 1)}
              disabled={!currentTrack}
              forceExpanded={scrubActive}
              onChange={(v) => setScrubbing(v)}
              onCommit={(v) => {
                seek(v);
                clearTimeout(clearScrubTimerRef.current);
                clearScrubTimerRef.current = setTimeout(
                  () => setScrubbing((prev) => (prev === v ? null : prev)),
                  1500
                );
              }}
              onHoverChange={setScrubHover}
              startLabel={formatTime(sliderValue)}
              endLabel={formatTime(durationMs)}
            />

          </div>

          {/* ── Right: action controls ── */}
          <div className="flex shrink-0 items-center gap-0.5">
            <IconBtn
              title={shuffle ? t("tooltip.shuffleOn") : t("tooltip.shuffleOff")}
              active={shuffle}
              onClick={toggleShuffle}
            >
              <Shuffle className="h-[17px] w-[17px]" />
            </IconBtn>
            <IconBtn
              title={
                repeat === "off" ? t("tooltip.repeatOff")
                : repeat === "all" ? t("tooltip.repeatAll")
                : t("tooltip.repeatOne")
              }
              active={repeat !== "off"}
              onClick={cycleRepeat}
            >
              {repeat === "one"
                ? <Repeat1 className="h-[17px] w-[17px]" />
                : <Repeat className="h-[17px] w-[17px]" />}
            </IconBtn>
            <IconBtn
              title={t("tooltip.lyrics")}
              active={lyricsOpen}
              onClick={toggleLyrics}
              disabled={!currentTrack}
            >
              <Mic2 className="h-[17px] w-[17px]" />
            </IconBtn>
            <IconBtn
              title={t("side.combined.title")}
              active={panelOpen}
              onClick={togglePanel}
            >
              <ListMusic className="h-[17px] w-[17px]" />
            </IconBtn>
            <div className="ml-2 flex items-center gap-1.5 border-l border-foreground/10 pl-2">
              <button
                onClick={() => setVolume(muted ? lastVolume || 0.5 : 0)}
                className="text-foreground/80 hover:text-foreground"
                title={muted ? t("tooltip.unmute") : t("tooltip.mute")}
              >
                {muted
                  ? <VolumeX className="h-[17px] w-[17px]" />
                  : <Volume2 className="h-[17px] w-[17px]" />}
              </button>
              <Slider
                min={0} max={1} step={0.01}
                value={[volume]}
                onValueChange={([v]) => setVolume(v)}
                className="w-20"
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function ScrubBar({
  value, max, disabled, onChange, onCommit, forceExpanded, onHoverChange, startLabel, endLabel,
}: {
  value: number; max: number; disabled?: boolean;
  onChange: (v: number) => void; onCommit: (v: number) => void;
  forceExpanded?: boolean;
  onHoverChange?: (h: boolean) => void;
  startLabel?: string;
  endLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(false);

  const valueAtX = (x: number) => {
    if (!ref.current) return value;
    const { left, width } = ref.current.getBoundingClientRect();
    return Math.min(1, Math.max(0, (x - left) / width)) * max;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    setDragging(true);
    ref.current?.setPointerCapture(e.pointerId);
    onChange(valueAtX(e.clientX));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    onChange(valueAtX(e.clientX));
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    ref.current?.releasePointerCapture(e.pointerId);
    onCommit(valueAtX(e.clientX));
  };

  const handleHover = (h: boolean) => {
    setHover(h);
    onHoverChange?.(h);
  };

  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const tall = hover || dragging || forceExpanded;

  return (
    // Fixed h-3 hit area — height never changes, no reflow
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onMouseEnter={() => handleHover(true)}
      onMouseLeave={() => handleHover(false)}
      className={cn(
        "relative h-1 w-full cursor-pointer",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      {/* Tooltip — absolute above the track, zero layout contribution */}
      <div
        className={cn(
          "pointer-events-none absolute bottom-full left-0 right-0 flex justify-between pb-0.5 text-[11px] tabular-nums text-foreground/60 transition-opacity duration-150",
          tall ? "opacity-100" : "opacity-0"
        )}
      >
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>

      {/* Visual track — absolute + centered; height change via inline style, no layout impact */}
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-foreground/10 transition-all duration-150"
        style={{ height: tall ? '6px' : '3px' }}
      >
        <div className="h-full rounded-full bg-foreground/70" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function IconBtn({
  children, active, className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...props}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-foreground/[0.08] hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent",
        active && "bg-foreground/[0.08] text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}
