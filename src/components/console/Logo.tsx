import logo from "@/assets/oqmed-logo.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  /** Intensidade da sombra projetada. */
  shadow?: "none" | "sm" | "md" | "lg";
}

const SHADOW: Record<NonNullable<LogoProps["shadow"]>, string> = {
  none: "none",
  sm: "drop-shadow(0 1px 2px hsl(230 60% 18% / 0.18)) drop-shadow(0 2px 6px hsl(230 60% 18% / 0.12))",
  md: "drop-shadow(0 4px 8px hsl(230 60% 18% / 0.22)) drop-shadow(0 10px 20px hsl(230 60% 18% / 0.16))",
  lg: "drop-shadow(0 10px 18px hsl(230 60% 18% / 0.25)) drop-shadow(0 24px 40px hsl(230 60% 18% / 0.18))",
};

export default function Logo({ className, size = 32, shadow = "sm" }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <img
        src={logo}
        alt="OQ MED"
        height={size}
        style={{ height: size, width: "auto", filter: SHADOW[shadow] }}
        className="select-none"
        draggable={false}
      />
    </span>
  );
}
