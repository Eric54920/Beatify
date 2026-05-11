import { useEffect, useState } from "react";
import { Music } from "lucide-react";
import { usePlayer } from "@/store/player";
import { cn } from "@/lib/utils";

export function CoverArt({
  trackId,
  hasCover,
  className,
  size = 40,
}: {
  trackId?: string;
  hasCover?: boolean;
  className?: string;
  size?: number;
}) {
  const loadCover = usePlayer((s) => s.loadCover);
  const cached = usePlayer((s) =>
    trackId ? s.coverArtCache[trackId] : undefined
  );
  const [src, setSrc] = useState<string | null>(cached ?? null);

  useEffect(() => {
    let cancelled = false;
    if (trackId && hasCover) {
      loadCover(trackId).then((data) => {
        if (!cancelled) setSrc(data);
      });
    } else {
      setSrc(null);
    }
    return () => {
      cancelled = true;
    };
  }, [trackId, hasCover, loadCover]);

  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-md bg-secondary flex items-center justify-center",
        className
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt="cover" className="h-full w-full object-cover" />
      ) : (
        <Music className="text-muted-foreground" style={{ width: size * 0.45, height: size * 0.45 }} />
      )}
    </div>
  );
}
