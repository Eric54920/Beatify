import {
  Library,
  Disc3,
  Users,
  Layers3,
  Music2,
  Settings as SettingsIcon,
} from "lucide-react";
import { usePlayer } from "@/store/player";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export function Sidebar() {
  const { view, setView } = usePlayer();
  const t = useT();

  const items = [
    { id: "library" as const, label: t("nav.library"), icon: Library },
    { id: "albums" as const, label: t("nav.albums"), icon: Disc3 },
    { id: "artists" as const, label: t("nav.artists"), icon: Users },
    { id: "sources" as const, label: t("nav.sources"), icon: Layers3 },
  ];

  return (
    <aside className="glass relative z-10 flex h-full w-60 shrink-0 flex-col border-r border-border/50">
      <div className="flex items-center gap-2 px-5 pt-[calc(var(--titlebar-height)+8px)] pb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-fuchsia-500 text-white shadow-sm">
          <Music2 className="h-4 w-4" />
        </div>
        <span className="text-base font-semibold tracking-tight">
          {t("app.name")}
        </span>
      </div>

      <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t("nav.library")}
      </div>
      <nav className="flex flex-col gap-0.5 px-2">
        {items.map((it) => {
          const Icon = it.icon;
          const active = view === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setView(it.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                active
                  ? "bg-foreground/[0.08] text-foreground font-medium"
                  : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {it.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-2 pb-3">
        <button
          onClick={() => setView("settings")}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
            view === "settings"
              ? "bg-foreground/[0.08] text-foreground font-medium"
              : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
          )}
        >
          <SettingsIcon className="h-4 w-4" />
          {t("nav.settings")}
        </button>
      </div>
    </aside>
  );
}
