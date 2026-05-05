import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
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
import ScrollWheel from "@/components/console/ScrollWheel";
import NeonHintLamp from "@/components/console/NeonHintLamp";
import TactileButton from "@/components/console/TactileButton";
import NeonProgressBar from "@/components/console/NeonProgressBar";
import Starburst from "@/components/console/Starburst";
import { ensureAudio } from "@/lib/sensory";
import { ChevronRight } from "lucide-react";
import LogoHero from "@/components/landing/LogoHero";

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
  const [slotEl, setSlotEl] = useState<HTMLDivElement | null>(null);

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
    if (idx + 1 >= pool.length) { carregar(); return; }
    setIdx(idx + 1);
  }

  function onWheelTick(dir: 1 | -1) {
    const STEP = 60;
    const EPS = 1;
    const el = cardScrollRef.current;
    if (el) {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atTop = scrollTop <= EPS;
      const atBottom = scrollTop + clientHeight >= scrollHeight - EPS;
      const canScrollInside =
        (dir === 1 && !atBottom) || (dir === -1 && !atTop);
      if (canScrollInside) {
        el.scrollBy({ top: dir * STEP, behavior: "smooth" });
        return;
      }
    }
    // Scroll chaining: continua na página principal
    window.scrollBy({ top: dir * STEP, behavior: "smooth" });
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-[hsl(var(--background))] flex flex-col items-center justify-center overflow-hidden">
        <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center scale-90 md:scale-125">
          <LogoHero />
        </div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="mt-12 text-sm font-medium uppercase tracking-[0.5em] text-[hsl(var(--accent))] neon-text"
        >
          Preparando banco de dados…
        </motion.div>
      </div>
    );
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

  return (
    <div onPointerDown={() => ensureAudio()} className="relative max-w-3xl mx-auto px-4 pt-6 pb-[320px] md:pb-[340px]">
      <div className="mb-5 flex items-center gap-3">
        <span className="text-xs font-mono text-muted-foreground tabular-nums">
          {String(idx + 1).padStart(2, "0")}/{String(pool.length).padStart(2, "0")}
        </span>
        <NeonProgressBar value={idx + 1} total={pool.length} className="flex-1" />
      </div>

      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="px-3 py-1 rounded-full bg-white border border-border text-[hsl(var(--primary))] font-medium">
          {ESPECIALIDADE_LABEL[card.especialidade]}
        </span>
        <span className="px-3 py-1 rounded-full bg-[hsl(var(--primary))] text-white font-medium">
          {MODO_LABEL[card.modo]}
        </span>
      </div>

      <AnimatePresence mode="wait">
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

          <div ref={cardScrollRef} className="max-h-[55vh] overflow-y-auto pr-1 -mr-1 scroll-smooth minimal-scroll">
            {card.modo === "abcde" && (
              <ModoABCDE ref={modoRef} card={card} onFinalizar={onFinalizar} onState={setModoState} />
            )}
            {card.modo === "lacuna" && (
              <ModoLacuna
                ref={modoRef}
                card={card}
                onFinalizar={onFinalizar}
                onState={setModoState}
                renderInput={({ value, setValue, onEnter, shake, disabled, placeholder }) =>
                  slotEl
                    ? createPortal(
                        <input
                          autoFocus
                          maxLength={300}
                          value={value}
                          disabled={disabled}
                          onChange={(e) => setValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") onEnter(); }}
                          placeholder={placeholder}
                          className={`tactile-input ${shake ? "animate-shake" : ""}`}
                        />,
                        slotEl,
                      )
                    : null
                }
              />
            )}
            {card.modo === "oq_falta" && (
              <ModoOQFalta
                ref={modoRef}
                card={card}
                onFinalizar={onFinalizar}
                onState={setModoState}
                renderInput={({ value, setValue, onEnter, shake, disabled, placeholder }) =>
                  slotEl
                    ? createPortal(
                        <input
                          autoFocus
                          maxLength={300}
                          value={value}
                          disabled={disabled}
                          onChange={(e) => setValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") onEnter(); }}
                          placeholder={placeholder}
                          className={`tactile-input ${shake ? "animate-shake" : ""}`}
                        />,
                        slotEl,
                      )
                    : null
                }
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

      {/* Painel game-console fixo */}
      <div className="fixed bottom-0 inset-x-0 z-40 px-3 pb-4 md:px-6 md:pb-6 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <div className="console-surface p-4 md:p-5 space-y-3">
            {/* Slot: input no topo do painel (somente lacuna/oq_falta) */}
            {(card.modo === "lacuna" || card.modo === "oq_falta") && !modoState.finalized && (
              <div className="console-well px-4 py-3 flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))] shadow-[0_0_10px_hsl(var(--accent)/0.8)] shrink-0" />
                <div ref={setSlotEl} className="flex-1 min-w-0" />
              </div>
            )}

            <div className="flex items-center justify-between gap-3 md:gap-5">
              <ScrollWheel color="blue" onTick={onWheelTick} label="Scroll" size={78} />

              <div className="flex-1 flex items-center justify-center">
                <NeonHintLamp
                  used={modoState.hintsUsed}
                  onClick={() => modoRef.current?.hint()}
                  disabled={modoState.finalized}
                />
              </div>

              <div className="min-w-[112px] md:min-w-[140px]">
                {modoState.finalized ? (
                  <TactileButton variant="primary" size="lg" onClick={proximo} className="w-full">
                    Próximo <ChevronRight className="h-5 w-5" />
                  </TactileButton>
                ) : (
                  <TactileButton
                    variant="primary"
                    size="lg"
                    disabled={!modoState.canConfirm}
                    onClick={() => modoRef.current?.confirm()}
                    className="w-full"
                  >
                    Confirmar
                  </TactileButton>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Starburst show={showStar} />
      </div>
    </AnimatePresence>
  );
}
