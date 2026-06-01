import { useEffect, useState, useCallback, useMemo } from "react";
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

export type FocoIncidencia = "todas" | "alta_media" | "alta";

export interface TrilhaSettings {
  setup_done: boolean;
  prova_data: string | null;
  prova_nome: string;
  perfil: TrilhaPerfil;
  rodizio_atual: RodizioItem | null;
  proximos_rodizios: RodizioItem[];
  disponibilidade: { dias: boolean[]; horas: number; horas_por_dia?: number[] };
  redistribuidos: TrilhaRedistribuido[];
  /** Estratégia de cobertura: todas, alta+média ou apenas alta incidência. */
  foco_incidencia?: FocoIncidencia;
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
  foco_incidencia: "todas",
  data_inicio_plano: null,
  plano_overrides: {},
  perdidos: [],
  completos: [],
};

export function maxTierFor(foco: FocoIncidencia | undefined): number {
  if (foco === "alta") return 1;
  if (foco === "alta_media") return 2;
  return 3;
}

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

export const META_OQS_POR_AULA = 20;
export const ACERTO_MINIMO = 0.6;

export function useTrilhaPlano() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<TrilhaSettings>(TRILHA_DEFAULT);
  const [aulas, setAulas] = useState<AulaPlano[]>([]);
  const [studiedThisWeek, setStudiedThisWeek] = useState(0);
  const [studiedLastWeek, setStudiedLastWeek] = useState(0);
  const [aulaStatsSemana, setAulaStatsSemana] = useState<Record<string, { count: number; acertos: number }>>({});

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

    const { data: mats, error: matsError } = await supabase
      .from("materiais")
      .select("id, nome, especialidade, tier, key_words, link_1, cards(count)")
      .order("tier", { ascending: true });

    if (matsError) {
      console.error("Erro ao carregar materiais:", matsError);
    }

    setAulas(
      (mats ?? []).map((m: any) => ({
        id: m.id,
        nome: m.nome,
        especialidade: m.especialidade,
        tier: m.tier,
        key_words: m.key_words,
        total_oqs: m.cards?.[0]?.count ?? 0,
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
      .select("card_id, timestamp, acertou")
      .eq("usuario_id", user.id)
      .gte("timestamp", lastMonday.toISOString());

    let cw = 0, lw = 0;
    const cardIdsSet = new Set<string>();
    (hist ?? []).forEach((h) => {
      const t = new Date(h.timestamp!);
      if (t >= monday) { cw++; cardIdsSet.add(h.card_id as string); }
      else if (t >= lastMonday) lw++;
    });
    setStudiedThisWeek(cw);
    setStudiedLastWeek(lw);

    // Stats por aula nesta semana
    const stats: Record<string, { count: number; acertos: number }> = {};
    const cardIds = Array.from(cardIdsSet);
    if (cardIds.length) {
      const { data: cs } = await supabase.from("cards").select("id, aula_id").in("id", cardIds);
      const aulaByCard: Record<string, string> = {};
      (cs ?? []).forEach((c: any) => { if (c.aula_id) aulaByCard[c.id] = c.aula_id; });
      (hist ?? []).forEach((h) => {
        const t = new Date(h.timestamp!);
        if (t < monday) return;
        const aid = aulaByCard[h.card_id as string];
        if (!aid) return;
        stats[aid] ??= { count: 0, acertos: 0 };
        stats[aid].count++;
        if (h.acertou) stats[aid].acertos++;
      });
    }
    setAulaStatsSemana(stats);
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

  const marcarConcluida = useCallback(async (aulaId: string) => {
    const list = Array.from(new Set([...(settings.completos ?? []), aulaId]));
    await salvarSettings({ ...settings, completos: list });
  }, [settings, salvarSettings]);

  const desmarcarConcluida = useCallback(async (aulaId: string) => {
    const list = (settings.completos ?? []).filter((x) => x !== aulaId);
    await salvarSettings({ ...settings, completos: list });
  }, [settings, salvarSettings]);

  /** Marca aula como "dominada": registra até 20 OQs com nota 70 e adiciona a completos. */
  const marcarDominada = useCallback(async (aulaId: string) => {
    if (!user) return;
    try {
      const { data: cs } = await supabase
        .from("cards")
        .select("id")
        .eq("aula_id", aulaId)
        .eq("verificado", true)
        .limit(META_OQS_POR_AULA);
      const rows = (cs ?? []).map((c: any) => ({
        usuario_id: user.id,
        card_id: c.id,
        nota: 70,
        acertou: true,
        nivel_pista: 0,
      }));
      if (rows.length) {
        await supabase.from("historico_estudo").insert(rows);
      }
      const list = Array.from(new Set([...(settings.completos ?? []), aulaId]));
      await salvarSettings({ ...settings, completos: list });
      await carregar();
    } catch (e) {
      console.error("marcarDominada falhou", e);
    }
  }, [user, settings, salvarSettings, carregar]);


  // Plano da semana
  const espRodizio = settings.perfil !== "medico" ? settings.rodizio_atual?.especialidade : null;
  const focoAulas = aulas.filter(
    (a) => espRodizio && a.especialidade === espRodizio && a.total_oqs > 0,
  );
  const focoIds = new Set(focoAulas.map((a) => a.id));
  
  // Agora incluímos Tier 3 também
  const baseAulas = aulas.filter(
    (a) => a.tier <= 3 && a.total_oqs > 0 && !focoIds.has(a.id),
  );

  const totalHorasSemana = settings.disponibilidade.dias.reduce((acc, active, i) => {
    if (!active) return acc;
    const h = settings.disponibilidade.horas_por_dia?.[i] ?? settings.disponibilidade.horas;
    return acc + h;
  }, 0);

  // Média de aulas por hora: ~25 OQs por aula, ~1.5h por aula = ~16 OQs/hora. 
  // Mas vamos focar em número de matérias. 1.5h a 2h por matéria.
  const metaSemana = Math.max(10, Math.round(totalHorasSemana * 25));

  // ============ NOVO: Plano de aulas por semana (Algoritmo Estratégico) ============
  function startOfWeekMon(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    const day = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - day);
    return x;
  }

  const hoje = new Date();
  const inicioRef = settings.data_inicio_plano ? new Date(settings.data_inicio_plano + "T00:00:00") : hoje;
  const inicioSemana = startOfWeekMon(inicioRef);
  const semanaAtualSemana = startOfWeekMon(hoje);
  const provaSemana = settings.prova_data ? startOfWeekMon(new Date(settings.prova_data + "T00:00:00")) : null;

  const currentWeekIndex = Math.max(
    0,
    Math.floor((semanaAtualSemana.getTime() - inicioSemana.getTime()) / (7 * 86400000)),
  );

  const totalSemanas = provaSemana
    ? Math.max(currentWeekIndex + 1, Math.ceil((provaSemana.getTime() - inicioSemana.getTime()) / (7 * 86400000)) + 1)
    : Math.max(currentWeekIndex + 12, 24);

  const getRodizioForWeek = (wkIdx: number) => {
    if (wkIdx < currentWeekIndex) return null;
    let relativeWk = wkIdx - currentWeekIndex;
    if (settings.rodizio_atual && relativeWk < settings.rodizio_atual.semanas) {
      return settings.rodizio_atual.especialidade;
    }
    let totalPrev = settings.rodizio_atual?.semanas ?? 0;
    for (const r of settings.proximos_rodizios) {
      if (relativeWk < totalPrev + r.semanas) return r.especialidade;
      totalPrev += r.semanas;
    }
    return null;
  };

  const perdidosSet = new Set(settings.perdidos ?? []);
  const completosSet = new Set(settings.completos ?? []);
  const overrides = settings.plano_overrides ?? {};

  const tierMax = maxTierFor(settings.foco_incidencia);

  // Algoritmo de distribuição inteligente
  const { planoSemanaPorAula, baselinePlano } = useMemo(() => {
    if (!aulas.length) return { planoSemanaPorAula: {}, baselinePlano: {} };
    
    // 1. Calcular Baseline (como seria sem rodízios)
    const baseline: Record<string, number> = {};
    const poolBase = aulas.filter(a => a.total_oqs > 0 && a.tier <= tierMax && !completosSet.has(a.id) && !perdidosSet.has(a.id)).sort((a, b) => a.tier - b.tier);
    const capBase = Math.max(2, Math.floor(totalHorasSemana / 1.8));
    const capMinBase = Math.ceil(poolBase.length / Math.max(1, totalSemanas - currentWeekIndex));
    const targetBase = Math.max(capMinBase, capBase);
    
    let wkBase = currentWeekIndex;
    let poolBaseRef = [...poolBase];
    while (poolBaseRef.length > 0 && wkBase < totalSemanas + 52) {
      let count = 0;
      for (let i = 0; i < poolBaseRef.length; i++) {
        baseline[poolBaseRef[i].id] = wkBase;
        poolBaseRef.splice(i, 1);
        i--;
        count++;
        if (count >= targetBase) break;
      }
      wkBase++;
    }

    // 2. Calcular Plano Real (com rodízios e overrides)
    const res: Record<string, number> = { ...overrides };
    
    // Matérias disponíveis para distribuição (sem override, não completas, não perdidas)
    const pool = aulas.filter(a => a.total_oqs > 0 && a.tier <= tierMax && !completosSet.has(a.id) && !perdidosSet.has(a.id) && overrides[a.id] === undefined);
    
    // Ordenação base por incidência
    pool.sort((a, b) => a.tier - b.tier);

    const remainingPool = [...pool];
    let wk = currentWeekIndex;
    
    const remainingWeeksCount = Math.max(1, totalSemanas - currentWeekIndex);
    const capPorHoras = Math.max(2, Math.floor(totalHorasSemana / 1.8));
    const capMinima = Math.ceil(remainingPool.length / remainingWeeksCount);
    const targetK = Math.max(capMinima, capPorHoras);

    const specialtyWeeksLeft: Record<string, number> = {};
    for (let w = currentWeekIndex; w < totalSemanas + 52; w++) {
      const esp = getRodizioForWeek(w);
      if (esp) specialtyWeeksLeft[esp] = (specialtyWeeksLeft[esp] || 0) + 1;
    }

    while (remainingPool.length > 0 && wk < totalSemanas + 52) {
      const espWk = getRodizioForWeek(wk);
      let count = 0;

      // 1. Foco Sincronizado (Rodízio) — respeitando o limite sustentável
      if (espWk) {
        const poolEspecialidade = remainingPool.filter(a => a.especialidade === espWk);
        const weeksLeftForThisSpec = specialtyWeeksLeft[espWk] || 1;
        // Distribui igualmente entre as semanas restantes do rodízio,
        // mas NUNCA ultrapassa o limite sustentável da semana (targetK).
        // Excedente fica em remainingPool e é puxado nas próximas semanas do
        // rodízio ou, se o rodízio acabar, nas semanas seguintes como conteúdo
        // regular (sempre respeitando targetK).
        const shareIdeal = Math.ceil(poolEspecialidade.length / weeksLeftForThisSpec);
        const shareThisWeek = Math.min(shareIdeal, targetK);

        // Prioriza maior incidência (tier menor) dentro da especialidade
        const idsPrioridade = new Set(
          [...poolEspecialidade]
            .sort((a, b) => a.tier - b.tier)
            .slice(0, shareThisWeek)
            .map(a => a.id),
        );

        for (let i = 0; i < remainingPool.length && count < shareThisWeek; i++) {
          if (idsPrioridade.has(remainingPool[i].id)) {
            res[remainingPool[i].id] = wk;
            remainingPool.splice(i, 1);
            i--;
            count++;
          }
        }
        specialtyWeeksLeft[espWk]--;
      }

      // 2. Preencher com Alta Incidência (Tier 1)
      if (count < targetK) {
        for (let i = 0; i < remainingPool.length; i++) {
          if (remainingPool[i].tier === 1) {
            res[remainingPool[i].id] = wk;
            remainingPool.splice(i, 1);
            i--;
            count++;
            if (count >= targetK) break;
          }
        }
      }

      // 3. Preencher com Média Incidência (Tier 2)
      if (count < targetK) {
        for (let i = 0; i < remainingPool.length; i++) {
          if (remainingPool[i].tier === 2) {
            res[remainingPool[i].id] = wk;
            remainingPool.splice(i, 1);
            i--;
            count++;
            if (count >= targetK) break;
          }
        }
      }

      // 4. Preencher com Baixa Incidência (Tier 3)
      if (count < targetK) {
        for (let i = 0; i < remainingPool.length; i++) {
          res[remainingPool[i].id] = wk;
          remainingPool.splice(i, 1);
          i--;
          count++;
          if (count >= targetK) break;
        }
      }
      wk++;
    }
    return { planoSemanaPorAula: res, baselinePlano: baseline };
  }, [aulas, settings, currentWeekIndex, totalSemanas, totalHorasSemana, overrides, completosSet, perdidosSet]);

  const aulasPorIndice = (wk: number) =>
    aulas.filter((a) => a.total_oqs > 0 && planoSemanaPorAula[a.id] === wk && !perdidosSet.has(a.id));

  const aulasSemanaAtual = aulasPorIndice(currentWeekIndex);

  const pendenciasAulas = aulas.filter(
    (a) => a.total_oqs > 0 &&
      planoSemanaPorAula[a.id] !== undefined &&
      planoSemanaPorAula[a.id] < currentWeekIndex &&
      !perdidosSet.has(a.id) &&
      !completosSet.has(a.id),
  );

  function proximasSemanasDisponiveis(qtd: number): number[] {
    const slots: number[] = [];
    let wk = currentWeekIndex + 1;
    while (slots.length < qtd && wk < totalSemanas + 10) {
      slots.push(wk);
      wk++;
    }
    return slots;
  }

  const perdidosAulas = aulas.filter((a) => a.total_oqs > 0 && perdidosSet.has(a.id));

  // Compatibilidade: déficit "antigo" baseado em meta semanal
  const deficitAnterior = Math.max(0, metaSemana - studiedLastWeek);
  const semanaIsoAtual = isoWeek(new Date());

  const AULAS_POR_SEMANA = Math.max(1, Math.floor(totalHorasSemana / 1.8));

  // Cálculo de puxadas e redistribuições para a análise
  const analiseEstrategica = useMemo(() => {
    const puxadas = aulas.filter(a => 
      planoSemanaPorAula[a.id] === currentWeekIndex && 
      baselinePlano[a.id] > currentWeekIndex
    );
    const redistribuidas = aulas.filter(a => 
      baselinePlano[a.id] === currentWeekIndex && 
      planoSemanaPorAula[a.id] > currentWeekIndex
    );
    return { puxadas, redistribuidas };
  }, [aulas, planoSemanaPorAula, baselinePlano, currentWeekIndex]);

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
    aulasPorIndice,
    AULAS_POR_SEMANA,
    recarregar: carregar,
    getRodizioForWeek,
    analiseEstrategica,
    aulaStatsSemana,
    marcarConcluida,
    desmarcarConcluida,
    marcarDominada,
    focoSemana: aulasSemanaAtual.filter((a) => focoIds.has(a.id) || overrides[a.id] === currentWeekIndex),
    rodizioSemana: aulasSemanaAtual.filter((a) => focoIds.has(a.id)),
    direcionadoSemana: aulasSemanaAtual.filter((a) => overrides[a.id] === currentWeekIndex && !focoIds.has(a.id)),
    baseSemana: aulasSemanaAtual.filter((a) => !focoIds.has(a.id) && overrides[a.id] !== currentWeekIndex),
  };
}
