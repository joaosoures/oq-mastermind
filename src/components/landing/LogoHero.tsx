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
        className="select-none w-[220px] sm:w-[280px] md:w-[340px] h-auto"
        style={{
          filter:
            "drop-shadow(0 18px 28px hsl(230 60% 18% / 0.18)) drop-shadow(0 6px 10px hsl(230 60% 18% / 0.12))",
        }}
      />
    </motion.div>
  );
}
