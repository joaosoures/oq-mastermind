import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { feedback } from "@/lib/sensory";

export default function NeonHintLamp({
  used, max = 3, onClick, disabled,
}: { used: number; max?: number; onClick: () => void; disabled?: boolean }) {
  const remaining = max - used;
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={() => { if (disabled) return; feedback("hint"); onClick(); }}
        disabled={disabled || remaining <= 0}
        aria-label="Desmistificar"
        className={cn(
          "h-14 w-14 rounded-full grid place-items-center transition",
          "bg-white tactile-btn",
          remaining > 0 && "animate-lamp-pulse",
          (disabled || remaining <= 0) && "opacity-50",
        )}
        style={{ color: "hsl(var(--accent))" }}
      >
        <Lightbulb className="h-6 w-6" strokeWidth={2.2} />
      </button>
      <div className="flex gap-1.5">
        {Array.from({ length: max }).map((_, i) => {
          const isOn = i >= used;
          return (
            <span key={i} className="relative h-2 w-2">
              <span
                className={cn(
                  "absolute inset-0 rounded-full transition",
                  isOn ? "bg-[hsl(var(--accent))] shadow-[0_0_8px_hsl(var(--accent)/0.7)]" : "bg-muted-foreground/20",
                )}
              />
              {!isOn && i === used - 1 && (
                <span className="absolute inset-0 rounded-full bg-[hsl(var(--accent)/0.5)] animate-smoke" />
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
