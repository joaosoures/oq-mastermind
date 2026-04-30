import { cn } from "@/lib/utils";

export default function NeonProgressBar({
  value, total, className,
}: { value: number; total: number; className?: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className={cn("w-full h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden relative", className)}>
      <div
        className="h-full rounded-full relative overflow-hidden transition-[width] duration-500 ease-out"
        style={{
          width: `${pct}%`,
          background: "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
          boxShadow: "0 0 12px hsl(var(--accent) / 0.65)",
        }}
      >
        <div
          className="absolute inset-0 animate-progress-shine"
          style={{
            backgroundImage: "linear-gradient(90deg, transparent 0%, hsl(0 0% 100% / 0.6) 50%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
}
