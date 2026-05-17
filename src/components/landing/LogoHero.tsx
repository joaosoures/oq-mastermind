import { motion } from "framer-motion";
import logo from "@/assets/oqmed-logo-hero-final.png";

/**
 * Palavras que orbitam a logo, passando por trás e pela frente
 * para criar profundidade tridimensional.
 */
const FloatingWord = ({ text, delay, duration, yOffset }: { text: string, delay: number, duration: number, yOffset: number }) => {
  return (
    <motion.div
      className="absolute text-primary/40 font-bold text-lg pointer-events-none whitespace-nowrap"
      initial={{ x: "-150%", zIndex: 0, opacity: 0 }}
      animate={{ 
        x: ["-150%", "150%"],
        zIndex: [0, 0, 20, 20, 0], // Passa por trás (0) e depois pela frente (20)
        opacity: [0, 1, 1, 1, 0],
        scale: [0.8, 1, 1.2, 1, 0.8],
      }}
      transition={{ 
        duration: duration, 
        repeat: Infinity, 
        delay: delay,
        ease: "linear"
      }}
      style={{ top: `${50 + yOffset}%` }}
    >
      {text}
    </motion.div>
  );
};

export default function LogoHero() {
  const words = [
    { text: "Residência", delay: 0, duration: 8, yOffset: -20 },
    { text: "Questões", delay: 2, duration: 7, yOffset: 10 },
    { text: "Medicina", delay: 4, duration: 9, yOffset: -5 },
    { text: "Desempenho", delay: 1, duration: 10, yOffset: 25 },
    { text: "Flashcards", delay: 5, duration: 8, yOffset: -12 },
  ];

  return (
    <div className="relative flex items-center justify-center py-10 overflow-hidden w-full max-w-4xl mx-auto">
      {/* Halo radial pulsante */}
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(circle, hsl(var(--accent)) 0%, hsl(var(--primary) / 0.4) 40%, transparent 70%)",
        }}
      />

      {/* Container das palavras voando */}
      <div className="absolute inset-0 z-0">
        {words.map((word, i) => (
          <FloatingWord key={i} {...word} />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8, filter: "blur(15px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10" // Z-index intermediário para permitir sobreposição
        whileHover={{ scale: 1.05, rotate: -0.5 }}
      >
        <motion.img
          src={logo}
          alt="OQ MED"
          draggable={false}
          // Reduzi o tamanho conforme solicitado (de 640px para 500px no desktop)
          className="select-none w-[320px] sm:w-[400px] md:w-[500px] h-auto drop-shadow-2xl"
          style={{
            filter:
              "drop-shadow(0 10px 20px hsl(var(--foreground) / 0.15)) drop-shadow(0 25px 50px hsl(var(--primary) / 0.3))",
          }}
          animate={{ y: [0, -8, 0] }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </div>
  );
}

