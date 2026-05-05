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
    <motion.div
      initial="hidden"
      animate="visible"
      className="relative flex items-center justify-center"
    >
      {/* Halo difuso pulsante contínuo */}
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10 blur-3xl"
        animate={{ opacity: [0.25, 0.55, 0.25], scale: [0.95, 1.1, 0.95] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(closest-side, hsl(205 67% 70% / 0.55), transparent 70%)",
        }}
      />

      {/* Anel cônico rotativo de fundo */}
      <motion.div
        aria-hidden
        className="absolute -z-10 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        style={{
          width: "130%",
          height: "130%",
          background:
            "conic-gradient(from 0deg, transparent 0deg, hsl(205 67% 70% / 0.18) 90deg, transparent 180deg, hsl(210 83% 35% / 0.12) 270deg, transparent 360deg)",
          filter: "blur(22px)",
        }}
      />

      {/* Wrapper que faz a entrada em estágios */}
      <motion.div
        variants={{
          hidden: { opacity: 0, scale: 0.55, x: -28, filter: "blur(14px)" },
          visible: {
            opacity: [0, 1, 1, 1],
            scale: [0.55, 0.92, 1.08, 1],
            x: [-28, -8, 4, 0],
            filter: ["blur(14px)", "blur(4px)", "blur(0px)", "blur(0px)"],
            transition: {
              duration: 1.8,
              times: [0, 0.45, 0.78, 1],
              ease: [0.22, 1, 0.36, 1],
            },
          },
        }}
        className="relative"
      >
        <motion.img
          src={logo}
          alt="OQ MED"
          draggable={false}
          // Flutuação sutil contínua após entrada
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.8 }}
          className="select-none w-[160px] sm:w-[200px] md:w-[240px] h-auto"
          style={{
            filter:
              "drop-shadow(0 14px 26px hsl(211 100% 11% / 0.22)) drop-shadow(0 32px 56px hsl(211 100% 11% / 0.18)) drop-shadow(0 2px 4px hsl(211 100% 11% / 0.18))",
          }}
        />

        {/* Flash de luz horizontal — varre a logo no estágio final */}
        <motion.div
          aria-hidden
          className="absolute inset-0 pointer-events-none mix-blend-screen rounded-2xl overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 0.9, 0] }}
          transition={{ duration: 1.8, times: [0, 0.55, 0.78, 1], ease: "easeOut" }}
        >
          <motion.div
            className="absolute top-0 bottom-0 w-1/3"
            initial={{ left: "-40%" }}
            animate={{ left: ["-40%", "-40%", "120%"] }}
            transition={{ duration: 1.8, times: [0, 0.55, 1], ease: [0.22, 1, 0.36, 1] }}
            style={{
              background:
                "linear-gradient(100deg, transparent 0%, hsl(0 0% 100% / 0.85) 50%, transparent 100%)",
              filter: "blur(8px)",
            }}
          />
        </motion.div>

        {/* Pulso de luz radial no momento do "assentamento" */}
        <motion.div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 0, 0.7, 0], scale: [0.6, 0.6, 1.6, 1.9] }}
          transition={{ duration: 1.8, times: [0, 0.55, 0.78, 1], ease: "easeOut" }}
          style={{
            background:
              "radial-gradient(circle, hsl(205 67% 70% / 0.6), transparent 60%)",
            filter: "blur(20px)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}
