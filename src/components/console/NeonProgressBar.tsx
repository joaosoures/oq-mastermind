import { cn } from "@/lib/utils";

/**
 * Barra de progresso neumorphism: trilho côncavo + LEDs azuis acendendo
 * progressivamente + esfera 3D ("knob") deslizando no fim. Inspirada no
 * mock anexado.
 */
export default function NeonProgressBar({
  value, total, className,
}: { value: number; total: number; className?: string }) {
  const safeTotal = Math.max(1, total);
  const dots = Math.min(safeTotal, 12); // até 12 leds para não poluir
  const lit = Math.min(dots, Math.round((value / safeTotal) * dots));
  const knobPct = Math.min(100, Math.max(0, (value / safeTotal) * 100));

  return (
    <div className={cn("relative w-full", className)}>
      {/* Trilho neumorphism côncavo */}
      <div
        className="relative h-7 w-full rounded-full"
        style={{
          background: "hsl(220 23% 95%)",
          boxShadow: [
            "inset 5px 5px 10px hsl(218 24% 75% / 0.65)",
            "inset -5px -5px 10px hsl(0 0% 100% / 0.95)",
            "0 1px 0 hsl(0 0% 100% / 0.6)",
          ].join(", "),
        }}
      >
        {/* LEDs */}
        <div className="absolute inset-0 flex items-center justify-around px-5">
          {Array.from({ length: dots }).map((_, i) => {
            const on = i < lit;
            return (
              <span
                key={i}
                className="block h-1.5 w-1.5 rounded-full transition-all duration-500"
                style={{
                  background: on
                    ? "radial-gradient(circle at 30% 30%, hsl(205 100% 92%), hsl(205 80% 60%) 70%)"
                    : "radial-gradient(circle at 30% 30%, hsl(220 18% 80%), hsl(220 18% 70%) 70%)",
                  boxShadow: on
                    ? "0 0 6px hsl(205 80% 60% / 0.95), 0 0 14px hsl(205 80% 60% / 0.55)"
                    : "inset 0 1px 1px hsl(0 0% 0% / 0.15)",
                }}
              />
            );
          })}
        </div>

        {/* Knob (esfera 3D) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-[left] duration-700 ease-out"
          style={{ left: `calc(${knobPct}% - 14px)` }}
        >
          <div
            className="h-7 w-7 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 32% 28%, hsl(0 0% 100%) 0%, hsl(220 22% 94%) 50%, hsl(220 18% 80%) 100%)",
              boxShadow: [
                "0 0 0 1px hsl(218 24% 80%)",
                "inset 2px 2px 4px hsl(0 0% 100% / 0.9)",
                "inset -3px -3px 6px hsl(218 24% 70% / 0.55)",
                "3px 4px 8px hsl(218 24% 55% / 0.45)",
                "0 0 18px hsl(205 67% 70% / 0.35)",
              ].join(", "),
            }}
          />
        </div>
      </div>
    </div>
  );
}
