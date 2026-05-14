import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Sidebar } from "@/components/Sidebar";
import { PlayerBar } from "@/components/PlayerBar";
import { LyricsOverlay } from "@/components/LyricsOverlay";
import { HomeView } from "@/components/views/HomeView";
import { LibraryView } from "@/components/views/LibraryView";
import { AlbumsView } from "@/components/views/AlbumsView";
import { ArtistsView } from "@/components/views/ArtistsView";
import { SourcesView } from "@/components/views/SourcesView";
import { SettingsView } from "@/components/views/SettingsView";
import { SidePanel } from "@/components/SidePanel";
import { usePlayer } from "@/store/player";

const NON_DRAG_SELECTOR =
  "button, input, textarea, select, a, [role='button'], [role='slider'], [data-no-drag]";

export default function App() {
  const view = usePlayer((s) => s.view);
  const initialize = usePlayer((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Window drag — done at the document level to bypass React synthetic event quirks.
  useEffect(() => {
    const win = getCurrentWindow();

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const region = t.closest("[data-tauri-drag-region]");
      if (!region) return;
      if (t.closest(NON_DRAG_SELECTOR)) return;
      // Fire and forget — must run synchronously while the gesture is still live.
      win.startDragging().catch(() => {});
    };

    const onDoubleClick = async (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (!t.closest("[data-tauri-drag-region]")) return;
      if (t.closest(NON_DRAG_SELECTOR)) return;
      try {
        if (await win.isMaximized()) await win.unmaximize();
        else await win.maximize();
      } catch {
        /* noop */
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("dblclick", onDoubleClick);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("dblclick", onDoubleClick);
    };
  }, []);

  return (
    <div className="relative flex h-full flex-col">
      {/* Drag handle — empty div + native pointerdown listener above. */}
      <div
        data-tauri-drag-region
        className="absolute inset-x-0 top-0 z-50 h-[var(--titlebar-height)]"
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar />
        <main className="relative flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden bg-background">
          <div className={view === "home"     ? "flex flex-1 flex-col min-h-0 overflow-hidden" : "hidden"}><HomeView /></div>
          <div className={view === "library"  ? "flex flex-1 flex-col min-h-0 overflow-hidden" : "hidden"}><LibraryView /></div>
          <div className={view === "albums"   ? "flex flex-1 flex-col min-h-0 overflow-hidden" : "hidden"}><AlbumsView /></div>
          <div className={view === "artists"  ? "flex flex-1 flex-col min-h-0 overflow-hidden" : "hidden"}><ArtistsView /></div>
          <div className={view === "sources"  ? "flex flex-1 flex-col min-h-0 overflow-hidden" : "hidden"}><SourcesView /></div>
          <div className={view === "settings" ? "flex flex-1 flex-col min-h-0 overflow-hidden" : "hidden"}><SettingsView /></div>
          <PlayerBar />
        </main>
        <SidePanel />
      </div>

      {/* Full-window lyrics overlay (slides in from below) */}
      <LyricsOverlay />
    </div>
  );
}
