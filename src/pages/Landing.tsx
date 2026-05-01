import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Brain, Zap, BookOpen, Target, ChevronDown } from "lucide-react";
import ParticleLogo from "@/components/landing/ParticleLogo";
import PhoneMockup from "@/components/landing/PhoneMockup";
import MegaDial from "@/components/landing/MegaDial";
import TactileButton from "@/components/console/TactileButton";

export default function Landing() {
  const phoneSectionRef = useRef<HTMLElement>(null);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[hsl(var(--background))] text-[hsl(var(--primary))]">
      {/* === NAV === */}
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-[hsl(var(--primary))] grid place-items-center">
              <span className="text-white text-sm font-black tracking-tight">OQ</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">OQ Falta?</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-[hsl(var(--muted-foreground))]">
            <a href="#produto" className="hover:text-[hsl(var(--primary))] transition">Produto</a>
            <a href="#diferenciais" className="hover:text-[hsl(var(--primary))] transition">Diferenciais</a>
            <a href="#planos" className="hover:text-[hsl(var(--primary))] transition">Planos</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <TactileButton variant="ghost" size="sm">Login</TactileButton>
            </Link>
            <Link to="/login">
              <TactileButton variant="primary" size="sm">Inicie Gratuitamente</TactileButton>
            </Link>
          </div>
        </div>
        <div className="absolute inset-0 -z-10 blur-edge-top h-full" />
      </header>

      {/* === HERO === */}
      <section className="relative h-screen flex flex-col items-center justify-center px-6">
        <ParticleLogo />
        <div className="relative z-10 mt-[28vh] max-w-3xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05]"
          >
            O que falta para sua aprovação<br />
            <span className="text-[hsl(var(--accent))]">não é mais tempo.</span> É menos ruído.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-6 text-lg md:text-xl text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto"
          >
            A primeira ferramenta de estudo para residência médica pautada em
            neurociência tátil e incidência real. Transforme diretrizes complexas
            em instinto clínico.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mt-10 flex items-center justify-center gap-3"
          >
            <Link to="/login">
              <TactileButton variant="primary" size="lg">
                Faz um OQ! <ArrowRight className="h-4 w-4" />
              </TactileButton>
            </Link>
            <Link to="/login">
              <TactileButton variant="neutral" size="lg">Inicie Gratuitamente</TactileButton>
            </Link>
          </motion.div>
        </div>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 text-[hsl(var(--muted-foreground))] flex flex-col items-center gap-1 text-xs uppercase tracking-[0.3em]"
        >
          Role <ChevronDown className="h-4 w-4" />
        </motion.div>
      </section>

      {/* === PHONE 3D — Scroll Sync === */}
      <section
        ref={phoneSectionRef}
        id="produto"
        className="relative py-32 px-6"
        style={{ minHeight: "180vh" }}
      >
        <div className="sticky top-0 h-screen flex items-center">
          <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--accent))] mb-4">
                A experiência
              </div>
              <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
                Você não estuda.<br />
                Você <span className="text-[hsl(var(--accent))]">joga</span> para passar.
              </h2>
              <p className="mt-6 text-lg text-[hsl(var(--muted-foreground))] max-w-md">
                Card de papel premium. Rodinha tátil. Lâmpada que pulsa quando
                você precisa de uma pista. Sons mecânicos. Vibração háptica.
                Cada interação foi calibrada para liberar dopamina certa,
                no momento certo.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4 max-w-md">
                {[
                  { k: "60", v: "FPS sempre" },
                  { k: "<200ms", v: "Latência tátil" },
                  { k: "0", v: "Distração" },
                  { k: "∞", v: "Repetição inteligente" },
                ].map((s) => (
                  <div key={s.k} className="paper-card p-4">
                    <div className="text-2xl font-semibold text-[hsl(var(--accent))]">{s.k}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
            <PhoneMockup targetRef={phoneSectionRef} />
          </div>
        </div>
      </section>

      {/* === DIFERENCIAIS — Bento Grid === */}
      <section id="diferenciais" className="relative py-32 px-6">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--accent))] mb-4">
              Quatro pilares
            </div>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
              Construído por médicos. Calibrado por neurocientistas.
            </h2>
          </div>

          <div className="grid grid-cols-12 gap-4 md:gap-6">
            <BentoCard className="col-span-12 md:col-span-7 row-span-2 min-h-[320px]" accent>
              <Brain className="h-8 w-8 text-[hsl(var(--accent))]" />
              <h3 className="mt-6 text-2xl md:text-3xl font-semibold">Active Recall Puro</h3>
              <p className="mt-3 text-[hsl(var(--muted-foreground))] text-base max-w-md">
                Sem múltipla escolha automática. Você digita, lembra, desmistifica.
                Cada acerto é uma sinapse permanente — não memória de curto prazo.
              </p>
            </BentoCard>

            <BentoCard className="col-span-12 md:col-span-5">
              <Zap className="h-7 w-7 text-[hsl(var(--accent))]" />
              <h3 className="mt-4 text-xl font-semibold">Zero Distração</h3>
              <p className="mt-2 text-[hsl(var(--muted-foreground))] text-sm">
                Um card por vez. Fundo neutro. Tipografia editorial. Foco total.
              </p>
            </BentoCard>

            <BentoCard className="col-span-12 md:col-span-5">
              <Target className="h-7 w-7 text-[hsl(var(--accent))]" />
              <h3 className="mt-4 text-xl font-semibold">Algoritmo de Incidência</h3>
              <p className="mt-2 text-[hsl(var(--muted-foreground))] text-sm">
                Pontuação adaptativa baseada em peso de prova, erros e tempo desde a última revisão.
              </p>
            </BentoCard>

            <BentoCard className="col-span-12 md:col-span-12" accent>
              <BookOpen className="h-7 w-7 text-[hsl(var(--accent))]" />
              <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4">
                <h3 className="text-2xl font-semibold">Diretrizes 2026</h3>
                <span className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  ESC · AHA · SBP · FEBRASGO · SBC
                </span>
              </div>
              <p className="mt-2 text-[hsl(var(--muted-foreground))] text-sm max-w-2xl">
                Cada OQ é revisado quando uma diretriz muda. Você nunca estuda medicina desatualizada.
              </p>
            </BentoCard>
          </div>
        </div>
      </section>

      {/* === MEGA DIAL Sticky === */}
      <MegaDial />

      {/* === SOCIAL PROOF === */}
      <section className="py-32 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--accent))] mb-4">
            Quem já joga
          </div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
            "Em 21 dias parei de me sentir perdido.<br />
            <span className="text-[hsl(var(--muted-foreground))]">Os OQs viraram instinto."</span>
          </h2>
          <div className="mt-6 text-sm text-[hsl(var(--muted-foreground))]">
            — R6 cirurgia, aprovada USP-SP 2026
          </div>
        </div>
      </section>

      {/* === CTA FINAL === */}
      <section id="planos" className="relative py-40 px-6">
        <div className="container mx-auto max-w-3xl">
          <div
            className="paper-card p-10 md:p-16 text-center relative overflow-hidden"
            style={{ boxShadow: "var(--shadow-card-float), 0 0 80px hsl(var(--accent)/0.15)" }}
          >
            <div
              className="absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-30 blur-3xl"
              style={{ background: "hsl(var(--accent))" }}
            />
            <div className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--accent))] mb-4">
              7 dias grátis · Sem cartão
            </div>
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              A próxima prova já começou.<br />
              <span className="text-[hsl(var(--accent))]">Você ainda não.</span>
            </h2>
            <p className="mt-6 text-lg text-[hsl(var(--muted-foreground))] max-w-xl mx-auto">
              Comece agora com acesso completo ao banco de OQs, algoritmo adaptativo e
              modo desmistificar. Cancele quando quiser.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link to="/login">
                <TactileButton variant="primary" size="xl">
                  Faz um OQ! <ArrowRight className="h-5 w-5" />
                </TactileButton>
              </Link>
              <Link to="/login">
                <TactileButton variant="neutral" size="xl">Login</TactileButton>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="border-t border-[hsl(var(--border))] py-10 px-6">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[hsl(var(--muted-foreground))]">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-[hsl(var(--primary))] grid place-items-center">
              <span className="text-white text-[10px] font-black">OQ</span>
            </div>
            <span>OQ Falta? — © 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-[hsl(var(--primary))]">Termos</a>
            <a href="#" className="hover:text-[hsl(var(--primary))]">Privacidade</a>
            <a href="#" className="hover:text-[hsl(var(--primary))]">Contato</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function BentoCard({
  children, className = "", accent = false,
}: { children: React.ReactNode; className?: string; accent?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className={`paper-card p-6 md:p-8 ${accent ? "ring-1 ring-[hsl(var(--accent)/0.2)]" : ""} ${className}`}
    >
      {children}
    </motion.div>
  );
}
