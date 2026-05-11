import { create } from "zustand";

export type Theme = "light" | "dark" | "system";
export type Locale = "en" | "zh";
export type RepeatMode = "off" | "all" | "one";

interface SettingsStore {
  theme: Theme;
  locale: Locale;
  systemDark: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  setTheme: (t: Theme) => void;
  setLocale: (l: Locale) => void;
  setShuffle: (v: boolean) => void;
  toggleShuffle: () => void;
  setRepeat: (m: RepeatMode) => void;
  cycleRepeat: () => void;
}

const THEME_KEY = "beatify.theme";
const LOCALE_KEY = "beatify.locale";
const SHUFFLE_KEY = "beatify.shuffle";
const REPEAT_KEY = "beatify.repeat";

function readTheme(): Theme {
  const v = localStorage.getItem(THEME_KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

function readLocale(): Locale {
  const v = localStorage.getItem(LOCALE_KEY);
  if (v === "en" || v === "zh") return v;
  if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("zh")) {
    return "zh";
  }
  return "en";
}

function readShuffle(): boolean {
  return localStorage.getItem(SHUFFLE_KEY) === "true";
}

function readRepeat(): RepeatMode {
  const v = localStorage.getItem(REPEAT_KEY);
  if (v === "all" || v === "one" || v === "off") return v;
  return "off";
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(theme: Theme, systemDark: boolean) {
  const dark = theme === "dark" || (theme === "system" && systemDark);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export const useSettings = create<SettingsStore>((set, get) => ({
  theme: readTheme(),
  locale: readLocale(),
  systemDark: systemPrefersDark(),
  shuffle: readShuffle(),
  repeat: readRepeat(),
  setTheme: (t) => {
    localStorage.setItem(THEME_KEY, t);
    set({ theme: t });
    applyTheme(t, get().systemDark);
  },
  setLocale: (l) => {
    localStorage.setItem(LOCALE_KEY, l);
    set({ locale: l });
  },
  setShuffle: (v) => {
    localStorage.setItem(SHUFFLE_KEY, String(v));
    set({ shuffle: v });
  },
  toggleShuffle: () => {
    const v = !get().shuffle;
    localStorage.setItem(SHUFFLE_KEY, String(v));
    set({ shuffle: v });
  },
  setRepeat: (m) => {
    localStorage.setItem(REPEAT_KEY, m);
    set({ repeat: m });
  },
  cycleRepeat: () => {
    const order: RepeatMode[] = ["off", "all", "one"];
    const cur = get().repeat;
    const next = order[(order.indexOf(cur) + 1) % order.length];
    localStorage.setItem(REPEAT_KEY, next);
    set({ repeat: next });
  },
}));

/** Initialise theme application and start listening for system theme changes. */
export function initSettings() {
  const { theme, systemDark } = useSettings.getState();
  applyTheme(theme, systemDark);

  if (typeof window !== "undefined") {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      useSettings.setState({ systemDark: e.matches });
      const { theme } = useSettings.getState();
      if (theme === "system") applyTheme(theme, e.matches);
    };
    mq.addEventListener("change", onChange);
  }
}
