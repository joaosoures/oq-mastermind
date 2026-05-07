import { useEffect, useState, useCallback, useRef } from "react";
import { processSyncQueue } from "@/lib/sync";

import { useSettings } from "@/contexts/SettingsContext";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { CardRow, Especialidade, calcularNota, ESPECIALIDADE_LABEL, MODO_LABEL } from "@/lib/oq";
import { buscarPool, registrarDesempenho, QueueFilter, getDailyProgress } from "@/lib/queue";
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
  
  // Progress tracking
  const [progressoDiario, setProgressoDiario] = useState(0);
  const [lastGoalShown, setLastGoalShown] = useState(0);

  const [refreshing, setRefreshing] = useState(false);
  const [showStar, setShowStar] = useState(false);
  const [modoState, setModoState] = useState<{ hintsUsed: number; canConfirm: boolean; finalized: boolean; canSkip?: boolean; showDontKnow?: boolean }>({ 
    hintsUsed: 0, canConfirm: false, finalized: false, canSkip: false, showDontKnow: false 
  });
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

  const carregar = useCallback(async (isBackground = false) => {
    if (!user) return;
    if (!isBackground) setLoading(true);
    else setRefreshing(true);

    const p = await buscarPool(user.id, filtro);
    
    // Always refresh daily progress from DB to keep count accurate
    const progresso = await getDailyProgress(user.id);
    setProgressoDiario(progresso);

    if (isBackground) {
      setPool(prev => {
        const seenIds = new Set(prev.slice(0, idx + 1).map(c => c.id));
        const filteredNext = p.filter(c => !seenIds.has(c.id));
        return [...prev.slice(0, idx + 1), ...filteredNext];
      });
      setRefreshing(false);
    } else {
      setPool(p);
      setIdx(0);
      const { data: favs } = await supabase.from("favoritos").select("card_id").eq("usuario_id", user.id);
      setFavSet(new Set((favs ?? []).map((f: any) => f.card_id)));
      setTimeout(() => setLoading(false), 600);
    }
  }, [user, filtro, idx]);

  useEffect(() => { 
    carregar(false); 
    document.title = "Estudar — OQ MED"; 
    processSyncQueue();
  }, [user, params.toString()]);
  useEffect(() => {
    setModoState({ hintsUsed: 0, canConfirm: false, finalized: false, canSkip: false, showDontKnow: false });
  }, [idx]);

  const card = pool[idx];

  async function onFinalizar(r: { acertou: boolean; nivelPista: number; tentativas: number }) {
    if (!user || !card) return;
    const nota = calcularNota(r);
    
    // Optimistic progress update
    setProgressoDiario(prev => prev + 1);

    await registrarDesempenho({
      userId: user.id, cardId: card.id,
      acertou: r.acertou, nivelPista: r.nivelPista, nota,
      pesoImportancia: card.peso_importancia,
    });
    
    if (r.acertou) { setShowStar(true); setTimeout(() => setShowStar(false), 1100); }
    
    carregar(true);
  }

  function proximo() {
    if (idx + 1 >= pool.length) { carregar(); return; }
    setIdx(idx + 1);
  }

  const onWheelTick = useCallback((dir: 1 | -1) => {
    const STEP = 100;
    const el = cardScrollRef.current;
    if (el) {
      el.scrollBy({ top: dir * STEP, behavior: "smooth" });
    }
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
    <div className="relative h-screen flex flex-col overflow-hidden fixed inset-0 overscroll-none touch-none">
      <AnimatePresence>
        {loading && (
          <motion.div 
            key="doors-loader"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.8 }}
            className="fixed inset-0 z-[150] flex items-center justify-center overflow-hidden"
          >
            {/* Porta Esquerda (O) */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.8, ease: [0.77, 0, 0.175, 1] }}
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
              transition={{ duration: 0.8, ease: [0.77, 0, 0.175, 1] }}
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
              transition={{ delay: 0.3, duration: 0.4 }}
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
          "relative flex-1 w-full max-w-3xl mx-auto px-4 pt-10 pb-4 flex flex-col overflow-hidden overscroll-none touch-none transition-all duration-1000",
          loading ? "opacity-0 scale-95 blur-xl" : "opacity-100 scale-100 blur-0"
        )}
      >
        {!loading && card && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header section (Progress bar and metadata) */}
            <div className="shrink-0 pt-2 mb-4">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground tabular-nums">
                  {String(idx + 1).padStart(2, "0")}/{String(pool.length).padStart(2, "0")}
                </span>
                <NeonProgressBar value={idx + 1} total={pool.length} className="flex-1" />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="px-3 py-1 rounded-full bg-white border border-border text-[hsl(var(--primary))] font-medium">
                  {ESPECIALIDADE_LABEL[card.especialidade]}
                </span>
                <span className="px-3 py-1 rounded-full bg-[hsl(var(--primary))] text-white font-medium">
                  {MODO_LABEL[card.modo]}
                </span>
              </div>
            </div>

            {/* Central Card section (Scrollable) */}
            <AnimatePresence mode="wait">
              <motion.div
                key={card.id}
                layoutId={`card-${card.id}`}
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -24, scale: 0.98 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="paper-card flex-1 flex flex-col overflow-hidden mb-[230px] md:mb-[250px]"
              >
                <div 
                  ref={cardScrollRef} 
                  className="flex-1 overflow-y-auto px-6 md:px-9 pt-8 pb-6 md:pb-9 scroll-smooth minimal-scroll overscroll-contain touch-pan-y"
                >
                  <div className="flex justify-end gap-1 mb-2">
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

            {progressoDiario > 0 && progressoDiario % s.dailyGoal === 0 && progressoDiario !== lastGoalShown && modoState.finalized && (
              <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm animate-in fade-in duration-500">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="paper-card w-full max-w-sm text-center p-8 shadow-2xl border-2 border-[hsl(var(--accent)/0.3)] relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[hsl(var(--accent))] to-transparent opacity-50" />
                  
                  <div className="relative z-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[hsl(var(--accent)/0.1)] mb-6 animate-bounce">
                      <span className="text-4xl">🎯</span>
                    </div>
                    
                    <h2 className="font-display text-3xl font-black text-[hsl(var(--foreground))] mb-2 tracking-tight">
                      Parabéns!
                    </h2>
                    
                    <p className="text-muted-foreground mb-8 text-lg font-medium">
                      Você cumpriu mais <span className="text-[hsl(var(--accent))] font-black">{s.dailyGoal}</span> OQs!
                    </p>

                    <TactileButton 
                      variant="primary" 
                      size="lg" 
                      onClick={() => {
                        setLastGoalShown(progressoDiario);
                        proximo();
                      }} 
                      className="w-full"
                    >
                      Continuar Estudando
                    </TactileButton>
                  </div>

                  <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[hsl(var(--accent)/0.1)] rounded-full blur-3xl" />
                  <div className="absolute -top-20 -left-20 w-40 h-40 bg-[hsl(var(--accent)/0.1)] rounded-full blur-3xl" />
                </motion.div>
              </div>
            )}

            <Starburst show={showStar} />
          </div>
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
                    return (
                      <div key="scroll" className="flex-1 flex items-center justify-start">
                        <ScrollWheel 
                          color="blue" 
                          onTick={onWheelTick} 
                          size={90} 
                          variant={s.scrollStyle} 
                          scrollContainerRef={cardScrollRef} 
                        />
                      </div>
                    );
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
                    const isDontKnow = modoState.showDontKnow && !modoState.canConfirm && !modoState.finalized;
                    return (
                      <div key="confirm" className="flex-1 flex items-center justify-end">
                        <div className="relative">
                          <TactileButton
                            variant={modoState.finalized ? "primary" : (isDontKnow ? "danger" : "primary")}
                            size="xl"
                            disabled={!modoState.canConfirm && !modoState.showDontKnow && !modoState.finalized}
                            onClick={() => {
                              if (modoState.finalized) {
                                proximo();
                              } else if (modoState.canConfirm) {
                                modoRef.current?.confirm();
                              } else if (modoState.showDontKnow) {
                                modoRef.current?.skip?.();
                              }
                            }}
                            className={cn(
                              "min-w-[120px] md:min-w-[160px] transition-all duration-300 whitespace-nowrap",
                              modoState.finalized && "bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                            )}
                          >
                            {modoState.finalized ? (
                              <div className="flex items-center gap-2">
                                <span className="hidden md:inline">Próximo</span>
                                <ChevronRight className="w-5 h-5" />
                              </div>
                            ) : (
                              isDontKnow ? "Não sei" : "Confirmar"
                            )}
                          </TactileButton>
                        </div>
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
