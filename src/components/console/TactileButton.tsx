import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { feedback, ensureAudio } from "@/lib/sensory";

type Variant = "primary" | "neutral" | "danger" | "ghost";
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
const VARIANTS: Record<Variant, { gradient: string; text: string; bezel: string; halo: string; ring: string }> = {
  primary: {
    gradient: "linear-gradient(150deg, hsl(222 90% 38%) 0%, hsl(248 70% 52%) 45%, hsl(312 70% 70%) 100%)",
    text: "text-white",
    bezel: "hsl(220 25% 88%)",
    halo: "hsl(232 90% 55% / 0.45)",
    ring: "hsl(var(--accent))",
  },
  neutral: {
    gradient: "linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(220 14% 92%) 100%)",
    text: "text-[hsl(var(--primary))]",
    bezel: "hsl(220 18% 80%)",
    halo: "hsl(220 14% 70% / 0.35)",
    ring: "hsl(var(--accent))",
  },
  danger: {
    gradient: "linear-gradient(150deg, hsl(354 80% 42%) 0%, hsl(8 88% 56%) 50%, hsl(28 95% 68%) 100%)",
    text: "text-white",
    bezel: "hsl(10 30% 86%)",
    halo: "hsl(8 88% 55% / 0.45)",
    ring: "hsl(8 88% 56%)",
  },
  ghost: {
    gradient: "transparent",
    text: "text-[hsl(var(--primary))]",
    bezel: "transparent",
    halo: "transparent",
    ring: "hsl(var(--accent))",
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
        // Bisel externo (anel claro tipo "berço") + sombra projetada + glow halo
        boxShadow: isGhost
          ? undefined
          : [
              `0 0 0 1.5px ${v.bezel}`,                                  // bezel ring
              `0 1px 0 hsl(0 0% 100% / 0.45) inset`,                      // top highlight
              `0 -2px 6px hsl(0 0% 0% / 0.28) inset`,                     // bottom inner shadow
              `0 10px 20px -8px hsl(232 60% 18% / 0.45)`,                 // drop shadow
              `0 24px 50px -18px hsl(232 60% 18% / 0.35)`,                // soft floor
              `0 0 28px ${v.halo}`,                                        // halo glow
            ].join(", "),
        outlineColor: v.ring,
        ...style,
      }}
    >
      {/* Reflexo superior (highlight especular) */}
      {!isGhost && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-3 top-[3px] h-[42%] rounded-full opacity-70"
          style={{
            background:
              "linear-gradient(180deg, hsl(0 0% 100% / 0.45) 0%, hsl(0 0% 100% / 0) 100%)",
            filter: "blur(0.5px)",
          }}
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]">
        {children}
      </span>
    </button>
  );
});

export default TactileButton;
