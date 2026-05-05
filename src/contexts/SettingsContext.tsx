import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { useLocation } from "react-router-dom";

export type ThemeMode = "light" | "dark";

export interface Settings {
  theme: ThemeMode;
  sound: boolean;
  haptics: boolean;
  notifications: boolean;
  focusMode: boolean;
  dailyGoal: number;
  reduceMotion: boolean;
  fontScale: number; // 0.9 .. 1.25
}

const DEFAULTS: Settings = {
  theme: "light",
  sound: true,
  haptics: true,
  notifications: true,
  focusMode: false,
  dailyGoal: 20,
  reduceMotion: false,
  fontScale: 1,
};

const KEY = "oqmed.settings.v1";

interface Ctx extends Settings {
  set: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  reset: () => void;
}

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULTS;
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
    const root = document.documentElement;
    const isExternal = ["/", "/login"].includes(window.location.pathname);
    
    // Tema dark apenas se não for externo E o tema for dark
    const shouldBeDark = !isExternal && s.theme === "dark";
    
    root.classList.toggle("dark", shouldBeDark);
    root.style.fontSize = `${Math.round(s.fontScale * 100)}%`;
    root.dataset.reduceMotion = s.reduceMotion ? "1" : "0";
    (window as any).__OQ_SETTINGS__ = s;
  }, [s]);

  return (
    <SettingsCtx.Provider value={{
      ...s,
      set: (k, v) => setS(prev => ({ ...prev, [k]: v })),
      reset: () => setS(DEFAULTS),
    }}>
      {children}
    </SettingsCtx.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
  return ctx;
}

export function readSettings(): Settings {
  return ((typeof window !== "undefined" && (window as any).__OQ_SETTINGS__) as Settings) || DEFAULTS;
}
