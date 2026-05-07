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

function DefaultVariant({ rotateStyle }: { rotateStyle: any; dragging: boolean }) {
  return (
    <>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] shadow-[0_10px_20px_rgba(0,0,0,0.5),inset_0_2px_2px_rgba(255,255,255,0.1)]" />
      <div className="absolute inset-[4%] rounded-full overflow-hidden" style={rotateStyle}>
        <div className="absolute inset-0 bg-[repeating-conic-gradient(from_0deg,#222_0deg_10deg,#2a2a2a_10deg_20deg)]" />
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,transparent_40%,black_100%)]" />
        <div className="absolute top-[12%] left-1/2 -translate-x-1/2 w-[12%] h-[12%] rounded-full bg-gradient-to-tr from-[#00f2fe] to-[#4facfe] shadow-[0_0_10px_#4facfe]" />
      </div>
      <div className="absolute inset-[25%] rounded-full bg-gradient-to-br from-[#333] to-[#111] shadow-[0_4px_8px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center justify-center">
        <div className="w-[70%] h-[70%] rounded-full border border-white/5 bg-gradient-to-tr from-white/5 to-transparent" />
      </div>
    </>
  );
}

function FerrariVariant({ rotateStyle }: { rotateStyle: any }) {
  return (
    <>
      <div className="absolute inset-0 rounded-full bg-[#111] shadow-[0_12px_24px_rgba(0,0,0,0.7)]" />
      <div className="absolute inset-[2%] rounded-full overflow-hidden" style={rotateStyle}>
        <div className="absolute inset-0 bg-[repeating-conic-gradient(from_0deg,#151515_0deg_15deg,#222_15deg_30deg)]" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-full bg-black/40" style={{ transform: `rotate(${i * 30}deg)` }} />
        ))}
      </div>
      <div className="absolute inset-[20%] rounded-full bg-[#c4161c] shadow-[0_4px_12px_rgba(196,22,28,0.4),inset_0_2px_4px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.3)] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-white/20" />
        <span className="relative text-[10px] font-black text-white tracking-widest drop-shadow-md">START</span>
      </div>
    </>
  );
}

function LitmanVariant({ rotateStyle }: { rotateStyle: any }) {
  return (
    <>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#444] to-[#111] shadow-[0_10px_20px_rgba(0,0,0,0.6)]" />
      <div className="absolute inset-[8%] rounded-full bg-gradient-to-br from-[#eee] via-[#999] to-[#bbb] shadow-[inset_0_1px_2px_white,0_2px_4px_black/40]" />
      <div className="absolute inset-[14%] rounded-full overflow-hidden" style={rotateStyle}>
        <div className="absolute inset-0 bg-[#1a3a5a]" />
        {Array.from({ length: 36 }).map((_, i) => (
          <div key={i} className="absolute top-1/2 left-1/2 w-[1px] h-[100%] bg-white/10 origin-center" style={{ transform: `translate(-50%, -50%) rotate(${i * 10}deg)` }} />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1),transparent_70%)]" />
      </div>
      <div className="absolute inset-[38%] rounded-full bg-gradient-to-br from-[#f0f0f0] to-[#999] shadow-[0_4px_8px_rgba(0,0,0,0.4),inset_0_1px_1px_white] flex items-center justify-center">
        <span className="text-[14px] font-serif italic font-bold text-[#333]">L</span>
      </div>
    </>
  );
}

function LensVariant({ rotateStyle }: { rotateStyle: any }) {
  return (
    <>
      <div className="absolute inset-0 rounded-full bg-[#0a0a0a] shadow-[0_12px_24px_rgba(0,0,0,0.8)]" />
      <div className="absolute inset-0 rounded-full" style={rotateStyle}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="absolute top-0 left-1/2 -translate-x-1/2 w-[4px] h-[6px] bg-[#222]" style={{ transform: `rotate(${i * 9}deg) translateY(2px)` }} />
        ))}
      </div>
      <div className="absolute inset-[12%] rounded-full bg-[#111] shadow-[inset_0_2px_10px_black]" />
      <div className="absolute inset-[18%] rounded-full overflow-hidden" style={rotateStyle}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="absolute top-1/2 left-1/2 w-[120%] h-[120%] bg-[#1a1a1a] border-l border-black/50 origin-center" style={{ transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateX(30%)` }} />
        ))}
      </div>
      <div className="absolute inset-[18%] rounded-full pointer-events-none bg-[radial-gradient(circle_at_30%_30%,rgba(100,150,255,0.2),transparent_60%)]" />
      <div className="absolute inset-[35%] rounded-full bg-black/40 backdrop-blur-[1px] border border-white/5" />
    </>
  );
}

function CompassVariant({ rotateStyle }: { rotateStyle: any }) {
  return (
    <>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#d4af37] via-[#f9d71c] to-[#aa8803] shadow-[0_10px_20px_rgba(0,0,0,0.5),inset_0_2px_2px_rgba(255,255,255,0.4)]" />
      <div className="absolute inset-[10%] rounded-full bg-[#fdfbf0] shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)] flex items-center justify-center">
        <div className="absolute inset-0 opacity-10 bg-[repeating-conic-gradient(from_0deg,black_0deg_1deg,transparent_1deg_10deg)]" />
        <div className="absolute inset-[15%] border border-black/5 rounded-full" />
        <div className="absolute w-full h-full flex items-center justify-center">
          <span className="absolute top-1 text-[9px] font-bold text-red-700">N</span>
          <span className="absolute right-1 text-[9px] font-bold text-black">E</span>
          <span className="absolute bottom-1 text-[9px] font-bold text-black">S</span>
          <span className="absolute left-1 text-[9px] font-bold text-black">W</span>
        </div>
        <div className="absolute w-full h-full" style={rotateStyle}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[4px] h-[70%]">
            <div className="w-full h-1/2 bg-red-600 rounded-t-full shadow-sm" />
            <div className="w-full h-1/2 bg-slate-800 rounded-b-full shadow-sm" />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#aa8803] shadow-md border border-white/20" />
        </div>
      </div>
    </>
  );
}

function VWVariant({ rotateStyle }: { rotateStyle: any }) {
  return (
    <>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#222] to-black shadow-[0_12px_24px_rgba(0,0,0,0.7)]" />
      <div className="absolute inset-[5%] rounded-full overflow-hidden" style={rotateStyle}>
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#003366,#004488,#003366)]" />
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="absolute top-1/2 left-1/2 w-[20%] h-[120%] bg-black/20 origin-center" style={{ transform: `translate(-50%, -50%) rotate(${i * 24}deg)` }} />
        ))}
      </div>
      <div className="absolute inset-[32%] rounded-full bg-gradient-to-br from-[#eee] via-[#999] to-[#bbb] shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_1px_2px_white] flex items-center justify-center">
        <div className="w-[80%] h-[80%] rounded-full border-2 border-black/10 flex items-center justify-center">
          <span className="text-[12px] font-black text-[#222] tracking-tighter">VW</span>
        </div>
      </div>
    </>
  );
}
