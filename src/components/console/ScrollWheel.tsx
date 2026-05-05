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
        {/* Halo neumorphism externo (sombra escura + luz) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "hsl(220 23% 95%)",
            boxShadow: [
              "12px 12px 28px hsl(218 24% 70% / 0.7)",
              "-12px -12px 28px hsl(0 0% 100% / 0.95)",
              "0 0 40px hsl(205 67% 70% / 0.25)",
            ].join(", "),
          }}
        />

        {/* Aro fino escuro (contorno do dial estilo "rodinha de iPod") */}
        <div
          className="absolute inset-[3%] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, hsl(220 22% 96%) 60%, hsl(220 18% 88%) 100%)",
            boxShadow: [
              "0 0 0 1.5px hsl(211 100% 11% / 0.85)",         // contorno preto fino
              "inset 6px 6px 14px hsl(218 24% 75% / 0.55)",
              "inset -6px -6px 14px hsl(0 0% 100% / 0.95)",
            ].join(", "),
            transform: `rotate(${angle}deg)`,
            transition: dragging ? "none" : "transform 0.5s cubic-bezier(.2,.8,.2,1)",
          }}
        >
          {/* LED indicador (verde quando girando, escuro em repouso) — copia da inspiração */}
          <div
            className="absolute rounded-full"
            style={{
              width: "9%",
              height: "9%",
              left: "82%",
              top: "46%",
              background: dragging
                ? "radial-gradient(circle at 35% 30%, hsl(140 90% 78%), hsl(140 80% 45%) 70%)"
                : "radial-gradient(circle at 35% 30%, hsl(220 12% 35%), hsl(220 18% 18%) 70%)",
              boxShadow: dragging
                ? "0 0 12px hsl(140 80% 55% / 0.95), 0 0 26px hsl(140 80% 55% / 0.55), inset 0 -1px 2px hsl(0 0% 0% / 0.4)"
                : "inset 0 1px 2px hsl(0 0% 0% / 0.5)",
            }}
          />

          {/* Texto micro-impresso curvo "LADIES AND GENTLEMEN · THIS IS RYE" */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none opacity-50"
            viewBox="0 0 100 100"
          >
            <defs>
              <path
                id="dial-text-arc"
                d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"
              />
            </defs>
            <text
              fontSize="3.6"
              fill="hsl(211 100% 11%)"
              letterSpacing="0.6"
              fontFamily="Inter, sans-serif"
              fontWeight="500"
            >
              <textPath href="#dial-text-arc" startOffset="0">
                OQ FALTA · APROVAÇÃO MOVIDA POR REPETIÇÃO · OQ FALTA ·
              </textPath>
            </text>
          </svg>
        </div>

        {/* Domo central (suave concavidade neumorphism) */}
        <div
          className="absolute inset-[22%] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 38% 32%, hsl(0 0% 100%) 0%, hsl(220 22% 94%) 45%, hsl(220 18% 86%) 100%)",
            boxShadow: [
              "inset 4px 4px 10px hsl(0 0% 100% / 0.9)",
              "inset -6px -6px 14px hsl(218 24% 72% / 0.55)",
              "0 2px 6px hsl(218 24% 60% / 0.25)",
            ].join(", "),
          }}
        />

        {/* Reflexo especular topo */}
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            inset: "26%",
            background:
              "radial-gradient(ellipse at 40% 25%, hsl(0 0% 100% / 0.85) 0%, hsl(0 0% 100% / 0) 55%)",
            filter: "blur(1px)",
          }}
        />
      </div>
      {label && <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>}
    </div>
  );
}
