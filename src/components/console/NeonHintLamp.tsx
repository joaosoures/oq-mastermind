import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { feedback } from "@/lib/sensory";

/**
 * Domo 3D com lâmpada azul neon e 3 indicadores embutidos.
 * Inspirado no mock: berço claro, dome interno levemente recuado,
 * ícone com glow azul elétrico, dots em "soquetes".
 */
export default function NeonHintLamp({
  used, max = 3, onClick, disabled,
}: { used: number; max?: number; onClick: () => void; disabled?: boolean }) {
  const remaining = max - used;
  const off = disabled || remaining <= 0;

  return (
    <div className="flex flex-col items-center gap-2.5">
      <button
        onClick={() => { if (off) return; feedback("hint"); onClick(); }}
        disabled={off}
        aria-label="Desmistificar"
        className={cn(
          "relative h-16 w-16 rounded-full grid place-items-center select-none",
          "transition-[transform,box-shadow,filter] duration-150 ease-out",
          "active:translate-y-[2px]",
          remaining > 0 && "animate-lamp-pulse",
          off && "opacity-50",
        )}
        style={{
          background: "radial-gradient(circle at 30% 25%, hsl(var(--neu-light) / 0.5) 0%, hsl(var(--background)) 55%, hsl(var(--neu-dark)) 100%)",
          boxShadow: [
            "0 0 0 1.5px hsl(var(--border))",
            "0 1px 0 hsl(var(--neu-light) / 0.4) inset",
            "0 -3px 8px hsl(var(--neu-dark) / 0.35) inset",
            "0 8px 18px -6px hsl(var(--neu-dark) / 0.35)",
            "0 22px 44px -16px hsl(var(--neu-dark) / 0.3)",
          ].join(", "),
        }}
      >
        {/* Domo interno recuado */}
        <span
          aria-hidden
          className="absolute inset-[14%] rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 28%, hsl(var(--neu-light) / 0.4) 0%, hsl(var(--background)) 60%, hsl(var(--neu-dark)) 100%)",
            boxShadow: "0 1px 0 hsl(var(--neu-light) / 0.4) inset, 0 -2px 6px hsl(var(--neu-dark) / 0.25) inset",
          }}
        />
        {/* Ícone */}
        <Lightbulb
          className="relative h-7 w-7"
          strokeWidth={2.4}
          style={{
            color: "hsl(var(--accent))",
            filter: remaining > 0
              ? "drop-shadow(0 0 6px hsl(var(--accent) / 0.85)) drop-shadow(0 0 12px hsl(var(--accent) / 0.4))"
              : "none",
          }}
        />
      </button>

      {/* Indicadores em "soquetes" */}
      <div className="flex gap-1.5">
        {Array.from({ length: max }).map((_, i) => {
          const isOn = i >= used;
          return (
            <span
              key={i}
              className="relative h-3.5 w-3.5 rounded-full grid place-items-center"
              style={{
                background: "linear-gradient(180deg, hsl(var(--background)), hsl(var(--neu-dark)))",
                boxShadow: "0 0 0 1px hsl(var(--border)), 0 -1px 2px hsl(var(--neu-light) / 0.5) inset, 0 1px 2px hsl(var(--neu-dark) / 0.25) inset",
              }}
            >
              <span
                className={cn("h-2 w-2 rounded-full transition")}
                style={
                  isOn
                    ? {
                        background: "radial-gradient(circle at 30% 25%, hsl(200 100% 88%), hsl(220 100% 55%) 60%, hsl(225 90% 42%))",
                        boxShadow: "0 0 6px hsl(220 100% 60% / 0.9), 0 0 12px hsl(220 100% 60% / 0.4)",
                      }
                    : { background: "hsl(220 14% 78%)" }
                }
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}
