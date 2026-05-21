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
  /** Data (YYYY-MM-DD) em que o plano começou — define a "semana 1". */
  data_inicio_plano?: string | null;
  /** Override de semana_index (0-based) por aula_id, após redistribuição. */
  plano_overrides?: Record<string, number>;
  /** Aulas que o aluno deixou de fazer (ficam em "Estudos que você perdeu"). */
  perdidos?: string[];
  /** Aulas marcadas como concluídas pelo aluno. */
  completos?: string[];
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
  data_inicio_plano: null,
  plano_overrides: {},
  perdidos: [],
  completos: [],
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

  // ============ NOVO: Plano de aulas por semana ============
  function startOfWeekMon(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    const day = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - day);
    return x;
  }

  const hoje = new Date();
  const inicioRef = settings.data_inicio_plano
    ? new Date(settings.data_inicio_plano + "T00:00:00")
    : hoje;
  const inicioSemana = startOfWeekMon(inicioRef);
  const semanaAtualSemana = startOfWeekMon(hoje);
  const provaSemana = settings.prova_data
    ? startOfWeekMon(new Date(settings.prova_data + "T00:00:00"))
    : null;

  const currentWeekIndex = Math.max(
    0,
    Math.floor((semanaAtualSemana.getTime() - inicioSemana.getTime()) / (7 * 86400000)),
  );

  const totalSemanas = provaSemana
    ? Math.max(
        currentWeekIndex + 1,
        Math.ceil((provaSemana.getTime() - inicioSemana.getTime()) / (7 * 86400000)) + 1,
      )
    : Math.max(currentWeekIndex + 8, 12);

  // Pool ordenado: foco (mais prioritário) -> base por tier
  const perdidosSet = new Set(settings.perdidos ?? []);
  const completosSet = new Set(settings.completos ?? []);
  const overrides = settings.plano_overrides ?? {};

  const pool = [
    ...focoAulas,
    ...baseAulas.slice().sort((a, b) => a.tier - b.tier),
  ];

  // Distribui ~ aulasPerWeek por semana (no máx 4/semana para incentivar não postergar)
  const AULAS_POR_SEMANA = 4;
  const aulasPlanejaveis = Math.min(pool.length, totalSemanas * AULAS_POR_SEMANA);
  const poolLimitado = pool.slice(0, aulasPlanejaveis);
  const aulasPorSemana = Math.max(
    1,
    Math.min(AULAS_POR_SEMANA, Math.ceil(aulasPlanejaveis / Math.max(1, totalSemanas))),
  );

  const planoSemanaPorAula: Record<string, number> = {};
  poolLimitado.forEach((a, i) => {
    const base = Math.min(totalSemanas - 1, Math.floor(i / aulasPorSemana));
    planoSemanaPorAula[a.id] = overrides[a.id] ?? base;
  });

  const aulasPorIndice = (wk: number) =>
    poolLimitado.filter(
      (a) => planoSemanaPorAula[a.id] === wk && !perdidosSet.has(a.id),
    );

  const aulasSemanaAtual = aulasPorIndice(currentWeekIndex);

  // Pendências reais = aulas planejadas para semanas anteriores, ainda não concluídas e não perdidas
  const pendenciasAulas = poolLimitado.filter(
    (a) =>
      planoSemanaPorAula[a.id] < currentWeekIndex &&
      !perdidosSet.has(a.id) &&
      !completosSet.has(a.id),
  );

  // Próximas semanas vagas (para sugerir destino na redistribuição) — uma por semana
  function proximasSemanasDisponiveis(qtd: number): number[] {
    const slots: number[] = [];
    let wk = currentWeekIndex + 1;
    while (slots.length < qtd && wk < totalSemanas + qtd + 4) {
      const cheia = aulasPorIndice(wk).length >= AULAS_POR_SEMANA;
      if (!cheia) slots.push(wk);
      wk++;
    }
    return slots;
  }

  const perdidosAulas = poolLimitado.filter((a) => perdidosSet.has(a.id));

  // Compatibilidade: déficit "antigo" baseado em meta semanal
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
    // novos:
    currentWeekIndex,
    totalSemanas,
    aulasSemanaAtual,
    pendenciasAulas,
    perdidosAulas,
    proximasSemanasDisponiveis,
    AULAS_POR_SEMANA,
    recarregar: carregar,
  };
}
