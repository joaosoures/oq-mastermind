import { motion } from "framer-motion";
import logo from "@/assets/oqmed-logo.png";

/**
 * Logo central limpa, sem fundo, com sombra suave projetada.
 * Substitui o ParticleLogo (poluição visual).
 */
export default function LogoHero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex items-center justify-center"
    >
      {/* Halo difuso por trás */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 blur-3xl opacity-40"
        style={{
          background:
            "radial-gradient(closest-side, hsl(var(--accent) / 0.35), transparent 70%)",
        }}
      />
      <motion.img
        src={logo}
        alt="OQ MED"
        draggable={false}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="select-none w-[180px] sm:w-[240px] md:w-[300px] h-auto"
        style={{
          filter:
            "drop-shadow(0 12px 22px hsl(230 60% 18% / 0.22)) drop-shadow(0 28px 48px hsl(230 60% 18% / 0.18)) drop-shadow(0 2px 4px hsl(230 60% 18% / 0.15))",
        }}
      />
    </motion.div>
  );
}
