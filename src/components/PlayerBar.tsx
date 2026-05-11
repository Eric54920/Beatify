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

  return (
    <div data-no-drag className="shrink-0 px-3 pb-3 pt-1">
      <div className="glass-floating flex h-[64px] items-center gap-2 rounded-2xl pl-2 pr-3">
        {/* Transport */}
        <div className="flex items-center gap-0.5">
          <IconBtn onClick={previous} title={t("tooltip.previous")}>
            <SkipBack className="h-[20px] w-[20px] fill-current" />
          </IconBtn>
          <button
            onClick={togglePlay}
            disabled={!currentTrack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
            title={isPlaying ? t("tooltip.pause") : t("tooltip.play")}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            )}
          </button>
          <IconBtn onClick={next} title={t("tooltip.next")}>
            <SkipForward className="h-[20px] w-[20px] fill-current" />
          </IconBtn>
        </div>

        {/* Now playing block — cover on the left, two stacked rows on the right */}
        <div className="flex h-full min-w-0 flex-1 items-center gap-3 px-2">
          <CoverArt
            trackId={currentTrack?.id}
            hasCover={currentTrack?.has_cover}
            size={44}
            className="rounded-md shadow-sm"
          />
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            {/* Row 1: title · artist · album */}
            <div className="flex min-w-0 items-baseline gap-1.5">
              {currentTrack ? (
                <>
                  <span className="truncate text-[12.5px] font-semibold leading-tight">
                    {currentTrack.title}
                  </span>
                  {currentTrack.artist && (
                    <>
                      <span className="text-[11px] text-muted-foreground/60">·</span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {currentTrack.artist}
                      </span>
                    </>
                  )}
                  {currentTrack.album && (
                    <>
                      <span className="text-[11px] text-muted-foreground/60">·</span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {currentTrack.album}
                      </span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <span className="truncate text-[12.5px] font-semibold leading-tight">
                    {t("common.nothingPlaying")}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {t("common.startHint")}
                  </span>
                </>
              )}
            </div>

            {/* Row 2: scrubber · elapsed/duration (both times right of the bar) */}
            <div className="flex items-center gap-3 text-[10px] tabular-nums text-muted-foreground/80">
              <ScrubBar
                value={sliderValue}
                max={Math.max(durationMs, 1)}
                disabled={!currentTrack}
                onChange={(v) => setScrubbing(v)}
                onCommit={(v) => {
                  setScrubbing(null);
                  seek(v);
                }}
              />
              <span className="shrink-0 whitespace-nowrap">
                {formatTime(sliderValue)}
                <span className="px-1 opacity-50">/</span>
                {formatTime(durationMs)}
              </span>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-0.5">
          <IconBtn
            title={shuffle ? t("tooltip.shuffleOn") : t("tooltip.shuffleOff")}
            active={shuffle}
            onClick={toggleShuffle}
          >
            <Shuffle className="h-[18px] w-[18px]" />
          </IconBtn>
          <IconBtn
            title={
              repeat === "off"
                ? t("tooltip.repeatOff")
                : repeat === "all"
                ? t("tooltip.repeatAll")
                : t("tooltip.repeatOne")
            }
            active={repeat !== "off"}
            onClick={cycleRepeat}
          >
            {repeat === "one" ? (
              <Repeat1 className="h-[18px] w-[18px]" />
            ) : (
              <Repeat className="h-[18px] w-[18px]" />
            )}
          </IconBtn>
          <IconBtn
            title={t("tooltip.lyrics")}
            active={lyricsOpen}
            onClick={toggleLyrics}
            disabled={!currentTrack}
          >
            <Mic2 className="h-[18px] w-[18px]" />
          </IconBtn>
          <IconBtn
            title={t("side.combined.title")}
            active={panelOpen}
            onClick={togglePanel}
          >
            <ListMusic className="h-[18px] w-[18px]" />
          </IconBtn>
          <div className="ml-2 flex items-center gap-1.5 pl-2 border-l border-foreground/10">
            <button
              onClick={() => setVolume(muted ? lastVolume || 0.5 : 0)}
              className="text-muted-foreground hover:text-foreground"
              title={muted ? t("tooltip.unmute") : t("tooltip.mute")}
            >
              {muted ? (
                <VolumeX className="h-[18px] w-[18px]" />
              ) : (
                <Volume2 className="h-[18px] w-[18px]" />
              )}
            </button>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[volume]}
              onValueChange={([v]) => setVolume(v)}
              className="w-20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Pointer-driven inline progress / scrubber. */
function ScrubBar({
  value,
  max,
  disabled,
  onChange,
  onCommit,
}: {
  value: number;
  max: number;
  disabled?: boolean;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(false);

  const valueAtX = (x: number) => {
    if (!ref.current) return value;
    const rect = ref.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (x - rect.left) / rect.width));
    return ratio * max;
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

  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const tall = hover || dragging;

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        "flex h-3 flex-1 cursor-pointer items-center",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      <div
        className={cn(
          "w-full overflow-hidden rounded-full transition-all",
          tall ? "h-[4px] bg-foreground/15" : "h-[3px] bg-foreground/[0.10]"
        )}
      >
        <div
          className="h-full rounded-full bg-foreground/70"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function IconBtn({
  children,
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...props}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent",
        active && "bg-foreground/[0.08] text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}
