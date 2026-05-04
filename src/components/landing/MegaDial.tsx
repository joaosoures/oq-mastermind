import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { feedback, ensureAudio } from "@/lib/sensory";

const PHRASES = [
  {
    n: "01",
    title: "Algoritmo de Incidência",
    body: "O que realmente cai. Cada OQ é priorizado pelo histórico real das provas.",
  },
  {
    n: "02",
    title: "Diretrizes 2026",
    body: "Ciência atualizada. ESC, AHA, SBP, FEBRASGO — sempre na versão mais recente.",
  },
  {
    n: "03",
    title: "Active Recall Puro",
    body: "Sem múltipla escolha rasa. Você desmistifica a resposta com pistas progressivas.",
  },
  {
    n: "04",
    title: "Zero Distração",
    body: "Um card por vez. A IA decide o próximo. Você só precisa pensar.",
  },
];

const STEP = 90; // graus por mecanismo (4 × 90 = 360)

/**
 * Experiência scroll-locked 3D: ao chegar na seção, a visão "trava" e
 * cada bloco de scroll vira o dial 90°, revelando 1 mecanismo por vez,
 * tocando o tick do console real. 4 voltas → libera scroll.
 */
export default function MegaDial() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const lastTickRef = useRef(0);

  // Scroll progress dentro da seção (sticky)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // 0..1 → índice 0..3
  const [active, setActive] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    // mapeia em 4 segmentos
    const idx = Math.min(PHRASES.length - 1, Math.max(0, Math.floor(p * PHRASES.length * 0.999)));
    if (idx !== lastTickRef.current) {
      lastTickRef.current = idx;
      setActive(idx);
      feedback("tick");
    }
  });

  // Rotação contínua do dial atrelada ao scroll
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 360]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.92, 1.04, 1]);
  const tiltX = useTransform(scrollYProgress, [0, 1], [18, -8]);
  const glow = useTransform(scrollYProgress, [0, 0.5, 1], [0.25, 0.6, 0.4]);

  useEffect(() => {
    const onAny = () => ensureAudio();
    window.addEventListener("pointerdown", onAny, { once: true });
    window.addEventListener("wheel", onAny, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onAny);
      window.removeEventListener("wheel", onAny);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: "360vh" /* 4 mecanismos × ~viewport */ }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center">
        {/* Background 3D atmosférico */}
        <motion.div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse at 50% 40%, hsl(220 60% 14% / 0.15), transparent 60%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(220 30% 95%) 100%)",
          }}
        />
        <motion.div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(hsl(220 14% 30% / 0.06) 1px, transparent 1px), linear-gradient(90deg, hsl(220 14% 30% / 0.06) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          }}
        />

        <div className="container mx-auto h-full px-5 sm:px-6 grid grid-cols-1 md:grid-cols-2 items-center gap-8">
          {/* Dial 3D */}
          <div
            className="relative flex items-center justify-center order-2 md:order-1"
            style={{ perspective: "1200px" }}
          >
            <motion.div
              style={{
                rotateX: tiltX,
                scale,
                transformStyle: "preserve-3d",
              }}
              className="will-change-transform"
            >
              <motion.div style={{ rotate }} className="will-change-transform">
                <Dial3D size={340} />
              </motion.div>
            </motion.div>

            {/* Halo neon */}
            <motion.div
              aria-hidden
              className="absolute inset-0 -z-10 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle at center, hsl(var(--accent) / 1) 0%, transparent 60%)",
                opacity: glow,
              }}
            />
          </div>

          {/* Painel de mecanismos */}
          <div className="order-1 md:order-2">
            <div className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--accent))] mb-3">
              A engrenagem
            </div>
            <h3 className="text-3xl md:text-5xl font-semibold tracking-tight text-[hsl(var(--primary))] leading-[1.05]">
              Quatro mecanismos.<br />
              <span className="text-[hsl(var(--accent))]">Uma aprovação.</span>
            </h3>

            {/* Indicador de progresso (4 segmentos) */}
            <div className="mt-8 flex items-center gap-2">
              {PHRASES.map((_, i) => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full overflow-hidden bg-[hsl(var(--border))]"
                >
                  <motion.div
                    className="h-full bg-[hsl(var(--accent))]"
                    initial={false}
                    animate={{
                      width: i < active ? "100%" : i === active ? "100%" : "0%",
                      opacity: i <= active ? 1 : 0.3,
                    }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    style={{
                      boxShadow:
                        i === active ? "0 0 12px hsl(var(--accent))" : undefined,
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Card revelado — 1 por vez */}
            <div className="mt-8 relative min-h-[220px]">
              {PHRASES.map((p, i) => (
                <motion.div
                  key={p.n}
                  initial={false}
                  animate={{
                    opacity: i === active ? 1 : 0,
                    y: i === active ? 0 : 20,
                    filter: i === active ? "blur(0px)" : "blur(8px)",
                  }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0"
                  style={{ pointerEvents: i === active ? "auto" : "none" }}
                >
                  <div
                    className="paper-card p-6 md:p-8"
                    style={{
                      transform: "translateZ(0)",
                      boxShadow:
                        "var(--shadow-card-float), 0 0 60px hsl(var(--accent) / 0.18)",
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
                      Mecanismo {p.n}
                    </div>
                    <div className="mt-2 text-2xl md:text-3xl font-semibold text-[hsl(var(--primary))]">
                      {p.title}
                    </div>
                    <p className="mt-3 text-[hsl(var(--muted-foreground))]">
                      {p.body}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--muted-foreground))]">
              Role para girar o dial · {String(active + 1).padStart(2, "0")} / 04
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Dial 3D ---------------- */

function Dial3D({ size }: { size: number }) {
  const teeth = 48;
  return (
    <div
      className="relative"
      style={{ width: size, height: size, transformStyle: "preserve-3d" }}
    >
      {/* Sombra de chão */}
      <div
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: -size * 0.12,
          width: size * 0.9,
          height: size * 0.18,
          background:
            "radial-gradient(ellipse at center, hsl(220 40% 8% / 0.45), transparent 70%)",
          filter: "blur(6px)",
        }}
      />

      {/* Aro externo metálico */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, hsl(220 14% 18%), hsl(220 10% 38%), hsl(220 14% 14%), hsl(220 10% 36%), hsl(220 14% 18%))",
          boxShadow: [
            "0 0 0 1px hsl(220 10% 8%)",
            "0 1px 0 hsl(0 0% 100% / 0.22) inset",
            "0 -3px 6px hsl(0 0% 0% / 0.55) inset",
            "0 30px 60px -20px hsl(230 50% 8% / 0.55)",
            "0 60px 100px -40px hsl(230 50% 8% / 0.45)",
          ].join(", "),
        }}
      />

      {/* Dentes da engrenagem */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        {Array.from({ length: teeth }).map((_, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-0"
            style={{
              width: 6,
              height: 14,
              marginLeft: -3,
              background:
                "linear-gradient(180deg, hsl(220 16% 22%), hsl(220 22% 8%))",
              transform: `rotate(${(360 / teeth) * i}deg)`,
              transformOrigin: `50% ${size / 2}px`,
              borderRadius: 2,
            }}
          />
        ))}
      </div>

      {/* Marcas de escala finas */}
      <div className="absolute inset-[10%] rounded-full overflow-hidden opacity-80">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-0 w-px bg-white/35"
            style={{
              height: i % 5 === 0 ? "9%" : "4.5%",
              transform: `translateX(-0.5px) rotate(${(360 / 60) * i}deg)`,
              transformOrigin: `50% ${(size * 0.8) / 2}px`,
            }}
          />
        ))}
      </div>

      {/* Núcleo neon */}
      <div
        className="absolute inset-[24%] rounded-full overflow-hidden"
        style={{
          background:
            "radial-gradient(circle at 35% 28%, hsl(0 0% 100% / 0.35), transparent 50%), linear-gradient(180deg, hsl(218 90% 56%), hsl(222 90% 28%))",
          boxShadow:
            "0 1px 0 hsl(0 0% 100% / 0.4) inset, 0 -3px 8px hsl(220 60% 6% / 0.6) inset, 0 0 30px hsl(var(--accent) / 0.5)",
        }}
      />

      {/* Lâminas internas */}
      <div className="absolute inset-[28%] rounded-full overflow-hidden">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2"
            style={{
              width: "5%",
              height: "70%",
              marginLeft: "-2.5%",
              marginTop: "-35%",
              background:
                "linear-gradient(180deg, transparent, hsl(0 0% 100% / 0.6) 50%, transparent)",
              transform: `rotate(${(360 / 16) * i}deg)`,
              borderRadius: 999,
              opacity: 0.6,
            }}
          />
        ))}
      </div>

      {/* Hub central */}
      <div
        className="absolute inset-[44%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 28%, hsl(0 0% 100% / 0.7), transparent 60%), linear-gradient(180deg, hsl(220 14% 28%), hsl(220 22% 10%))",
          boxShadow:
            "0 1px 0 hsl(0 0% 100% / 0.4) inset, 0 -2px 4px hsl(0 0% 0% / 0.6) inset, 0 0 12px hsl(var(--accent) / 0.5)",
        }}
      />

      {/* Marcador de posição */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{
          top: "8%",
          width: 10,
          height: 10,
          background: "hsl(var(--accent))",
          boxShadow: "0 0 14px hsl(var(--accent)), 0 0 28px hsl(var(--accent))",
        }}
      />
    </div>
  );
}
