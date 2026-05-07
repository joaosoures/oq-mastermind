import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { useLocation } from "react-router-dom";

export type ThemeMode = "light" | "dark";

export interface Settings {
  theme: ThemeMode;
  sound: boolean;
  soundVolume: number; // 0..1
  haptics: boolean;
  notifications: boolean;
  focusMode: boolean;
  dailyGoal: number;
  reduceMotion: boolean;
  fontScale: number; // 0.9 .. 1.25
  // Painel de Comando
  consoleLayout: ("scroll" | "hint" | "confirm")[];
  scrollStyle: string;
  hintStyle: string;
  confirmStyle: string;
  useNativeScroll: boolean;
}

const DEFAULTS: Settings = {
  theme: "light",
  sound: true,
  soundVolume: 0.4, // Padrão 2 de 5 (0.2, 0.4, 0.6, 0.8, 1.0)
  haptics: true,
  notifications: true,
  focusMode: false,
  dailyGoal: 20,
  reduceMotion: false,
  fontScale: 1,
  consoleLayout: ["scroll", "hint", "confirm"],
  scrollStyle: "default",
  hintStyle: "default",
  confirmStyle: "default",
  useNativeScroll: false,
};

const KEY = "oqmed.settings.v1";

interface Ctx extends Settings {
  set: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  reset: () => void;
}

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [s, setS] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULTS;
  });

  const isExternal = useMemo(() => ["/", "/login"].includes(location.pathname), [location.pathname]);

  // Se for externo, usamos os DEFAULTS, senão as configurações do usuário
  const activeSettings = useMemo(() => isExternal ? DEFAULTS : s, [isExternal, s]);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
    const root = document.documentElement;
    
    // Tema dark apenas se não for externo E o tema for dark nas configurações ativas
    root.classList.toggle("dark", activeSettings.theme === "dark");
    root.style.fontSize = `${Math.round(activeSettings.fontScale * 100)}%`;
    root.dataset.reduceMotion = activeSettings.reduceMotion ? "1" : "0";
    (window as any).__OQ_SETTINGS__ = activeSettings;
  }, [s, activeSettings]);

  return (
    <SettingsCtx.Provider value={{
      ...activeSettings,
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
