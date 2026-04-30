import { useRef, useState, PointerEvent, useEffect } from "react";
import { cn } from "@/lib/utils";
import { feedback, ensureAudio } from "@/lib/sensory";

interface Props {
  /** Disparado a cada "click" do dial (~12° por tick). +1 horário, -1 anti-horário. */
  onTick?: (dir: 1 | -1) => void;
  size?: number;
  color?: "blue" | "orange" | "purple";
  label?: string;
  className?: string;
}

const COLOR: Record<NonNullable<Props["color"]>, string> = {
  blue:   "from-[hsl(var(--dial-blue))] to-[hsl(218_90%_38%)]",
  orange: "from-[hsl(var(--dial-orange))] to-[hsl(28_95%_42%)]",
  purple: "from-[hsl(var(--dial-purple))] to-[hsl(282_78%_42%)]",
};

const TICK_DEG = 18; // graus por click

export default function ScrollWheel({ onTick, size = 86, color = "blue", label, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(0);
  const stateRef = useRef({ dragging: false, lastAngle: 0, accum: 0 });

  function getAngle(e: PointerEvent | { clientX: number; clientY: number }): number {
    const el = ref.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    ensureAudio();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    stateRef.current.dragging = true;
    stateRef.current.lastAngle = getAngle(e);
    stateRef.current.accum = 0;
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
  function onUp() { stateRef.current.dragging = false; }

  // Suporte teclado: setas
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (document.activeElement !== ref.current) return;
      if (e.key === "ArrowUp" || e.key === "ArrowRight") { setAngle(a => a + TICK_DEG); feedback("tick"); onTick?.(1); }
      if (e.key === "ArrowDown" || e.key === "ArrowLeft") { setAngle(a => a - TICK_DEG); feedback("tick"); onTick?.(-1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onTick]);

  return (
    <div className={cn("flex flex-col items-center gap-1.5 select-none", className)}>
      <div
        ref={ref}
        tabIndex={0}
        role="slider"
        aria-label={label ?? "Rodinha de navegação"}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className={cn(
          "relative cursor-grab active:cursor-grabbing rounded-full touch-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]",
        )}
        style={{ width: size, height: size }}
      >
        {/* Anel externo (borda escura industrial) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle at 30% 25%, hsl(0 0% 100% / 0.5) 0%, transparent 35%), linear-gradient(180deg, hsl(220 10% 25%) 0%, hsl(220 14% 12%) 100%)",
            boxShadow: "0 6px 14px -4px hsl(230 30% 10% / 0.55), 0 1px 0 hsl(0 0% 100% / 0.3) inset",
          }}
        />
        {/* Disco com ranhuras */}
        <div
          className={cn("absolute inset-[10%] rounded-full bg-gradient-to-b shadow-tactile-out", COLOR[color])}
          style={{
            transform: `rotate(${angle}deg)`,
            transition: stateRef.current.dragging ? "none" : "transform 0.4s cubic-bezier(.2,.8,.2,1)",
          }}
        >
          {/* Knurling radial */}
          <div className="absolute inset-0 rounded-full overflow-hidden opacity-70">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="absolute left-1/2 top-0 h-1/2 w-px bg-white/35 origin-bottom"
                style={{ transform: `translateX(-0.5px) rotate(${(360 / 24) * i}deg)` }}
              />
            ))}
          </div>
          {/* Hub central */}
          <div
            className="absolute inset-[28%] rounded-full"
            style={{
              background: "radial-gradient(circle at 35% 30%, hsl(0 0% 100% / 0.55) 0%, hsl(0 0% 100% / 0.05) 45%, transparent 70%), linear-gradient(180deg, hsl(220 14% 30%), hsl(220 18% 16%))",
              boxShadow: "0 1px 0 hsl(0 0% 100% / 0.2) inset, 0 -1px 0 hsl(0 0% 0% / 0.4) inset",
            }}
          />
        </div>
      </div>
      {label && <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>}
    </div>
  );
}
