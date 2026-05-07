import { useEffect, useState, useCallback, useRef } from "react";
import { useSettings } from "@/contexts/SettingsContext";
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
import logo from "@/assets/oqmed-logo.png";
import { cn } from "@/lib/utils";

export default function Estudo() {
  const { user } = useAuth();
  const s = useSettings();
  const [params] = useSearchParams();
  const [pool, setPool] = useState<CardRow[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [favSet, setFavSet] = useState<Set<string>>(new Set());
  const [contadorSessao, setContadorSessao] = useState(0);
  const [showStar, setShowStar] = useState(false);
  const [modoState, setModoState] = useState<{ hintsUsed: number; canConfirm: boolean; finalized: boolean; canSkip?: boolean }>({ hintsUsed: 0, canConfirm: false, finalized: false, canSkip: false });
  const [slotEl, setSlotEl] = useState<HTMLDivElement | null>(null);

  const modoRef = useRef<ModoHandle>(null);
  const cardScrollRef = useRef<HTMLDivElement>(null);

  const filtro: QueueFilter = (() => {
    const esp = params.get("esp") as Especialidade | null;
    const tipo = params.get("tipo");
    if (tipo === "favoritos") return { tipo: "favoritos", especialidade: esp || undefined };
    if (tipo === "criticos") return { tipo: "criticos", especialidade: esp || undefined };
    if (tipo === "dificeis") return { tipo: "dificeis", especialidade: esp || undefined };
    if (tipo === "novos") return { tipo: "novos", especialidade: esp || undefined };
    if (tipo === "esquecidos") return { tipo: "esquecidos", especialidade: esp || undefined };
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
    // Simula tempo de transição das portas
    setTimeout(() => setLoading(false), 2000);
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

  const onWheelTick = useCallback((dir: 1 | -1) => {
    const STEP = 80;
    const el = cardScrollRef.current;
    if (el) {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atTop = scrollTop <= 5;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 5;
      
      if ((dir === 1 && !atBottom) || (dir === -1 && !atTop)) {
        el.scrollBy({ top: dir * STEP, behavior: "smooth" });
        return;
      }
    }
    window.scrollBy({ top: dir * STEP, behavior: "smooth" });
  }, []);

  if (pool.length === 0 && !loading) {
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
    <div className="relative h-screen flex flex-col overflow-hidden">
      <AnimatePresence>
        {loading && (
          <motion.div 
            key="doors-loader"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            className="fixed inset-0 z-[150] flex items-center justify-center overflow-hidden"
          >
            {/* Porta Esquerda (O) */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 1.2, ease: [0.77, 0, 0.175, 1] }}
              className="absolute left-0 top-0 w-1/2 h-full bg-[hsl(var(--background))] border-r border-[hsl(var(--accent)/0.1)] flex items-center justify-end overflow-hidden"
            >
              <div className="relative h-full w-[200%] flex items-center justify-center pointer-events-none translate-x-1/2">
                <img 
                  src={logo} 
                  alt="" 
                  className="h-[50vh] w-auto max-w-none object-contain dark:invert dark:brightness-[1.2]"
                  style={{ clipPath: 'inset(0 50% 0 0)' }}
                />
              </div>
            </motion.div>

            {/* Porta Direita (Q) */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 1.2, ease: [0.77, 0, 0.175, 1] }}
              className="absolute right-0 top-0 w-1/2 h-full bg-[hsl(var(--background))] border-l border-[hsl(var(--accent)/0.1)] flex items-center justify-start overflow-hidden"
            >
              <div className="relative h-full w-[200%] flex items-center justify-center pointer-events-none -translate-x-1/2">
                <img 
                  src={logo} 
                  alt="" 
                  className="h-[50vh] w-auto max-w-none object-contain dark:invert dark:brightness-[1.2]"
                  style={{ clipPath: 'inset(0 0 0 50%)' }}
                />
              </div>
            </motion.div>

            {/* Mensagem Centralizada (Posicionada mais abaixo) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="z-[160] absolute bottom-[15vh] left-1/2 -translate-x-1/2 text-center"
            >
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="text-sm font-medium uppercase tracking-[0.5em] text-[hsl(var(--accent))] neon-text drop-shadow-[0_0_15px_hsl(var(--accent)/0.5)]"
              >
                Carregando OQs…
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        onPointerDown={() => ensureAudio()} 
        className={cn(
          "relative flex-1 w-full max-w-3xl mx-auto px-4 pt-6 pb-[260px] md:pb-[280px] overflow-y-auto minimal-scroll transition-all duration-1000",
          loading ? "opacity-0 scale-95 blur-xl" : "opacity-100 scale-100 blur-0"
        )}
      >
        {!loading && card && (
          <>
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
                    <ModoABCDE ref={modoRef} card={card} onFinalizar={onFinalizar} onState={(s) => setModoState({ ...s, canSkip: s.canSkip ?? false })} />
                  )}
                  {card.modo === "lacuna" && (
                    <ModoLacuna
                      ref={modoRef}
                      card={card}
                      onFinalizar={onFinalizar}
                      onState={(s) => setModoState({ ...s, canSkip: s.canSkip ?? false })}
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
                      onState={(s) => setModoState({ ...s, canSkip: s.canSkip ?? false })}
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

            <Starburst show={showStar} />
          </>
        )}
      </div>

      {!loading && card && (
        <div className="fixed bottom-4 inset-x-0 z-40 px-3 md:bottom-6 md:px-6 pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <div className="console-surface p-4 md:p-5 space-y-3">
              {(card.modo === "lacuna" || card.modo === "oq_falta") && !modoState.finalized && (
                <div className="console-well px-4 py-3 flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))] shadow-[0_0_10px_hsl(var(--accent)/0.8)] shrink-0" />
                  <div ref={setSlotEl} className="flex-1 min-w-0" />
                </div>
              )}

              <div className="flex items-center justify-between gap-3 md:gap-5">
                {s.consoleLayout.map((type) => {
                  if (type === "scroll" && !s.useNativeScroll) {
                    return <ScrollWheel key="scroll" color="blue" onTick={onWheelTick} label="Scroll" size={78} variant={s.scrollStyle} scrollContainerRef={cardScrollRef} />;
                  }
                  if (type === "hint") {
                    return (
                      <div key="hint" className="flex-1 flex items-center justify-center">
                        <NeonHintLamp
                          used={modoState.hintsUsed}
                          onClick={() => modoRef.current?.hint()}
                          disabled={modoState.finalized}
                          variant={s.hintStyle}
                        />
                      </div>
                    );
                  }
                  if (type === "confirm") {
                    return (
                      <div key="confirm" className="min-w-[112px] md:min-w-[140px]">
                        {modoState.finalized ? (
                          <TactileButton variant="primary" size="lg" onClick={proximo} className="w-full" styleVariant={s.confirmStyle}>
                            Próximo <ChevronRight className="h-5 w-5" />
                          </TactileButton>
                        ) : modoState.canSkip ? (
                          <TactileButton
                            variant="danger"
                            size="lg"
                            onClick={() => modoRef.current?.skip?.()}
                            className="w-full"
                            styleVariant={s.confirmStyle}
                          >
                            Não sei
                          </TactileButton>
                        ) : (
                          <TactileButton
                            variant="primary"
                            size="lg"
                            disabled={!modoState.canConfirm}
                            onClick={() => modoRef.current?.confirm()}
                            className="w-full"
                            styleVariant={s.confirmStyle}
                          >
                            Confirmar
                          </TactileButton>
                        )}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
