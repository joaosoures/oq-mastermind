import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Brain, Zap, BookOpen, Target, Check, Sparkles } from "lucide-react";
import LogoHero from "@/components/landing/LogoHero";
import MegaDial from "@/components/landing/MegaDial";
import TestimonialsPhone from "@/components/landing/TestimonialsPhone";
import TactileButton from "@/components/console/TactileButton";
import { LiquidCTAButton } from "@/components/landing/LiquidCTAButton";
import logo from "@/assets/oqmed-logo.png";

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-[hsl(var(--background))] text-[hsl(var(--primary))]">
      {/* === NAV === */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-[hsl(var(--background)/0.7)] border-b border-[hsl(var(--border)/0.5)]">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <motion.img
              src={logo}
              alt="OQ MED"
              className="h-10 w-auto"
              style={{ filter: "drop-shadow(0 2px 6px hsl(211 100% 11% / 0.18))" }}
              whileHover={{ scale: 1.06, rotate: -2 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
            />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-[hsl(var(--muted-foreground))]">
            <a href="#produto" className="hover:text-[hsl(var(--primary))] transition">Produto</a>
            <a href="#diferenciais" className="hover:text-[hsl(var(--primary))] transition">Diferenciais</a>
            <a href="#planos" className="hover:text-[hsl(var(--primary))] transition">Planos</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:block">
              <TactileButton variant="ghost" size="sm">Login</TactileButton>
            </Link>
            <Link to="/login">
              <TactileButton variant="primary" size="sm">Começar</TactileButton>
            </Link>
          </div>
        </div>
      </header>

      {/* === HERO — compacto e direto === */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 px-5 sm:px-6 overflow-visible">
        {/* Background Blobs para evidenciar o glassmorphism */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[hsl(var(--accent)/0.1)] rounded-full blur-[120px] -z-10" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] -z-10" />

        <div className="mx-auto max-w-4xl flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative p-10 md:p-14 rounded-[3.5rem] bg-white/[0.03] dark:bg-black/[0.03] backdrop-blur-[80px] border border-white/20 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(0,0,0,0.1)] flex flex-col items-center gap-10 overflow-hidden group"
          >
            {/* Vidro líquido - Reflexos e brilho especular */}
            <div className="absolute inset-0 rounded-[3.5rem] bg-gradient-to-br from-white/20 via-white/5 to-transparent opacity-60 pointer-events-none" />
            
            {/* Shimmer Animado */}
            <motion.div 
              className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-25deg] pointer-events-none"
              animate={{ 
                x: ['-100%', '200%'],
              }}
              transition={{ 
                duration: 6, 
                repeat: Infinity, 
                ease: "linear",
                repeatDelay: 2
              }}
            />
            
            <div className="relative z-10">
              <LogoHero />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="relative z-10 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-5 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-primary/70 shadow-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))] shadow-[0_0_10px_hsl(var(--accent))]" />
              Residência médica · 2026
            </motion.div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="mt-5 text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]"
          >
            O que falta pra sua aprovação<br />
            <span className="text-[hsl(var(--accent))]">não é tempo. É método.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.7 }}
            className="mt-5 text-base md:text-lg text-[hsl(var(--muted-foreground))] max-w-xl"
          >
            Chega de "marcar o quanto você acha que sabe". Os OQs trazem o conteúdo de volta
            pela sua precisão real — entre um plantão e outro, no refeitório, em 5 minutos.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7 }}
            className="mt-8 flex flex-col items-center justify-center gap-4 w-full sm:w-auto"
          >
            <Link to="/login" className="w-full sm:w-auto group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <LiquidCTAButton className="w-full sm:w-auto px-8 py-3.5 md:py-4">
                <div className="flex flex-col items-center leading-tight">
                  <span className="text-base md:text-lg">Faz um OQ!</span>
                  <span className="text-[10px] md:text-xs opacity-80 font-medium">Garantir 7 dias grátis</span>
                </div>
              </LiquidCTAButton>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[hsl(var(--muted-foreground))]"
          >
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[hsl(var(--accent))]" /> Sem cartão</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[hsl(var(--accent))]" /> Cancele quando quiser</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[hsl(var(--accent))]" /> Diretrizes atualizadas</span>
          </motion.div>
        </div>
      </section>

      {/* === BAR DE NÚMEROS === */}
      <section className="px-5 sm:px-6 pb-16">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { k: "+8.000", v: "OQs no banco" },
            { k: "32", v: "Especialidades" },
            { k: "94%", v: "Retenção em 30 dias" },
            { k: "<200ms", v: "Latência tátil" },
          ].map((s) => (
            <div key={s.k} className="paper-card p-4 md:p-5 text-center">
              <div className="text-2xl md:text-3xl font-semibold text-[hsl(var(--accent))]">{s.k}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* === DIFERENCIAIS — Bento Grid === */}
      <section id="diferenciais" className="relative py-20 md:py-28 px-5 sm:px-6">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
            <div className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--accent))] mb-3">
              Quatro pilares
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
              Construído por médicos.<br className="hidden sm:block" /> Calibrado por neurocientistas.
            </h2>
          </div>

          <div className="grid grid-cols-12 gap-3 md:gap-5">
            <BentoCard className="col-span-12 md:col-span-7 row-span-2 min-h-[260px]" accent>
              <Brain className="h-7 w-7 md:h-8 md:w-8 text-[hsl(var(--accent))]" />
              <h3 className="mt-5 text-2xl md:text-3xl font-semibold">Lembrança Ativa</h3>
              <p className="mt-3 text-[hsl(var(--muted-foreground))] text-sm md:text-base max-w-md">
                Sem múltipla escolha automática. Você lembra, desmistifica e fixa.
                Cada acerto é uma sinapse permanente.
              </p>
            </BentoCard>

            <BentoCard className="col-span-12 md:col-span-5">
              <Zap className="h-6 w-6 md:h-7 md:w-7 text-[hsl(var(--accent))]" />
              <h3 className="mt-3 text-lg md:text-xl font-semibold">Zero Distração</h3>
              <p className="mt-2 text-[hsl(var(--muted-foreground))] text-sm">
                Um card por vez. Tipografia editorial. Foco total.
              </p>
            </BentoCard>

            <BentoCard className="col-span-12 md:col-span-5">
              <Target className="h-6 w-6 md:h-7 md:w-7 text-[hsl(var(--accent))]" />
              <h3 className="mt-3 text-lg md:text-xl font-semibold">Algoritmo de Incidência</h3>
              <p className="mt-2 text-[hsl(var(--muted-foreground))] text-sm">
                Pontuação adaptativa por peso de prova, erros e tempo desde a última revisão.
              </p>
            </BentoCard>

            <BentoCard className="col-span-12" accent>
              <BookOpen className="h-6 w-6 md:h-7 md:w-7 text-[hsl(var(--accent))]" />
              <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="text-xl md:text-2xl font-semibold">Diretrizes 2026</h3>
                <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
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

      {/* === SOCIAL PROOF — iPhone com depoimentos scroll-revelados === */}
      <TestimonialsPhone />

      {/* === PLANOS / CTA FINAL === */}
      <section id="planos" className="relative py-24 md:py-32 px-5 sm:px-6">
        <div className="container mx-auto max-w-3xl">
          <div
            className="paper-card p-8 md:p-14 text-center relative overflow-hidden"
            style={{ boxShadow: "var(--shadow-card-float), 0 0 80px hsl(var(--accent)/0.15)" }}
          >
            <div
              className="absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-30 blur-3xl"
              style={{ background: "hsl(var(--accent))" }}
            />
            <div className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--accent))] mb-3">
              7 dias grátis · Sem cartão
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
              A próxima prova já começou.<br />
              <span className="text-[hsl(var(--accent))]">Você ainda não.</span>
            </h2>
            <p className="mt-5 text-base md:text-lg text-[hsl(var(--muted-foreground))] max-w-xl mx-auto">
              Acesso completo ao banco de OQs, algoritmo adaptativo e modo desmistificar.
              Cancele quando quiser.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4">
              <Link to="/login" className="w-full sm:w-auto group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <LiquidCTAButton className="w-full sm:w-auto px-10 py-4 md:py-5">
                  <div className="flex flex-col items-center leading-tight">
                    <span className="text-lg md:text-xl">Faz um OQ!</span>
                    <span className="text-xs md:text-sm opacity-90 font-medium">Garantir meus 7 dias grátis</span>
                  </div>
                </LiquidCTAButton>
              </Link>
              <Link to="/login" className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors">
                Já tenho uma conta? Entrar agora
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="border-t border-[hsl(var(--border))] py-8 px-5 sm:px-6">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[hsl(var(--muted-foreground))]">
          <div className="flex items-center gap-2">
            <img src={logo} alt="OQ MED" className="h-8 w-auto" />
            <span>© 2026</span>
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
      className={`paper-card p-5 md:p-7 ${accent ? "ring-1 ring-[hsl(var(--accent)/0.2)]" : ""} ${className}`}
    >
      {children}
    </motion.div>
  );
}
