import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { feedback, ensureAudio } from "@/lib/sensory";

type Variant = "primary" | "neutral" | "danger" | "ghost" | "warning";
type Size = "sm" | "md" | "lg" | "xl";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  haptic?: boolean;
}

/**
 * Pílula 3D inspirada no botão "Confirmar" (gradiente azul→roxo→rosa,
 * bisel claro, sombra projetada e halo difuso). Pressiona em Y com
 * inversão sutil de iluminação.
 */
// Paleta restrita: #001D39, #0A4174, #49769F, #4E8EA2, #6EA2B3, #7BBDE8, #BDD8E9
const VARIANTS: Record<Variant, { gradient: string; text: string; bezel: string; halo: string; ring: string }> = {
  primary: {
    gradient: "linear-gradient(180deg, hsl(220 23% 97%) 0%, hsl(205 50% 90%) 100%)",
    text: "text-[hsl(211_100%_11%)]",
    bezel: "hsl(218 24% 86%)",
    halo: "hsl(205 67% 70% / 0.55)",
    ring: "hsl(205 67% 70%)",
  },
  neutral: {
    gradient: "linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(220 20% 92%) 100%)",
    text: "text-[hsl(var(--primary))]",
    bezel: "hsl(218 24% 86%)",
    halo: "hsl(218 24% 70% / 0.35)",
    ring: "hsl(205 67% 70%)",
  },
  danger: {
    gradient: "linear-gradient(180deg, hsl(0 90% 98%) 0%, hsl(0 80% 94%) 100%)",
    text: "text-red-900",
    bezel: "hsl(0 70% 88%)",
    halo: "rgba(239, 68, 68, 0.4)",
    ring: "rgb(239, 68, 68)",
  },
  warning: {
    gradient: "linear-gradient(180deg, hsl(35 100% 98%) 0%, hsl(35 90% 94%) 100%)",
    text: "text-orange-900",
    bezel: "hsl(35 80% 88%)",
    halo: "rgba(249, 115, 22, 0.4)",
    ring: "rgb(249, 115, 22)",
  },
  ghost: {
    gradient: "transparent",
    text: "text-[hsl(var(--primary))]",
    bezel: "transparent",
    halo: "transparent",
    ring: "hsl(205 67% 70%)",
  },
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-5 text-sm rounded-full",
  md: "h-11 px-6 text-sm rounded-full",
  lg: "h-14 px-8 text-base rounded-full",
  xl: "h-16 px-10 text-lg rounded-full",
};

const TactileButton = forwardRef<HTMLButtonElement, Props>(function TactileButton(
  { variant = "primary", size = "md", haptic = true, className, onPointerDown, onClick, children, style, ...rest }, ref
) {
  const v = VARIANTS[variant];
  const isGhost = variant === "ghost";

  return (
    <button
      ref={ref}
      {...rest}
      onPointerDown={(e) => { ensureAudio(); if (haptic && !rest.disabled) feedback("tap"); onPointerDown?.(e); }}
      onClick={onClick}
      className={cn(
        "pill-btn relative inline-flex items-center justify-center gap-2 select-none font-semibold tracking-tight",
        "transition-[transform,box-shadow,filter] duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "active:translate-y-[2px]",
        v.text,
        SIZES[size],
        isGhost && "hover:bg-[hsl(var(--accent)/0.08)]",
        className,
      )}
      style={{
        background: isGhost ? undefined : v.gradient,
        // Neumorphism: bisel claro + sombra escura, sombra clara, halo neon (azul paleta)
        boxShadow: isGhost
          ? undefined
          : [
              `0 0 0 1px ${v.bezel}`,
              `0 1px 0 hsl(0 0% 100% / 0.9) inset`,
              `0 -2px 4px hsl(218 24% 70% / 0.35) inset`,
              `8px 8px 18px hsl(218 24% 70% / 0.55)`,
              `-8px -8px 18px hsl(0 0% 100% / 0.95)`,
              `0 0 24px ${v.halo}`,
            ].join(", "),
        outlineColor: v.ring,
        ...style,
      }}
    >
      {/* Reflexo superior (highlight especular) */}
      {!isGhost && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-3 top-[3px] h-[42%] rounded-full opacity-60"
          style={{
            background:
              "linear-gradient(180deg, hsl(0 0% 100% / 0.85) 0%, hsl(0 0% 100% / 0) 100%)",
            filter: "blur(0.5px)",
          }}
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
      </span>
    </button>
  );
});

export default TactileButton;
