import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { CardRow, Especialidade, calcularNota, ESPECIALIDADE_LABEL, MODO_LABEL } from "@/lib/oq";
import { buscarPool, registrarDesempenho, QueueFilter } from "@/lib/queue";
import { supabase } from "@/integrations/supabase/client";
import ModoABCDE, { ModoHandle } from "@/components/oq/ModoABCDE";
import ModoLacuna from "@/components/oq/ModoLacuna";
import ModoOQFalta from "@/components/oq/ModoOQFalta";
import { FavoritoBtn, ReportBtn } from "@/components/oq/CardActions";
import ConsolePanel from "@/components/console/ConsolePanel";
import NeonProgressBar from "@/components/console/NeonProgressBar";
import Starburst from "@/components/console/Starburst";
import { ensureAudio } from "@/lib/sensory";
import { cn } from "@/lib/utils";

export default function Estudo() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [pool, setPool] = useState<CardRow[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [favSet, setFavSet] = useState<Set<string>>(new Set());
  const [contadorSessao, setContadorSessao] = useState(0);
  const [showStar, setShowStar] = useState(false);
  const [modoState, setModoState] = useState({ hintsUsed: 0, canConfirm: false, finalized: false });
  const [inputValue, setInputValue] = useState("");
  const [direction, setDirection] = useState<1 | -1>(1);

  const modoRef = useRef<ModoHandle>(null);
  const cardScrollRef = useRef<HTMLDivElement>(null);

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
    setPool(p); setIdx(0);
    const { data: favs } = await supabase.from("favoritos").select("card_id").eq("usuario_id", user.id);
    setFavSet(new Set((favs ?? []).map((f: any) => f.card_id)));
    setLoading(false);
  }, [user, params.toString()]);

  useEffect(() => { carregar(); document.title = "Estudar — OQ MED"; }, [carregar]);

  const card = pool[idx];

  async function onFinalizar(r: { acertou: boolean; nivelPista: number; tentativas: number }) {
    if (!user || !card) return;
    const nota = calcularNota(r);
    await registrarDesempenho({
      userId: user.id, cardId: card.id,
      acertou: r.acertou, nivelPista: r.nivelPista, nota,
      pesoImportancia: card.peso_importancia,
    });
    setContadorSessao((c) => c + 1);
    if (r.acertou) { setShowStar(true); setTimeout(() => setShowStar(false), 1100); }
  }

  function proximo() {
    setDirection(1); setInputValue("");
    if (idx + 1 >= pool.length) { carregar(); return; }
    setIdx(idx + 1);
  }

  function onWheelTick(dir: 1 | -1) {
    const el = cardScrollRef.current;
    if (!el) return;
    el.scrollBy({ top: dir * 60, behavior: "smooth" });
  }

  if (loading) {
    return <div className="grid place-items-center h-[60vh] text-muted-foreground">Carregando OQs…</div>;
  }
  if (pool.length === 0) {
    return (
      <div className="grid place-items-center h-[60vh] text-center px-6">
        <div className="space-y-4 max-w-md">
          <h2 className="text-2xl font-semibold">Nenhum OQ por aqui</h2>
          <p className="text-muted-foreground">Tente outro filtro ou crie OQs em "Gerar OQs".</p>
        </div>
      </div>
    );
  }

  const showInput = card.modo !== "abcde";
  const placeholder = card.modo === "lacuna" ? "Digite sua resposta…" : "Digite a informação que falta…";

  return (
    <div onPointerDown={() => ensureAudio()} className="relative max-w-3xl mx-auto px-4 pt-6 pb-[260px] md:pb-[280px]">
      {/* Barra de progresso topo */}
      <div className="mb-5 flex items-center gap-3">
        <span className="text-xs font-mono text-muted-foreground tabular-nums">
          {String(idx + 1).padStart(2, "0")}/{String(pool.length).padStart(2, "0")}
        </span>
        <NeonProgressBar value={idx + 1} total={pool.length} className="flex-1" />
      </div>

      {/* Pílulas de meta-info */}
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="px-3 py-1 rounded-full bg-white border border-border text-[hsl(var(--primary))] font-medium">
          {ESPECIALIDADE_LABEL[card.especialidade]}
        </span>
        <span className="px-3 py-1 rounded-full bg-[hsl(var(--primary))] text-white font-medium">
          {MODO_LABEL[card.modo]}
        </span>
      </div>

      {/* CARD-REVISTA com morphing */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={card.id}
          layoutId={`card-${card.id}`}
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.98 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="paper-card p-6 md:p-9"
        >
          <div className="flex justify-end gap-1 -mt-2 -mr-2 mb-2">
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

          <div ref={cardScrollRef} className="max-h-[55vh] overflow-y-auto pr-1 -mr-1 scroll-smooth">
            {card.modo === "abcde" && (
              <ModoABCDE ref={modoRef} card={card} onFinalizar={onFinalizar} onState={setModoState} />
            )}
            {card.modo === "lacuna" && (
              <ModoLacuna
                ref={modoRef}
                card={card}
                onFinalizar={onFinalizar}
                onState={setModoState}
                renderInput={() => null /* input vai no painel */}
              />
            )}
            {card.modo === "oq_falta" && (
              <ModoOQFalta
                ref={modoRef}
                card={card}
                onFinalizar={onFinalizar}
                onState={setModoState}
                renderInput={() => null}
              />
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {contadorSessao > 0 && contadorSessao % 20 === 0 && modoState.finalized && (
        <div className="mt-5 text-center p-4 rounded-2xl border border-[hsl(var(--accent))]/40 bg-[hsl(var(--accent))/0.06] animate-fade-up">
          🎉 Parabéns! Mais 20 OQs cumpridos.
        </div>
      )}

      {/* Painel inferior (game console) — fixo */}
      <div className="fixed bottom-0 inset-x-0 z-40 px-3 pb-4 md:px-6 md:pb-6">
        <div className="max-w-3xl mx-auto">
          <ConsolePanel
            hintsUsed={modoState.hintsUsed}
            onHint={() => modoRef.current?.hint()}
            hintDisabled={modoState.finalized}
            onConfirm={() => {
              // se há input controlado, sincroniza antes
              if (showInput) {
                // chamamos confirm direto; cada modo já tem seu próprio state interno
              }
              modoRef.current?.confirm();
            }}
            confirmDisabled={!modoState.canConfirm}
            confirmHidden={modoState.finalized}
            onWheelTick={onWheelTick}
            onNext={proximo}
            showNext={modoState.finalized}
            center={
              showInput && !modoState.finalized ? (
                <ConsoleInput
                  value={inputValue}
                  onChange={(v) => {
                    setInputValue(v);
                    // reflete no modo via remount — mas usamos modo internamente pelo ref
                    // aqui tornamos o input do console o "fonte da verdade"
                    syncToModo(modoRef, v);
                  }}
                  onEnter={() => modoRef.current?.confirm()}
                  placeholder={placeholder}
                />
              ) : modoState.finalized ? (
                <p className="text-sm text-muted-foreground text-center w-full">
                  {showStar ? "✨ Acertou!" : "Veja a explicação acima"}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground text-center w-full">
                  Selecione uma alternativa
                </p>
              )
            }
          />
        </div>
      </div>

      <Starburst show={showStar} />
    </div>
  );
}

/** Reseta input do console quando troca card */
function ConsoleInput({ value, onChange, onEnter, placeholder }: {
  value: string; onChange: (v: string) => void; onEnter: () => void; placeholder: string;
}) {
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") onEnter(); }}
      placeholder={placeholder}
      maxLength={300}
      className={cn(
        "w-full bg-transparent border-0 outline-none text-base md:text-lg",
        "placeholder:text-muted-foreground/70 text-[hsl(var(--primary))] font-medium",
      )}
    />
  );
}

/** Sincroniza valor digitado no console-input com o estado interno do modo (lacuna/oq_falta).
 *  Como cada modo gerencia seu próprio state, expomos um setter via ref impl. */
function syncToModo(ref: React.RefObject<ModoHandle>, v: string) {
  // O modo expõe canConfirm baseado em seu valor interno; aqui usamos truque:
  // disparamos um custom event que o modo escuta. Implementação simples:
  window.dispatchEvent(new CustomEvent("oq-input", { detail: v }));
  // (modos escutam esse evento — ver implementação em ModoLacuna/ModoOQFalta abaixo)
  void ref;
}
