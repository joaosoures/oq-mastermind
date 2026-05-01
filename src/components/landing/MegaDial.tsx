import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

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
    title: "Interface Háptica",
    body: "O prazer tátil de um console portátil. Estudar deixa de ser obrigação.",
  },
  {
    title: "Zero Distração",
    body: "Um card por vez. A IA decide o próximo. Você só precisa pensar.",
  },
];

/**
 * Sticky section: rodinha dentada gigante à esquerda, frases à direita.
 * O scroll gira o dial e troca as frases (com micro-shake simulando vibração).
 */
export default function MegaDial() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 720]);
  const [idx, setIdx] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);

  useEffect(() => {
    return scrollYProgress.on("change", (v) => {
      const i = Math.min(PHRASES.length - 1, Math.floor(v * PHRASES.length));
      setIdx((prev) => {
        if (prev !== i) setShakeKey((k) => k + 1);
        return i;
      });
    });
  }, [scrollYProgress]);

  return (
    <section ref={ref} className="relative" style={{ height: `${PHRASES.length * 90}vh` }}>
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="container mx-auto grid md:grid-cols-2 gap-8 items-center px-6">
          {/* Dial gigante */}
          <div className="relative flex justify-center md:justify-start">
            <motion.div
              style={{ rotate }}
              className="relative"
            >
              <Dial size={420} />
            </motion.div>
            {/* Halo neon */}
            <div className="absolute inset-0 -z-10 blur-3xl opacity-30 bg-[radial-gradient(circle_at_center,hsl(var(--accent)/0.6),transparent_60%)]" />
          </div>

          {/* Frases */}
          <div className="relative">
            <div className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))] mb-3">
              {String(idx + 1).padStart(2, "0")} / {String(PHRASES.length).padStart(2, "0")}
            </div>
            <motion.h3
              key={`t-${shakeKey}`}
              initial={{ x: 0 }}
              animate={{ x: [0, -1, 1, -1, 0] }}
              transition={{ duration: 0.18 }}
              className="text-4xl md:text-6xl font-semibold tracking-tight text-[hsl(var(--primary))]"
            >
              {PHRASES[idx].title}
            </motion.h3>
            <motion.p
              key={`b-${shakeKey}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="mt-4 text-lg text-[hsl(var(--muted-foreground))] max-w-md"
            >
              {PHRASES[idx].body}
            </motion.p>

            {/* Indicadores */}
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
      {/* Anel externo dentado */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, hsl(0 0% 100% / 0.5), transparent 35%), linear-gradient(180deg, hsl(220 14% 32%), hsl(220 18% 14%))",
          boxShadow:
            "0 30px 60px -20px hsl(230 50% 10% / 0.55), 0 1px 0 hsl(0 0% 100% / 0.3) inset",
        }}
      />
      {/* Dentes */}
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
      {/* Disco interno azul */}
      <div
        className="absolute inset-[14%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, hsl(0 0% 100% / 0.4), transparent 40%), linear-gradient(180deg, hsl(218 90% 54%), hsl(218 90% 32%))",
          boxShadow: "0 1px 0 hsl(0 0% 100% / 0.4) inset, 0 -2px 0 hsl(220 30% 15% / 0.4) inset",
        }}
      />
      {/* Knurling */}
      <div className="absolute inset-[14%] rounded-full overflow-hidden opacity-70">
        {Array.from({ length: 36 }).map((_, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-0 h-1/2 w-px bg-white/30 origin-bottom"
            style={{ transform: `translateX(-0.5px) rotate(${(360 / 36) * i}deg)` }}
          />
        ))}
      </div>
      {/* Hub central */}
      <div
        className="absolute inset-[36%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, hsl(0 0% 100% / 0.55), transparent 60%), linear-gradient(180deg, hsl(220 14% 28%), hsl(220 20% 14%))",
          boxShadow: "0 1px 0 hsl(0 0% 100% / 0.3) inset",
        }}
      />
      {/* Marca de orientação */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-[16%] h-2 w-2 rounded-full bg-[hsl(var(--accent))]"
        style={{ boxShadow: "0 0 12px hsl(var(--accent))" }}
      />
    </div>
  );
}
