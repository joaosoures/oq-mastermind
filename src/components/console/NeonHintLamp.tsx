import { Lightbulb, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { feedback } from "@/lib/sensory";

export default function NeonHintLamp({
  used, max = 3, onClick, disabled, className, variant = "default",
}: { used: number; max?: number; onClick: () => void; disabled?: boolean; className?: string; variant?: string }) {
  const remaining = max - used;
  const off = disabled || remaining <= 0;

  const renderButton = () => {
    switch (variant) {
      case "led":
        // LED matrix: pixelado, retangular, monocromático
        return (
          <div
            className="relative h-16 w-16 rounded-lg grid place-items-center"
            style={{
              background: "hsl(220 25% 8%)",
              boxShadow: "inset 0 2px 6px hsl(0 0% 0% / 0.7), 0 0 0 2px hsl(220 15% 25%), 0 4px 12px hsl(0 0% 0% / 0.4)",
            }}
          >
            {/* LED grid 5x5 simulando lâmpada */}
            <div className="grid grid-cols-5 gap-[2px] p-2">
              {[
                0,1,1,1,0,
                1,1,1,1,1,
                1,1,1,1,1,
                0,1,1,1,0,
                0,0,1,0,0,
              ].map((on, i) => (
                <span
                  key={i}
                  className="w-[3px] h-[3px] rounded-[1px]"
                  style={{
                    background: on && remaining > 0 ? "hsl(140 85% 55%)" : "hsl(220 20% 18%)",
                    boxShadow: on && remaining > 0 ? "0 0 4px hsl(140 85% 55%)" : "none",
                  }}
                />
              ))}
            </div>
          </div>
        );

      case "holo":
        // Holográfico: gradiente iridescente, transparente, com sparkles
        return (
          <div
            className="relative h-16 w-16 rounded-full grid place-items-center overflow-hidden"
            style={{
              background: "conic-gradient(from 0deg, hsl(280 80% 70% / 0.4), hsl(180 80% 70% / 0.4), hsl(60 80% 70% / 0.4), hsl(320 80% 70% / 0.4), hsl(280 80% 70% / 0.4))",
              backdropFilter: "blur(8px)",
              boxShadow: "0 0 0 1px hsl(0 0% 100% / 0.3), 0 0 30px hsl(280 80% 70% / 0.5), inset 0 0 20px hsl(0 0% 100% / 0.2)",
            }}
          >
            <Sparkles
              className="absolute h-3 w-3 top-2 right-2 animate-pulse"
              style={{ color: "hsl(0 0% 100%)" }}
            />
            <Lightbulb
              className="relative h-7 w-7"
              strokeWidth={1.5}
              style={{
                color: "hsl(0 0% 100%)",
                filter: remaining > 0 ? "drop-shadow(0 0 8px hsl(280 100% 80%))" : "none",
              }}
            />
          </div>
        );

      case "minimal":
        // Outline limpo, sem dome, sem sombras
        return (
          <div
            className="relative h-16 w-16 rounded-full grid place-items-center"
            style={{
              background: "transparent",
              border: "1.5px solid hsl(var(--foreground) / 0.3)",
            }}
          >
            <Lightbulb
              className="h-7 w-7"
              strokeWidth={1.5}
              style={{
                color: remaining > 0 ? "hsl(var(--accent))" : "hsl(var(--foreground) / 0.3)",
              }}
            />
          </div>
        );

      default:
        // Neumórfico domo original
        return (
          <div
            className="relative h-16 w-16 rounded-full grid place-items-center"
            style={{
              background: "radial-gradient(circle at 30% 25%, hsl(var(--neu-light) / 0.5) 0%, hsl(var(--background)) 55%, hsl(var(--neu-dark)) 100%)",
              boxShadow: [
                "0 0 0 1.5px hsl(var(--border))",
                "0 1px 0 hsl(var(--neu-light) / 0.4) inset",
                "0 -3px 8px hsl(var(--neu-dark) / 0.35) inset",
                "0 8px 18px -6px hsl(var(--neu-dark) / 0.35)",
              ].join(", "),
            }}
          >
            <span
              aria-hidden
              className="absolute inset-[14%] rounded-full"
              style={{
                background: "radial-gradient(circle at 35% 28%, hsl(var(--neu-light) / 0.4) 0%, hsl(var(--background)) 60%, hsl(var(--neu-dark)) 100%)",
                boxShadow: "0 1px 0 hsl(var(--neu-light) / 0.4) inset, 0 -2px 6px hsl(var(--neu-dark) / 0.25) inset",
              }}
            />
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
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col items-center gap-2.5">
      <button
        onClick={() => { if (off) return; feedback("hint"); onClick(); }}
        disabled={off}
        aria-label="Desmistificar"
        className={cn(
          "select-none transition-[transform,filter] duration-150 ease-out active:translate-y-[2px]",
          remaining > 0 && variant === "default" && "animate-lamp-pulse",
          off && "opacity-50",
          className,
        )}
      >
        {renderButton()}
      </button>

      {/* Indicadores */}
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
                        background: "radial-gradient(circle at 30% 25%, hsl(var(--accent) / 0.5), hsl(var(--accent)) 60%, hsl(var(--primary-glow)))",
                        boxShadow: "0 0 6px hsl(var(--accent) / 0.9)",
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
