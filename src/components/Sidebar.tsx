import {
  Library,
  Disc3,
  Users,
  Layers3,
  Settings as SettingsIcon,
} from "lucide-react";
import { usePlayer } from "@/store/player";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import appIcon from "@/icon.svg";

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
    <div className="relative z-10 h-full w-48 shrink-0 p-2">
      <aside className="glass flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/45 shadow-sm">
        <div className="flex flex-col items-center px-3 pt-[calc(var(--titlebar-height)+12px)] pb-4">
          <img src={appIcon} alt="Beatify" className="h-11 w-11 rounded-xl" />
          <span className="mt-1.5 text-sm font-semibold tracking-tight">
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
                    ? "bg-rose-500 text-white font-medium shadow-sm"
                    : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
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
                ? "bg-rose-500 text-white font-medium shadow-sm"
                : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
            )}
          >
            <SettingsIcon className="h-4 w-4" />
            {t("nav.settings")}
          </button>
        </div>
      </aside>
    </div>
  );
}
