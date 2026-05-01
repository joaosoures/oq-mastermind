import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { useRef, useState } from "react";

const PHRASES = [
  {
    title: "Algoritmo de Incidência",
    body: "O que realmente cai. Cada OQ é priorizado pelo histórico real das provas.",
  },
  {
    title: "Diretrizes 2026",
    body: "Ciência atualizada. ESC, AHA, SBP, FEBRASGO — sempre na versão mais recente.",
  },
  {
    title: "Active Recall Puro",
    body: "Sem múltipla escolha rasa. Você desmistifica a resposta com pistas progressivas.",
  },
  {
    title: "Zero Distração",
    body: "Um card por vez. A IA decide o próximo. Você só precisa pensar.",
  },
];

/**
 * Sticky section: rodinha gigante à esquerda, frases à direita.
 * Scroll gira o dial suavemente e troca as frases.
 */
export default function MegaDial() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  // Rotação suave proporcional ao scroll (uma volta inteira)
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 360]);
  const [idx, setIdx] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const clamped = Math.max(0, Math.min(0.999, v));
    const i = Math.floor(clamped * PHRASES.length);
    setIdx((prev) => (prev !== i ? i : prev));
  });

  return (
    <section
      ref={ref}
      className="relative"
      style={{ height: `${PHRASES.length * 100}vh` }}
    >
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="container mx-auto grid md:grid-cols-2 gap-10 items-center px-6">
          {/* Dial */}
          <div className="relative flex justify-center md:justify-start order-2 md:order-1">
            <div className="relative">
              <motion.div style={{ rotate }} className="will-change-transform">
                <Dial size={360} />
              </motion.div>
              <div className="absolute inset-0 -z-10 blur-3xl opacity-30 bg-[radial-gradient(circle_at_center,hsl(var(--accent)/0.6),transparent_60%)]" />
            </div>
          </div>

          {/* Frases */}
          <div className="relative order-1 md:order-2">
            <div className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))] mb-3">
              {String(idx + 1).padStart(2, "0")} / {String(PHRASES.length).padStart(2, "0")}
            </div>
            <motion.h3
              key={`t-${idx}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-3xl md:text-5xl font-semibold tracking-tight text-[hsl(var(--primary))]"
            >
              {PHRASES[idx].title}
            </motion.h3>
            <motion.p
              key={`b-${idx}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 text-base md:text-lg text-[hsl(var(--muted-foreground))] max-w-md"
            >
              {PHRASES[idx].body}
            </motion.p>

            <div className="mt-8 flex gap-2">
              {PHRASES.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i === idx
                      ? "w-8 bg-[hsl(var(--accent))] shadow-[0_0_8px_hsl(var(--accent))]"
                      : "w-3 bg-[hsl(var(--border))]"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Dial({ size }: { size: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, hsl(0 0% 100% / 0.5), transparent 35%), linear-gradient(180deg, hsl(220 14% 32%), hsl(220 18% 14%))",
          boxShadow:
            "0 30px 60px -20px hsl(230 50% 10% / 0.55), 0 1px 0 hsl(0 0% 100% / 0.3) inset",
        }}
      />
      <div className="absolute inset-0 rounded-full overflow-hidden">
        {Array.from({ length: 48 }).map((_, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-0 h-3 w-1.5 -translate-x-1/2 bg-[hsl(220_18%_10%)]"
            style={{
              transform: `translateX(-50%) rotate(${(360 / 48) * i}deg)`,
              transformOrigin: `50% ${size / 2}px`,
            }}
          />
        ))}
      </div>
      <div
        className="absolute inset-[14%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, hsl(0 0% 100% / 0.4), transparent 40%), linear-gradient(180deg, hsl(218 90% 54%), hsl(218 90% 32%))",
          boxShadow: "0 1px 0 hsl(0 0% 100% / 0.4) inset, 0 -2px 0 hsl(220 30% 15% / 0.4) inset",
        }}
      />
      <div className="absolute inset-[14%] rounded-full overflow-hidden opacity-70">
        {Array.from({ length: 36 }).map((_, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-0 h-1/2 w-px bg-white/30 origin-bottom"
            style={{ transform: `translateX(-0.5px) rotate(${(360 / 36) * i}deg)` }}
          />
        ))}
      </div>
      <div
        className="absolute inset-[36%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, hsl(0 0% 100% / 0.55), transparent 60%), linear-gradient(180deg, hsl(220 14% 28%), hsl(220 20% 14%))",
          boxShadow: "0 1px 0 hsl(0 0% 100% / 0.3) inset",
        }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2 top-[16%] h-2 w-2 rounded-full bg-[hsl(var(--accent))]"
        style={{ boxShadow: "0 0 12px hsl(var(--accent))" }}
      />
    </div>
  );
}
