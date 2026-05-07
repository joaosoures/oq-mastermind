import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { processSyncQueue } from "@/lib/sync";


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

const KEY = "oqmed.settings.v2";

interface Ctx extends Settings {
  set: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  reset: () => void;
  sync: () => Promise<void>;
}

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [s, setS] = useState<Settings>(() => {
    // Hydration instantânea via LocalStorage
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULTS;
  });

  const isExternal = useMemo(() => ["/", "/login"].includes(location.pathname), [location.pathname]);
  const activeSettings = useMemo(() => isExternal ? DEFAULTS : s, [isExternal, s]);

  // Sincronização com Supabase (Persistência Full-Stack)
  useEffect(() => {
    if (!user) return;

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("settings")
        .eq("usuario_id", user.id)
        .maybeSingle();

      if (data?.settings && typeof data.settings === 'object') {
        setS(prev => ({ ...prev, ...(data.settings as any) }));
      }
    };

    fetchSettings();
  }, [user]);

  useEffect(() => {
    // Persistir localmente
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
    
    // Aplicar efeitos de UI (sem flickering)
    const root = document.documentElement;
    root.classList.toggle("dark", activeSettings.theme === "dark");
    root.style.fontSize = `${Math.round(activeSettings.fontScale * 100)}%`;
    root.dataset.reduceMotion = activeSettings.reduceMotion ? "1" : "0";
    (window as any).__OQ_SETTINGS__ = activeSettings;

    // Sincronizar com background se logado
    if (user && !isExternal) {
      const timeout = setTimeout(async () => {
        await (supabase.from("user_settings") as any).upsert({
          usuario_id: user.id,
          settings: s,
          atualizado_em: new Date().toISOString()
        });
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [s, activeSettings, user, isExternal]);

  return (
    <SettingsCtx.Provider value={{
      ...activeSettings,
      set: (k, v) => setS(prev => ({ ...prev, [k]: v })),
      reset: () => setS(DEFAULTS),
      sync: async () => {
        if (!user) return;
        const { data } = await supabase.from("user_settings").select("settings").eq("usuario_id", user.id).maybeSingle();
        if (data?.settings && typeof data.settings === 'object') setS(prev => ({ ...prev, ...(data.settings as any) }));
      }
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
  if (typeof window === "undefined") return DEFAULTS;
  return (window as any).__OQ_SETTINGS__ || DEFAULTS;
}

