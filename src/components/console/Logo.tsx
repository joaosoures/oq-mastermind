import logo from "@/assets/oqmed-logo.png";
import { cn } from "@/lib/utils";

export default function Logo({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src={logo}
        alt="OQ MED"
        height={size}
        style={{ height: size, width: "auto" }}
        className="select-none"
        draggable={false}
      />
    </span>
  );
}
