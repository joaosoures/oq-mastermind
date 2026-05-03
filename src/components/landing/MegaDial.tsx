import { motion } from "framer-motion";

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
 * Seção compacta com dial estático (sutilmente girando) e grade de frases.
 * Sem scroll-jacking — evita o "scroll preso" e espaços gigantes.
 */
export default function MegaDial() {
  return (
    <section className="relative py-20 md:py-28 px-5 sm:px-6">
      <div className="container mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        {/* Dial */}
        <div className="relative flex justify-center md:justify-start">
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              className="will-change-transform"
            >
              <Dial size={280} />
            </motion.div>
            <div className="absolute inset-0 -z-10 blur-3xl opacity-30 bg-[radial-gradient(circle_at_center,hsl(var(--accent)/0.6),transparent_60%)]" />
          </div>
        </div>

        {/* Frases em grid */}
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--accent))] mb-3">
            A engrenagem
          </div>
          <h3 className="text-3xl md:text-4xl font-semibold tracking-tight text-[hsl(var(--primary))]">
            Quatro mecanismos.<br />Uma aprovação.
          </h3>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            {PHRASES.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
              >
                <div className="text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--muted-foreground))] mb-1">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="text-base font-semibold text-[hsl(var(--primary))]">
                  {p.title}
                </div>
                <div className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  {p.body}
                </div>
              </motion.div>
            ))}
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
