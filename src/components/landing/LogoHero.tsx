import { motion } from "framer-motion";
import logo from "@/assets/oqmed-logo.png";

/**
 * Logo central — entrada cinematográfica em estágios:
 * 1) Surge desfocada e pequena (presença do "O")
 * 2) Desliza levemente e ganha foco (o "Q" se junta)
 * 3) Pulso final + flash de luz (selo "MED" assenta)
 * 4) Flutuação contínua sutil + halo pulsante
 */
export default function LogoHero() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Halo sutil */}
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10 blur-3xl opacity-20"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle, hsl(var(--accent)), transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <motion.img
          src={logo}
          alt="OQ MED"
          draggable={false}
          className="select-none w-[200px] sm:w-[240px] md:w-[320px] h-auto drop-shadow-2xl"
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </div>
  );
}
