import { motion } from "framer-motion";
import logo from "@/assets/oqmed-logo.png";

/**
 * Logo central — entrada cinematográfica com halo pulsante e flutuação suave.
 * A logo real é "O Q" com selo "MED" no centro, em proporção quase quadrada.
 */
export default function LogoHero() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, filter: "blur(12px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex items-center justify-center"
    >
      {/* Halo difuso pulsante */}
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10 blur-3xl"
        animate={{ opacity: [0.3, 0.55, 0.3], scale: [0.95, 1.08, 0.95] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(closest-side, hsl(205 67% 70% / 0.55), transparent 70%)",
        }}
      />

      {/* Anel de luz fino atrás */}
      <motion.div
        aria-hidden
        className="absolute -z-10 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        style={{
          width: "120%",
          height: "120%",
          background:
            "conic-gradient(from 0deg, transparent 0deg, hsl(205 67% 70% / 0.18) 90deg, transparent 180deg, hsl(210 83% 35% / 0.12) 270deg, transparent 360deg)",
          filter: "blur(20px)",
        }}
      />

      <motion.img
        src={logo}
        alt="OQ MED"
        draggable={false}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="select-none w-[160px] sm:w-[200px] md:w-[240px] h-auto"
        style={{
          filter:
            "drop-shadow(0 14px 26px hsl(211 100% 11% / 0.22)) drop-shadow(0 32px 56px hsl(211 100% 11% / 0.18)) drop-shadow(0 2px 4px hsl(211 100% 11% / 0.18))",
        }}
      />
    </motion.div>
  );
}
