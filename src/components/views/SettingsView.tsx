import { Monitor, Moon, Sun, Check, ExternalLink } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useSettings, type Theme, type Locale } from "@/store/settings";
import { cn } from "@/lib/utils";
import appIcon from "@/icon.svg";
import { openUrl } from "@tauri-apps/plugin-opener";

export function SettingsView() {
  const t = useT();
  const { theme, locale, setTheme, setLocale } = useSettings();

  const themeOptions: { value: Theme; label: string; hint: string; icon: any }[] = [
    {
      value: "light",
      label: t("page.settings.themeLight"),
      hint: t("page.settings.themeLightHint"),
      icon: Sun,
    },
    {
      value: "dark",
      label: t("page.settings.themeDark"),
      hint: t("page.settings.themeDarkHint"),
      icon: Moon,
    },
    {
      value: "system",
      label: t("page.settings.themeSystem"),
      hint: t("page.settings.themeSystemHint"),
      icon: Monitor,
    },
  ];

  const languageOptions: { value: Locale; label: string }[] = [
    { value: "en", label: "English" },
    { value: "zh", label: "中文" },
  ];

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <header className="flex shrink-0 items-end justify-between gap-4 px-8 pt-[calc(var(--titlebar-height)+12px)] pb-5">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("page.settings.title")}
        </h1>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-20">
        <div className="mx-auto max-w-2xl space-y-8">
          <Section title={t("page.settings.appearance")}>
            <Field label={t("page.settings.theme")}>
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map((o) => {
                  const Icon = o.icon;
                  const active = theme === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => setTheme(o.value)}
                      className={cn(
                        "flex flex-col items-start gap-1.5 rounded-xl border bg-card px-4 py-3 text-left transition-colors",
                        active
                          ? "border-foreground/40 bg-foreground/[0.04]"
                          : "border-border hover:border-foreground/20"
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <Icon className="h-4 w-4" />
                        {active && <Check className="h-4 w-4" />}
                      </div>
                      <div className="text-sm font-medium">{o.label}</div>
                      <div className="text-[11px] leading-snug text-muted-foreground">
                        {o.hint}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Field>
          </Section>

          <Section title={t("page.settings.language")}>
            <Field label={t("page.settings.language")}>
              <div className="inline-flex rounded-lg bg-foreground/[0.06] p-1">
                {languageOptions.map((o) => {
                  const active = locale === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => setLocale(o.value)}
                      className={cn(
                        "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          </Section>

          <Section title={t("page.settings.about")}>
            <div className="rounded-xl border bg-card px-4 py-4 flex flex-col items-center gap-3 text-sm text-muted-foreground">
              <img src={appIcon} alt="Beatify" className="h-14 w-14 rounded-2xl" />
              <span className="font-medium text-foreground">{t("page.settings.version")}</span>
              <button
                onClick={() => openUrl("https://github.com/Eric54920/Beatify")}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("page.settings.sourceCode")}
              </button>
              <span className="text-xs">{t("page.settings.copyright")}</span>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-foreground/80">{label}</div>
      {children}
    </div>
  );
}
