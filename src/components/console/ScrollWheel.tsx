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
    while (stateRef.current.accum >= TICK_DEG) { stateRef.current.accum -= TICK_DEG; feedback("tick"); onTick?.(1); }
    while (stateRef.current.accum <= -TICK_DEG) { stateRef.current.accum += TICK_DEG; feedback("tick"); onTick?.(-1); }
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

  const renderVariant = () => {
    switch (variant) {
      case "minimal":
        // Anel fino, plano, com indicador
        return (
          <>
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: "2px solid hsl(var(--foreground) / 0.25)",
                background: "transparent",
              }}
            />
            <div
              className="absolute inset-[8%] rounded-full"
              style={{
                border: "1px solid hsl(var(--foreground) / 0.12)",
                transform: `rotate(${angle}deg)`,
                transition: dragging ? "none" : "transform 0.5s cubic-bezier(.2,.8,.2,1)",
              }}
            >
              <div
                className="absolute rounded-full"
                style={{
                  width: "10%", height: "10%", left: "85%", top: "45%",
                  background: dragging ? "hsl(var(--accent))" : "hsl(var(--foreground) / 0.5)",
                  boxShadow: dragging ? "0 0 8px hsl(var(--accent))" : "none",
                }}
              />
            </div>
          </>
        );

      case "industrial":
        // Anel metálico escuro com dentes/serrilha
        return (
          <>
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "conic-gradient(from 0deg, hsl(220 15% 22%), hsl(220 15% 38%), hsl(220 15% 22%), hsl(220 15% 38%), hsl(220 15% 22%))",
                boxShadow: "0 6px 18px hsl(0 0% 0% / 0.45), inset 0 2px 4px hsl(0 0% 100% / 0.15)",
              }}
            />
            {/* Dentes */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
              style={{ transform: `rotate(${angle}deg)`, transition: dragging ? "none" : "transform 0.4s ease-out" }}>
              {Array.from({ length: 24 }).map((_, i) => {
                const a = (i * 15) * Math.PI / 180;
                const x1 = 50 + 47 * Math.cos(a);
                const y1 = 50 + 47 * Math.sin(a);
                const x2 = 50 + 42 * Math.cos(a);
                const y2 = 50 + 42 * Math.sin(a);
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(0 0% 0% / 0.6)" strokeWidth="1" />;
              })}
            </svg>
            {/* Núcleo */}
            <div
              className="absolute inset-[28%] rounded-full grid place-items-center"
              style={{
                background: "radial-gradient(circle at 35% 30%, hsl(220 15% 55%), hsl(220 18% 18%) 70%)",
                boxShadow: "inset 0 2px 4px hsl(0 0% 100% / 0.2), inset 0 -3px 6px hsl(0 0% 0% / 0.5), 0 0 12px hsl(var(--accent) / 0.4)",
              }}
            >
              <div
                className="rounded-full"
                style={{
                  width: "30%", height: "30%",
                  background: dragging ? "hsl(var(--accent))" : "hsl(220 15% 30%)",
                  boxShadow: dragging ? "0 0 10px hsl(var(--accent))" : "none",
                }}
              />
            </div>
          </>
        );

      case "classic":
        // iPod clickwheel: branco, central button visível, marcações cardinais
        return (
          <>
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle at 50% 35%, hsl(0 0% 100%), hsl(0 0% 92%) 70%, hsl(0 0% 84%) 100%)",
                boxShadow: "0 0 0 1.5px hsl(0 0% 70%), 0 4px 14px hsl(0 0% 0% / 0.18), inset 0 1px 2px hsl(0 0% 100%)",
              }}
            />
            {/* Marcas cardinais */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
              <text x="50" y="16" textAnchor="middle" fontSize="6" fontWeight="700" fill="hsl(0 0% 50%)">MENU</text>
              <text x="50" y="92" textAnchor="middle" fontSize="8" fontWeight="700" fill="hsl(0 0% 50%)">▶▶</text>
              <text x="14" y="54" textAnchor="middle" fontSize="8" fontWeight="700" fill="hsl(0 0% 50%)">◀◀</text>
              <text x="86" y="54" textAnchor="middle" fontSize="6" fontWeight="700" fill="hsl(0 0% 50%)">▶❙❙</text>
            </svg>
            {/* Botão central */}
            <div
              className="absolute inset-[35%] rounded-full"
              style={{
                background: "radial-gradient(circle at 50% 35%, hsl(0 0% 100%), hsl(0 0% 88%))",
                boxShadow: "inset 0 1px 2px hsl(0 0% 100%), 0 0 0 1px hsl(0 0% 70%), 0 2px 6px hsl(0 0% 0% / 0.2)",
              }}
            />
          </>
        );

      default:
        // Neumorphic dial original
        return (
          <>
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "hsl(var(--background))",
                boxShadow: [
                  "12px 12px 28px hsl(var(--neu-dark) / 0.7)",
                  "-12px -12px 28px hsl(var(--neu-light) / 0.45)",
                  "0 0 40px hsl(var(--accent) / 0.15)",
                ].join(", "),
              }}
            />
            <div
              className="absolute inset-[3%] rounded-full"
              style={{
                background: "radial-gradient(circle at 50% 50%, hsl(var(--background)) 60%, hsl(var(--neu-dark) / 0.1) 100%)",
                boxShadow: [
                  "0 0 0 1.5px hsl(var(--foreground) / 0.85)",
                  "inset 6px 6px 14px hsl(var(--neu-dark) / 0.55)",
                  "inset -6px -6px 14px hsl(var(--neu-light) / 0.45)",
                ].join(", "),
                transform: `rotate(${angle}deg)`,
                transition: dragging ? "none" : "transform 0.5s cubic-bezier(.2,.8,.2,1)",
              }}
            >
              <div
                className="absolute rounded-full"
                style={{
                  width: "9%", height: "9%", left: "82%", top: "46%",
                  background: dragging
                    ? "radial-gradient(circle at 35% 30%, hsl(140 90% 78%), hsl(140 80% 45%) 70%)"
                    : "radial-gradient(circle at 35% 30%, hsl(220 12% 35%), hsl(220 18% 18%) 70%)",
                  boxShadow: dragging
                    ? "0 0 12px hsl(140 80% 55% / 0.95), 0 0 26px hsl(140 80% 55% / 0.55)"
                    : "inset 0 1px 2px hsl(0 0% 0% / 0.5)",
                }}
              />
            </div>
            <div
              className="absolute inset-[22%] rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(circle at 38% 32%, hsl(var(--neu-light) / 0.5) 0%, hsl(var(--background)) 45%, hsl(var(--neu-dark)) 100%)",
                boxShadow: "inset 4px 4px 10px hsl(var(--neu-light) / 0.4), inset -6px -6px 14px hsl(var(--neu-dark) / 0.55)",
              }}
            />
            <div
              className="absolute pointer-events-none rounded-full"
              style={{
                inset: "26%",
                background: "radial-gradient(ellipse at 40% 25%, hsl(0 0% 100% / 0.85) 0%, hsl(0 0% 100% / 0) 55%)",
                filter: "blur(1px)",
              }}
            />
          </>
        );
    }
  };

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
        {renderVariant()}
      </div>
      {label && <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>}
    </div>
  );
}
