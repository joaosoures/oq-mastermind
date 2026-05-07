import { useRef, useState, PointerEvent, useEffect } from "react";
import { cn } from "@/lib/utils";
import { feedback, ensureAudio } from "@/lib/sensory";

interface Props {
  onTick?: (dir: 1 | -1) => void;
  size?: number;
  color?: "blue" | "orange" | "purple";
  variant?: string;
  label?: string;
  className?: string;
}

const TICK_DEG = 18;

export default function ScrollWheel({ onTick, size = 96, label, className, variant = "default" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const stateRef = useRef({ dragging: false, lastAngle: 0, accum: 0 });

  function getAngle(e: PointerEvent | { clientX: number; clientY: number }): number {
    const el = ref.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * (180 / Math.PI);
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    ensureAudio();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    stateRef.current.dragging = true;
    stateRef.current.lastAngle = getAngle(e);
    stateRef.current.accum = 0;
    setDragging(true);
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!stateRef.current.dragging) return;
    const cur = getAngle(e);
    let delta = cur - stateRef.current.lastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    stateRef.current.lastAngle = cur;
    stateRef.current.accum += delta;
    setAngle((a) => a + delta);
    while (stateRef.current.accum >= TICK_DEG) {
      stateRef.current.accum -= TICK_DEG;
      feedback("tick");
      onTick?.(1);
    }
    while (stateRef.current.accum <= -TICK_DEG) {
      stateRef.current.accum += TICK_DEG;
      feedback("tick");
      onTick?.(-1);
    }
  }
  function onUp() { stateRef.current.dragging = false; setDragging(false); }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (document.activeElement !== ref.current) return;
      if (e.key === "ArrowUp" || e.key === "ArrowRight") { setAngle(a => a + TICK_DEG); feedback("tick"); onTick?.(1); }
      if (e.key === "ArrowDown" || e.key === "ArrowLeft") { setAngle(a => a - TICK_DEG); feedback("tick"); onTick?.(-1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onTick]);

  const rotateStyle = {
    transform: `rotate(${angle}deg)`,
    transition: dragging ? "none" : "transform 0.5s cubic-bezier(.2,.8,.2,1)",
  };

  return (
    <div className={cn("flex flex-col items-center gap-1.5 select-none", className)}>
      <div
        ref={ref}
        tabIndex={0}
        role="slider"
        aria-label={label ?? "Rodinha"}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="relative cursor-grab active:cursor-grabbing rounded-full touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]"
        style={{ width: size, height: size }}
      >
        {variant === "ferrari" && <FerrariVariant rotateStyle={rotateStyle} />}
        {variant === "litman" && <LitmanVariant rotateStyle={rotateStyle} />}
        {variant === "lens" && <LensVariant rotateStyle={rotateStyle} />}
        {variant === "compass" && <CompassVariant rotateStyle={rotateStyle} />}
        {variant === "vw" && <VWVariant rotateStyle={rotateStyle} />}
        {(variant === "default" || !["ferrari","litman","lens","compass","vw"].includes(variant)) && (
          <DefaultVariant rotateStyle={rotateStyle} dragging={dragging} />
        )}
      </div>
      {label && <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>}
    </div>
  );
}

/* ============ Variantes visuais ============ */

function DefaultVariant({ rotateStyle, dragging }: { rotateStyle: any; dragging: boolean }) {
  return (
    <>
      <div className="absolute inset-0 rounded-full" style={{
        background: "hsl(var(--background))",
        boxShadow: "12px 12px 28px hsl(var(--neu-dark) / 0.7), -12px -12px 28px hsl(var(--neu-light) / 0.45), 0 0 40px hsl(var(--accent) / 0.15)",
      }} />
      <div className="absolute inset-[3%] rounded-full" style={{
        background: "radial-gradient(circle at 50% 50%, hsl(var(--background)) 60%, hsl(var(--neu-dark) / 0.1) 100%)",
        boxShadow: "0 0 0 1.5px hsl(var(--foreground) / 0.85), inset 6px 6px 14px hsl(var(--neu-dark) / 0.55), inset -6px -6px 14px hsl(var(--neu-light) / 0.45)",
        ...rotateStyle,
      }}>
        <div className="absolute rounded-full" style={{
          width: "9%", height: "9%", left: "82%", top: "46%",
          background: dragging
            ? "radial-gradient(circle at 35% 30%, hsl(140 90% 78%), hsl(140 80% 45%) 70%)"
            : "radial-gradient(circle at 35% 30%, hsl(220 12% 35%), hsl(220 18% 18%) 70%)",
          boxShadow: dragging ? "0 0 12px hsl(140 80% 55% / 0.95)" : "inset 0 1px 2px hsl(0 0% 0% / 0.5)",
        }} />
      </div>
      <div className="absolute inset-[22%] rounded-full pointer-events-none" style={{
        background: "radial-gradient(circle at 38% 32%, hsl(var(--neu-light) / 0.5) 0%, hsl(var(--background)) 45%, hsl(var(--neu-dark)) 100%)",
        boxShadow: "inset 4px 4px 10px hsl(var(--neu-light) / 0.4), inset -6px -6px 14px hsl(var(--neu-dark) / 0.55)",
      }} />
    </>
  );
}

function FerrariVariant({ rotateStyle }: { rotateStyle: any }) {
  return (
    <>
      {/* Aro carbono externo */}
      <div className="absolute inset-0 rounded-full" style={{
        background: "repeating-conic-gradient(from 0deg, hsl(0 0% 8%) 0deg 4deg, hsl(0 0% 18%) 4deg 8deg)",
        boxShadow: "0 8px 24px hsl(0 0% 0% / 0.6), inset 0 0 0 2px hsl(0 0% 5%)",
        ...rotateStyle,
      }} />
      {/* Anel interno escuro */}
      <div className="absolute inset-[14%] rounded-full" style={{
        background: "radial-gradient(circle at 40% 30%, hsl(0 0% 22%), hsl(0 0% 6%) 80%)",
        boxShadow: "inset 0 2px 6px hsl(0 0% 100% / 0.1), inset 0 -2px 6px hsl(0 0% 0% / 0.6)",
      }} />
      {/* Botão central vermelho ENGINE START */}
      <div className="absolute inset-[34%] rounded-full flex items-center justify-center" style={{
        background: "radial-gradient(circle at 35% 30%, hsl(0 90% 65%), hsl(0 85% 35%) 70%, hsl(0 90% 25%))",
        boxShadow: "0 4px 10px hsl(0 80% 20% / 0.6), inset 0 -2px 4px hsl(0 0% 0% / 0.4), inset 0 2px 4px hsl(0 0% 100% / 0.3)",
      }}>
        <span className="text-[6px] font-black text-white tracking-tight leading-none text-center">START</span>
      </div>
    </>
  );
}

function LitmanVariant({ rotateStyle }: { rotateStyle: any }) {
  return (
    <>
      {/* Aro de borracha preto */}
      <div className="absolute inset-0 rounded-full" style={{
        background: "radial-gradient(circle at 40% 30%, hsl(0 0% 25%), hsl(0 0% 5%) 80%)",
        boxShadow: "0 6px 16px hsl(0 0% 0% / 0.5)",
      }} />
      {/* Aro metálico */}
      <div className="absolute inset-[10%] rounded-full" style={{
        background: "conic-gradient(from 0deg, hsl(0 0% 70%), hsl(0 0% 90%), hsl(0 0% 60%), hsl(0 0% 85%), hsl(0 0% 70%))",
        boxShadow: "inset 0 0 4px hsl(0 0% 100% / 0.5)",
      }} />
      {/* Diafragma azul com raios */}
      <div className="absolute inset-[18%] rounded-full overflow-hidden" style={{
        background: "radial-gradient(circle, hsl(205 30% 80%), hsl(205 35% 60%))",
        ...rotateStyle,
      }}>
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="absolute top-1/2 left-1/2 origin-bottom" style={{
            width: "1.5px", height: "50%",
            background: "hsl(205 40% 35% / 0.6)",
            transform: `translate(-50%, -100%) rotate(${i * 15}deg)`,
          }} />
        ))}
      </div>
      {/* Centro com L */}
      <div className="absolute inset-[40%] rounded-full flex items-center justify-center" style={{
        background: "radial-gradient(circle at 35% 30%, hsl(0 0% 90%), hsl(0 0% 65%) 80%)",
        boxShadow: "inset 0 -2px 4px hsl(0 0% 0% / 0.3), 0 2px 4px hsl(0 0% 0% / 0.4)",
      }}>
        <span className="text-[10px] font-serif italic font-bold text-[hsl(0_0%_25%)]">L</span>
      </div>
    </>
  );
}

function LensVariant({ rotateStyle }: { rotateStyle: any }) {
  return (
    <>
      {/* Aro externo serrilhado */}
      <div className="absolute inset-0 rounded-full" style={{
        background: "repeating-conic-gradient(from 0deg, hsl(0 0% 5%) 0deg 3deg, hsl(0 0% 20%) 3deg 6deg)",
        boxShadow: "0 6px 16px hsl(0 0% 0% / 0.6)",
        ...rotateStyle,
      }} />
      {/* Anéis concêntricos */}
      <div className="absolute inset-[10%] rounded-full" style={{
        background: "radial-gradient(circle, hsl(0 0% 12%), hsl(0 0% 4%))",
        boxShadow: "inset 0 0 0 1px hsl(0 0% 30%)",
      }} />
      <div className="absolute inset-[20%] rounded-full" style={{
        background: "radial-gradient(circle at 35% 30%, hsl(280 40% 25%), hsl(220 50% 15%) 50%, hsl(180 60% 20%) 100%)",
        boxShadow: "inset 0 0 0 1px hsl(0 0% 40%)",
      }} />
      {/* Pétalas do diafragma */}
      <div className="absolute inset-[32%] rounded-full overflow-hidden" style={{
        background: "hsl(0 0% 8%)",
        ...rotateStyle,
      }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="absolute top-1/2 left-1/2 origin-bottom-left" style={{
            width: "60%", height: "60%",
            background: "linear-gradient(135deg, hsl(0 0% 22%), hsl(0 0% 8%))",
            clipPath: "polygon(0 0, 100% 0, 100% 100%)",
            transform: `translate(-50%, -100%) rotate(${i * 40}deg)`,
            borderRight: "1px solid hsl(0 0% 0%)",
          }} />
        ))}
      </div>
      {/* Reflexo central */}
      <div className="absolute inset-[44%] rounded-full pointer-events-none" style={{
        background: "radial-gradient(circle at 35% 30%, hsl(0 0% 100% / 0.4), transparent 70%)",
      }} />
    </>
  );
}

function CompassVariant({ rotateStyle }: { rotateStyle: any }) {
  return (
    <>
      {/* Aro dourado */}
      <div className="absolute inset-0 rounded-full" style={{
        background: "conic-gradient(from 0deg, hsl(45 70% 55%), hsl(45 80% 75%), hsl(40 65% 45%), hsl(45 75% 65%), hsl(45 70% 55%))",
        boxShadow: "0 6px 16px hsl(0 0% 0% / 0.4), inset 0 0 0 2px hsl(40 60% 40%)",
      }} />
      {/* Mostrador */}
      <div className="absolute inset-[12%] rounded-full" style={{
        background: "radial-gradient(circle, hsl(45 30% 92%), hsl(45 25% 80%))",
        boxShadow: "inset 0 2px 6px hsl(0 0% 0% / 0.2)",
      }} />
      {/* Marcações cardeais */}
      <div className="absolute inset-[12%] rounded-full pointer-events-none">
        {["N","E","S","W"].map((d, i) => (
          <span key={d} className="absolute font-serif font-bold text-[8px] text-[hsl(0_0%_15%)]" style={{
            top: i === 0 ? "8%" : i === 2 ? "auto" : "47%",
            bottom: i === 2 ? "8%" : "auto",
            left: i === 3 ? "8%" : i === 1 ? "auto" : "47%",
            right: i === 1 ? "8%" : "auto",
          }}>{d}</span>
        ))}
      </div>
      {/* Agulha rotativa */}
      <div className="absolute inset-[20%] flex items-center justify-center" style={rotateStyle}>
        <div className="relative w-[6px] h-full">
          <div className="absolute top-0 left-0 right-0 h-1/2" style={{
            background: "linear-gradient(180deg, hsl(220 80% 50%), hsl(220 70% 35%))",
            clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
          }} />
          <div className="absolute bottom-0 left-0 right-0 h-1/2" style={{
            background: "linear-gradient(0deg, hsl(0 80% 50%), hsl(0 70% 35%))",
            clipPath: "polygon(0 0, 100% 0, 50% 100%)",
          }} />
        </div>
      </div>
      {/* Pino central */}
      <div className="absolute inset-[44%] rounded-full" style={{
        background: "radial-gradient(circle at 35% 30%, hsl(45 80% 70%), hsl(40 60% 35%))",
        boxShadow: "0 1px 3px hsl(0 0% 0% / 0.5)",
      }} />
    </>
  );
}

function VWVariant({ rotateStyle }: { rotateStyle: any }) {
  return (
    <>
      {/* Aro preto */}
      <div className="absolute inset-0 rounded-full" style={{
        background: "radial-gradient(circle at 40% 30%, hsl(0 0% 18%), hsl(0 0% 4%) 80%)",
        boxShadow: "0 6px 16px hsl(0 0% 0% / 0.5), inset 0 0 0 2px hsl(0 0% 8%)",
      }} />
      {/* Aro com pontos */}
      <div className="absolute inset-[6%] rounded-full overflow-hidden" style={{
        background: "hsl(0 0% 6%)",
      }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="absolute top-1/2 left-1/2 rounded-full" style={{
            width: "5%", height: "5%",
            background: "hsl(0 0% 25%)",
            transform: `translate(-50%, -50%) rotate(${i * 18}deg) translateY(-180%)`,
            boxShadow: "inset 0 1px 2px hsl(0 0% 0% / 0.6)",
          }} />
        ))}
      </div>
      {/* Aletas azuis */}
      <div className="absolute inset-[16%] rounded-full overflow-hidden" style={{
        background: "repeating-conic-gradient(from 0deg, hsl(215 60% 28%) 0deg 12deg, hsl(215 65% 38%) 12deg 18deg)",
        ...rotateStyle,
      }} />
      {/* Calota cromada com VW */}
      <div className="absolute inset-[36%] rounded-full flex items-center justify-center" style={{
        background: "radial-gradient(circle at 35% 25%, hsl(0 0% 98%), hsl(0 0% 70%) 60%, hsl(0 0% 40%))",
        boxShadow: "0 2px 6px hsl(0 0% 0% / 0.5), inset 0 -2px 4px hsl(0 0% 0% / 0.3)",
      }}>
        <span className="text-[8px] font-black text-[hsl(0_0%_25%)] tracking-tighter">VW</span>
      </div>
    </>
  );
}
