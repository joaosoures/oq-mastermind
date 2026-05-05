import { useRef, useState, PointerEvent, useEffect } from "react";
import { cn } from "@/lib/utils";
import { feedback, ensureAudio } from "@/lib/sensory";

interface Props {
  /** Disparado a cada "click" do dial (~18° por tick). +1 horário, -1 anti-horário. */
  onTick?: (dir: 1 | -1) => void;
  size?: number;
  color?: "blue" | "orange" | "purple";
  label?: string;
  className?: string;
}

// LED indicator color (paleta restrita)
const ACCENT: Record<NonNullable<Props["color"]>, string> = {
  blue: "205 80% 60%",     // #7BBDE8 vibrante
  orange: "205 80% 60%",   // forçado paleta
  purple: "210 83% 35%",   // #0A4174
};

const TICK_DEG = 18;

/**
 * Dial industrial: anel metálico escuro com escala numerada, núcleo
 * "turbina" com lâminas neon e hub central. Inspirado no mock.
 */
export default function ScrollWheel({ onTick, size = 96, color = "blue", label, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const stateRef = useRef({ dragging: false, lastAngle: 0, accum: 0 });
  const accent = ACCENT[color];

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

  const blades = 24;

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
        {/* Aro metálico escuro escovado */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: [
              "radial-gradient(circle at 30% 22%, hsl(220 12% 45%) 0%, transparent 35%)",
              "conic-gradient(from 0deg, hsl(220 14% 18%), hsl(220 10% 32%), hsl(220 14% 14%), hsl(220 10% 30%), hsl(220 14% 18%))",
            ].join(", "),
            boxShadow: [
              "0 0 0 1px hsl(220 10% 8%)",
              "0 1px 0 hsl(0 0% 100% / 0.18) inset",
              "0 -2px 4px hsl(0 0% 0% / 0.5) inset",
              "0 10px 24px -8px hsl(230 40% 6% / 0.6)",
              "0 22px 50px -18px hsl(230 40% 6% / 0.45)",
            ].join(", "),
          }}
        />

        {/* Marcas de escala (tracinhos finos) — giram junto */}
        <div
          className="absolute inset-[6%] rounded-full overflow-hidden opacity-70"
          style={{
            transform: `rotate(${angle}deg)`,
            transition: dragging ? "none" : "transform 0.4s cubic-bezier(.2,.8,.2,1)",
          }}
        >
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-0 w-px bg-white/40"
              style={{
                height: i % 5 === 0 ? "10%" : "5%",
                transform: `translateX(-0.5px) rotate(${(360 / 60) * i}deg)`,
                transformOrigin: `50% ${(size * 0.88) / 2}px`,
              }}
            />
          ))}
        </div>

        {/* Cavidade interna (núcleo turbina) */}
        <div
          className="absolute inset-[18%] rounded-full overflow-hidden"
          style={{
            background: "radial-gradient(circle at 50% 50%, hsl(220 60% 12%) 0%, hsl(225 70% 6%) 100%)",
            boxShadow: "0 0 0 1.5px hsl(220 18% 10%), 0 4px 10px hsl(0 0% 0% / 0.6) inset",
            transform: `rotate(${angle}deg)`,
            transition: dragging ? "none" : "transform 0.4s cubic-bezier(.2,.8,.2,1)",
          }}
        >
          {/* Lâminas neon */}
          {Array.from({ length: blades }).map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 origin-center"
              style={{
                width: "6%",
                height: "78%",
                transform: `translate(-50%, -50%) rotate(${(360 / blades) * i}deg)`,
                background: `linear-gradient(180deg, transparent 0%, hsl(${accent} / 0.85) 18%, hsl(${accent}) 50%, hsl(${accent} / 0.85) 82%, transparent 100%)`,
                borderRadius: "999px",
                boxShadow: `0 0 6px hsl(${accent} / 0.9), 0 0 12px hsl(${accent} / 0.5)`,
                opacity: 0.85,
              }}
            />
          ))}
          {/* Sopro / blur central */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle at 50% 50%, hsl(${accent} / 0.35) 0%, transparent 60%)`,
              filter: "blur(2px)",
            }}
          />
        </div>

        {/* Hub central (vidro escuro com reflexo) */}
        <div
          className="absolute inset-[40%] rounded-full"
          style={{
            background: [
              "radial-gradient(circle at 35% 28%, hsl(0 0% 100% / 0.55) 0%, hsl(0 0% 100% / 0.05) 35%, transparent 60%)",
              "radial-gradient(circle at 50% 50%, hsl(220 50% 14%), hsl(225 70% 6%))",
            ].join(", "),
            boxShadow: [
              "0 0 0 1.5px hsl(220 14% 10%)",
              "0 1px 0 hsl(0 0% 100% / 0.25) inset",
              "0 -1px 2px hsl(0 0% 0% / 0.6) inset",
              `0 0 10px hsl(${accent} / 0.6)`,
            ].join(", "),
          }}
        />
      </div>
      {label && <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>}
    </div>
  );
}
