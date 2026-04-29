import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CardRow, Especialidade, calcularNota } from "@/lib/oq";
import { buscarPool, registrarDesempenho, QueueFilter } from "@/lib/queue";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ModoABCDE from "@/components/oq/ModoABCDE";
import ModoLacuna from "@/components/oq/ModoLacuna";
import ModoOQFalta from "@/components/oq/ModoOQFalta";
import { FavoritoBtn, ReportBtn } from "@/components/oq/CardActions";
import { toast } from "sonner";

export default function Estudo() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [pool, setPool] = useState<CardRow[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finalizado, setFinalizado] = useState(false);
  const [favSet, setFavSet] = useState<Set<string>>(new Set());
  const [contadorSessao, setContadorSessao] = useState(0);

  const filtro: QueueFilter = (() => {
    const esp = params.get("esp") as Especialidade | null;
    const tipo = params.get("tipo");
    if (tipo === "favoritos") return { tipo: "favoritos" };
    if (tipo === "criticos") return { tipo: "criticos" };
    if (tipo === "dificeis") return { tipo: "dificeis" };
    if (tipo === "novos") return { tipo: "novos" };
    if (tipo === "esquecidos") return { tipo: "esquecidos" };
    if (esp) return { tipo: "especialidade", especialidade: esp };
    return { tipo: "todas" };
  })();

  const carregar = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const p = await buscarPool(user.id, filtro);
    setPool(p);
    setIdx(0);
    setFinalizado(false);
    const { data: favs } = await supabase.from("favoritos").select("card_id").eq("usuario_id", user.id);
    setFavSet(new Set((favs ?? []).map((f: any) => f.card_id)));
    setLoading(false);
  }, [user, params.toString()]);

  useEffect(() => { carregar(); document.title = "Estudar — OQ Falta?"; }, [carregar]);

  const card = pool[idx];

  async function onFinalizar(r: { acertou: boolean; nivelPista: number; tentativas: number }) {
    if (!user || !card) return;
    const nota = calcularNota(r);
    await registrarDesempenho({
      userId: user.id, cardId: card.id,
      acertou: r.acertou, nivelPista: r.nivelPista, nota,
      pesoImportancia: card.peso_importancia,
    });
    setFinalizado(true);
    setContadorSessao((c) => c + 1);
  }

  function proximo() {
    if (idx + 1 >= pool.length) { carregar(); return; }
    setIdx(idx + 1);
    setFinalizado(false);
  }

  if (loading) return <div className="grid place-items-center h-[70vh] text-muted-foreground">Carregando OQs…</div>;
  if (pool.length === 0) {
    return (
      <div className="grid place-items-center h-[70vh] text-center px-6">
        <div className="space-y-4 max-w-md">
          <h2 className="text-2xl font-semibold">Nenhum OQ por aqui</h2>
          <p className="text-muted-foreground">Tente outro filtro ou crie OQs em "Gerar OQs".</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      {contadorSessao > 0 && contadorSessao % 20 === 0 && finalizado && (
        <div className="mb-6 text-center p-4 rounded-xl border border-primary/40 bg-primary/5 animate-fade-up">
          🎉 Parabéns! Você cumpriu mais 20 OQs!
        </div>
      )}

      <Card className="p-6 md:p-10 bg-card/60 backdrop-blur border-border/60 shadow-[var(--shadow-card)]" key={card.id}>
        <div className="flex justify-end gap-1 -mt-2 -mr-2 mb-4">
          <FavoritoBtn
            cardId={card.id}
            isFav={favSet.has(card.id)}
            onToggle={(b) => {
              const s = new Set(favSet);
              b ? s.add(card.id) : s.delete(card.id);
              setFavSet(s);
            }}
          />
          <ReportBtn cardId={card.id} />
        </div>

        {card.modo === "abcde" && <ModoABCDE card={card} onFinalizar={onFinalizar} />}
        {card.modo === "lacuna" && <ModoLacuna card={card} onFinalizar={onFinalizar} />}
        {card.modo === "oq_falta" && <ModoOQFalta card={card} onFinalizar={onFinalizar} />}
      </Card>

      {finalizado && (
        <div className="flex justify-center mt-6">
          <Button size="lg" onClick={proximo} className="min-w-48">Próximo OQ →</Button>
        </div>
      )}
    </div>
  );
}
