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

const VARIANTS: Record<Variant, string> = {
  primary:
    "text-white bg-[hsl(var(--accent))] " +
    "[--btn-top:hsl(226_100%_62%)] [--btn-bot:hsl(226_100%_46%)] " +
    "bg-gradient-to-b from-[var(--btn-top)] to-[var(--btn-bot)]",
  neutral:
    "text-[hsl(var(--primary))] bg-white " +
    "[--btn-top:hsl(0_0%_100%)] [--btn-bot:hsl(220_14%_92%)] " +
    "bg-gradient-to-b from-[var(--btn-top)] to-[var(--btn-bot)]",
  danger:
    "text-white " +
    "[--btn-top:hsl(4_95%_64%)] [--btn-bot:hsl(4_85%_50%)] " +
    "bg-gradient-to-b from-[var(--btn-top)] to-[var(--btn-bot)]",
  ghost:
    "text-[hsl(var(--primary))] bg-transparent shadow-none hover:bg-[hsl(var(--accent)/0.08)]",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-sm rounded-2xl",
  md: "h-11 px-5 text-sm rounded-2xl",
  lg: "h-14 px-7 text-base rounded-[22px]",
  xl: "h-16 px-9 text-lg rounded-[26px]",
};

const TactileButton = forwardRef<HTMLButtonElement, Props>(function TactileButton(
  { variant = "primary", size = "md", haptic = true, className, onPointerDown, onClick, children, ...rest }, ref
) {
  return (
    <button
      ref={ref}
      {...rest}
      onPointerDown={(e) => { ensureAudio(); if (haptic && !rest.disabled) feedback("tap"); onPointerDown?.(e); }}
      onClick={onClick}
      className={cn(
        "tactile-btn relative inline-flex items-center justify-center gap-2 select-none font-semibold",
        "active:translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {children}
    </button>
  );
});

export default TactileButton;
