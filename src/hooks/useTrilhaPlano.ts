import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type TrilhaPerfil = "medico" | "interno_4" | "interno_geral";

export interface RodizioItem {
  especialidade: string;
  semanas: number;
}

export interface TrilhaRedistribuido {
  aula_id: string;
  aula_nome: string;
  semana_iso: string;
  ja_redistribuido: boolean;
}

export interface TrilhaSettings {
  setup_done: boolean;
  prova_data: string | null;
  prova_nome: string;
  perfil: TrilhaPerfil;
  rodizio_atual: RodizioItem | null;
  proximos_rodizios: RodizioItem[];
  disponibilidade: { dias: boolean[]; horas: number; horas_por_dia?: number[] };
  redistribuidos: TrilhaRedistribuido[];
}

export const TRILHA_DEFAULT: TrilhaSettings = {
  setup_done: false,
  prova_data: null,
  prova_nome: "",
  perfil: "interno_geral",
  rodizio_atual: null,
  proximos_rodizios: [],
  disponibilidade: { dias: [true, true, true, true, true, true, true], horas: 2, horas_por_dia: [2, 2, 2, 2, 2, 2, 2] },
  redistribuidos: [],
};

export interface AulaPlano {
  id: string;
  nome: string;
  especialidade: string;
  tier: number;
  key_words: string | null;
  total_oqs: number;
  link_material: string | null;
}

function isoWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function useTrilhaPlano() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<TrilhaSettings>(TRILHA_DEFAULT);
  const [aulas, setAulas] = useState<AulaPlano[]>([]);
  const [studiedThisWeek, setStudiedThisWeek] = useState(0);
  const [studiedLastWeek, setStudiedLastWeek] = useState(0);

  const carregar = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: us, error } = await supabase
        .from("user_settings")
        .select("settings")
        .eq("usuario_id", user.id)
        .maybeSingle();

      if (error) throw error;

      const raw = (us?.settings as any)?.trilha;
      const merged: TrilhaSettings = raw ? { ...TRILHA_DEFAULT, ...raw } : TRILHA_DEFAULT;
      setSettings(merged);
    } catch (err) {
      console.error("Error loading trilha settings:", err);
    }

    const { data: mats } = await supabase
      .from("materiais")
      .select("id, nome, especialidade, tier, key_words, link_1")
      .order("tier", { ascending: true });

    const ids = (mats ?? []).map((m) => m.id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: cs } = await supabase
        .from("cards")
        .select("aula_id")
        .in("aula_id", ids);
      counts = (cs ?? []).reduce((a, r) => {
        if (r.aula_id) a[r.aula_id] = (a[r.aula_id] || 0) + 1;
        return a;
      }, {} as Record<string, number>);
    }
    setAulas(
      (mats ?? []).map((m) => ({
        id: m.id,
        nome: m.nome,
        especialidade: m.especialidade,
        tier: m.tier,
        key_words: m.key_words,
        total_oqs: counts[m.id] ?? 0,
        link_material: m.link_1,
      })),
    );

    // Histórico semana atual e anterior
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const lastMonday = new Date(monday);
    lastMonday.setDate(monday.getDate() - 7);

    const { data: hist } = await supabase
      .from("historico_estudo")
      .select("timestamp")
      .eq("usuario_id", user.id)
      .gte("timestamp", lastMonday.toISOString());

    let cw = 0, lw = 0;
    (hist ?? []).forEach((h) => {
      const t = new Date(h.timestamp!);
      if (t >= monday) cw++;
      else if (t >= lastMonday) lw++;
    });
    setStudiedThisWeek(cw);
    setStudiedLastWeek(lw);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const salvarSettings = useCallback(
    async (next: TrilhaSettings) => {
      if (!user) return;
      
      try {
        setSettings(next);
        const { data: us, error: fetchError } = await supabase
          .from("user_settings")
          .select("settings")
          .eq("usuario_id", user.id)
          .maybeSingle();
        
        if (fetchError) throw fetchError;

        const all = { ...((us?.settings as any) || {}), trilha: next };
        const { error: upsertError } = await supabase.from("user_settings").upsert(
          { usuario_id: user.id, settings: all, atualizado_em: new Date().toISOString() },
          { onConflict: "usuario_id" },
        );

        if (upsertError) throw upsertError;
        console.log("Trilha settings saved successfully");
      } catch (err) {
        console.error("Error saving trilha settings:", err);
      }
    },
    [user],
  );

  // Plano da semana
  const espRodizio = settings.perfil !== "medico" ? settings.rodizio_atual?.especialidade : null;
  const focoAulas = aulas.filter(
    (a) => espRodizio && a.especialidade === espRodizio && a.total_oqs > 0,
  );
  const focoIds = new Set(focoAulas.map((a) => a.id));
  const baseAulas = aulas.filter(
    (a) => a.tier <= 2 && a.total_oqs > 0 && !focoIds.has(a.id),
  );

  // Metas: ~25 OQs por hora * dias ativos
  const totalHorasSemana = settings.disponibilidade.dias.reduce((acc, active, i) => {
    if (!active) return acc;
    const h = settings.disponibilidade.horas_por_dia?.[i] ?? settings.disponibilidade.horas;
    return acc + h;
  }, 0);

  const metaSemana = Math.max(
    10,
    Math.round(totalHorasSemana * 25),
  );

  // Pendências = se semana anterior teve déficit
  const deficitAnterior = Math.max(0, metaSemana - studiedLastWeek);
  const semanaIsoAtual = isoWeek(new Date());

  return {
    loading,
    settings,
    salvarSettings,
    aulas,
    focoAulas,
    baseAulas,
    metaSemana,
    studiedThisWeek,
    deficitAnterior,
    semanaIsoAtual,
    recarregar: carregar,
  };
}
