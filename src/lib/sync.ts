import { supabase } from "@/integrations/supabase/client";
import { db, SyncLog } from "./db";

let isSyncing = false;

export async function processSyncQueue() {
  if (isSyncing) return;
  if (!navigator.onLine) return;
  
  const pending = await db.sync_queue
    .where('synced')
    .equals(0)
    .toArray();

  if (pending.length === 0) return;

  isSyncing = true;
  console.log(`[Sync] Sincronizando ${pending.length} registros...`);

  for (const log of pending) {
    try {
      // Registrar no Supabase usando a lógica de queue.ts (simplificada aqui para evitar loops)
      const { data: existing } = await supabase
        .from("desempenho_cards")
        .select("*")
        .eq("usuario_id", log.userId)
        .eq("card_id", log.cardId)
        .maybeSingle();

      const contador_vezes = (existing?.contador_vezes ?? 0) + 1;
      const contador_acertos = (existing?.contador_acertos ?? 0) + (log.acertou ? 1 : 0);
      const contador_erros = (existing?.contador_erros ?? 0) + (log.acertou ? 0 : 1);

      const intervalDays = log.nota === 1 ? 7 : log.nota === 2 ? 3 : log.nota === 3 ? 1 : log.nota === 4 ? 0.5 : 14;
      const proxima = new Date(new Date(log.timestamp).getTime() + intervalDays * 86400000).toISOString();

      const payload = {
        usuario_id: log.userId,
        card_id: log.cardId,
        contador_vezes,
        contador_acertos,
        contador_erros,
        nivel_pista_ultima: log.nivelPista,
        ultima_nota: log.nota,
        timestamp_ultima: log.timestamp,
        proxima_revisao: proxima,
      };

      let error;
      if (existing) {
        ({ error } = await supabase.from("desempenho_cards").update(payload).eq("id", existing.id));
      } else {
        ({ error } = await supabase.from("desempenho_cards").insert(payload));
      }

      if (!error) {
        await db.sync_queue.update(log.id!, { synced: 1 });
      }
    } catch (e) {
      console.error("[Sync] Erro ao sincronizar log:", e);
    }
  }

  isSyncing = false;
  
  // Limpar logs antigos já sincronizados (manter apenas última semana por segurança)
  const umaSemanaAtras = new Date(Date.now() - 7 * 86400000).toISOString();
  await db.sync_queue
    .where('timestamp')
    .below(umaSemanaAtras)
    .and(l => l.synced === 1)
    .delete();
}

// Listener global
if (typeof window !== "undefined") {
  window.addEventListener('online', processSyncQueue);
  // Tentar a cada 30 segundos se houver pendências
  setInterval(processSyncQueue, 30000);
}
