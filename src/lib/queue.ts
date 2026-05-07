import { supabase } from "@/integrations/supabase/client";
import { CardRow, calcularScore, Especialidade } from "./oq";
import { db } from "./db";
import { processSyncQueue } from "./sync";

const INITIAL_POOL_SIZE = 10;
const FULL_POOL_SIZE = 50;

export type QueueFilter =
  | { tipo: "todas" }
  | { tipo: "especialidade"; especialidade: Especialidade }
  | { tipo: "favoritos"; especialidade?: Especialidade }
  | { tipo: "criticos"; especialidade?: Especialidade }
  | { tipo: "dificeis"; especialidade?: Especialidade }
  | { tipo: "novos"; especialidade?: Especialidade }
  | { tipo: "esquecidos"; especialidade?: Especialidade };

export async function buscarPool(userId: string, filter: QueueFilter, onPartial?: (cards: CardRow[]) => void): Promise<CardRow[]> {
  console.log("[Queue] Iniciando busca de pool...", { userId, filter });
  try {
    // 1. Tentar carregar do IndexedDB primeiro se estiver offline
    if (!navigator.onLine) {
      console.log("[Queue] Offline. Tentando carregar do cache...");
      const cached = await db.cards.toArray();
      if (cached.length > 0) {
        const pool = cached.slice(0, INITIAL_POOL_SIZE);
        if (onPartial) onPartial(pool);
        return pool;
      }
    }

    // 2. Fetch inicial rápido (Cascading)
    const fetchPage = async (limit: number) => {
      console.log(`[Queue] Buscando ${limit} cards do Supabase...`);
      let q = supabase.from("cards").select("*").limit(limit);
      if (filter.tipo === "especialidade") q = q.eq("especialidade", filter.especialidade);
      const { data: cards, error } = await q;
      if (error) {
        console.error("[Queue] Erro ao buscar cards:", error);
        return [];
      }
      return cards || [];
    };

    // Carrega 100 para processar
    const initialCards = await fetchPage(100);
    
    // Filtrar e processar
    const processCards = async (cards: any[], targetSize: number) => {
      console.log(`[Queue] Processando ${cards.length} cards para pool de ${targetSize}...`);
      try {
        const { data: excluded, error: exError } = await supabase.from("user_excluded_cards").select("card_id").eq("user_id", userId);
        if (exError) console.error("[Queue] Erro ao buscar excluídos:", exError);
        
        const excludedIds = new Set((excluded ?? []).map(e => e.card_id));
        const activeCards = cards.filter(c => !excludedIds.has(c.id));

        const { data: desempenhos, error: desError } = await supabase.from("desempenho_cards").select("*").eq("usuario_id", userId);
        if (desError) console.error("[Queue] Erro ao buscar desempenhos:", desError);
        
        const desempMap = new Map<string, any>();
        (desempenhos ?? []).forEach((d: any) => desempMap.set(d.card_id, d));

        let pool = activeCards as CardRow[];

        // Aplicação de filtros...
        if (filter.tipo === "favoritos") {
          const { data: favs } = await supabase.from("favoritos").select("card_id").eq("usuario_id", userId);
          const favIds = new Set((favs ?? []).map((f: any) => f.card_id));
          pool = pool.filter((c) => favIds.has(c.id));
        } else if (filter.tipo === "criticos") {
          pool = pool.filter((c) => desempMap.get(c.id)?.ultima_nota === 4);
        } else if (filter.tipo === "dificeis") {
          pool = pool.filter((c) => (desempMap.get(c.id)?.ultima_nota ?? 0) >= 3);
        } else if (filter.tipo === "novos") {
          pool = pool.filter((c) => !desempMap.has(c.id));
        } else if (filter.tipo === "esquecidos") {
          const agora = Date.now();
          pool = pool.filter((c) => {
            const d = desempMap.get(c.id);
            if (!d || !d.timestamp_ultima) return false;
            const dias = (agora - new Date(d.timestamp_ultima).getTime()) / 86400000;
            return dias > 7;
          });
        }

        if (filter.tipo !== "favoritos" && "especialidade" in filter && filter.especialidade) {
          pool = pool.filter((c) => c.especialidade === filter.especialidade);
        }

        const scored = pool.map((c) => {
          const d = desempMap.get(c.id);
          const dias = d?.timestamp_ultima ? (Date.now() - new Date(d.timestamp_ultima).getTime()) / 86400000 : 0;
          const score = calcularScore({
            pesoImportancia: c.peso_importancia,
            contadorErros: d?.contador_erros ?? 0,
            contadorAcertos: d?.contador_acertos ?? 0,
            nivelPistaUltima: d?.nivel_pista_ultima ?? 0,
            diasDesdeUltima: dias,
            isNovo: !d,
          });
          return { card: c, score, ultima: d?.timestamp_ultima ?? null };
        });

        scored.sort((a, b) => b.score - a.score || (a.ultima ? new Date(a.ultima).getTime() : 0) - (b.ultima ? new Date(b.ultima).getTime() : 0));
        return scored.slice(0, targetSize).map(s => s.card);
      } catch (err) {
        console.error("[Queue] Erro no processamento de cards:", err);
        return cards.slice(0, targetSize) as CardRow[];
      }
    };

    const pool10 = await processCards(initialCards, INITIAL_POOL_SIZE);
    if (onPartial) onPartial(pool10);

    // Background: completar até 50
    setTimeout(async () => {
      try {
        const fullCards = await fetchPage(500);
        const pool50 = await processCards(fullCards, FULL_POOL_SIZE);
        await db.cards.clear();
        await db.cards.bulkAdd(pool50);
        if (onPartial) onPartial(pool50);
      } catch (err) {
        console.error("[Queue] Erro no carregamento em background:", err);
      }
    }, 100);

    return pool10;
  } catch (err) {
    console.error("[Queue] Erro crítico em buscarPool:", err);
    return [];
  }
}

export async function registrarDesempenho(opts: {
  userId: string;
  cardId: string;
  acertou: boolean;
  nivelPista: number;
  nota: number;
  pesoImportancia: number;
}) {
  const { userId, cardId, acertou, nivelPista, nota, pesoImportancia } = opts;
  
  // 1. Salvar no IndexedDB imediatamente (Offline-First)
  await db.sync_queue.add({
    userId, cardId, acertou, nivelPista, nota, pesoImportancia,
    timestamp: new Date().toISOString(),
    synced: 0
  });

  // 2. Tentar sincronizar se houver internet
  processSyncQueue();
}

