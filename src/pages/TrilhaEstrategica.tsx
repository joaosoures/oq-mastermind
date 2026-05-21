import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Flame, Target, AlertCircle, Map, Sparkles, Trophy, ArrowUpRight, Lock, Crown, GhostIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrilhaPlano } from "@/hooks/useTrilhaPlano";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";
import SetupDialog from "@/components/trilha/SetupDialog";
import BlocoAula from "@/components/trilha/BlocoAula";
import RevisaoEspecifica from "@/components/trilha/RevisaoEspecifica";
import CalendarioEstudos from "@/components/trilha/CalendarioEstudos";
import RedistribuirDialog from "@/components/trilha/RedistribuirDialog";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useAuth } from "@/contexts/AuthContext";

function BentoCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn("paper-card p-5 md:p-6", className)}
    >
      {children}
    </motion.div>
  );
}

export default function TrilhaEstrategica() {
  const {
    loading, settings, salvarSettings,
    aulas, focoAulas, baseAulas,
    metaSemana, studiedThisWeek,
    pendenciasAulas, perdidosAulas,
    currentWeekIndex,
    proximasSemanasDisponiveis, AULAS_POR_SEMANA,
  } = useTrilhaPlano();

  const [setupOpen, setSetupOpen] = useState(false);
  const [redistOpen, setRedistOpen] = useState(false);
  const navigate = useNavigate();
  const { canUse } = useUserPlan();
  const { isAdmin } = useAuth();
  const podeDirecionamento = canUse("trilha") || isAdmin;

  useEffect(() => {
    document.title = "Trilha Estratégica — OQ MED";
    if (!loading && !settings.setup_done) setSetupOpen(true);
  }, [loading, settings.setup_done]);

  const progresso = Math.min(100, Math.round((studiedThisWeek / Math.max(1, metaSemana)) * 100));
  const isMedico = settings.perfil === "medico";
  const espRodizio = !isMedico ? settings.rodizio_atual?.especialidade : null;
  const espLabel = espRodizio ? (ESPECIALIDADE_LABEL[espRodizio as keyof typeof ESPECIALIDADE_LABEL] ?? espRodizio) : null;
  const diasProva = settings.prova_data
    ? Math.max(0, Math.ceil((new Date(settings.prova_data).getTime() - Date.now()) / 86400000))
    : null;

  const pendenciasCount = pendenciasAulas.length;

  function aplicarRedistribuicao(params: {
    redistribuir: { aula_id: string; semana_index: number }[];
    perder: string[];
  }) {
    const novosOverrides = { ...(settings.plano_overrides ?? {}) };
    params.redistribuir.forEach(({ aula_id, semana_index }) => {
      novosOverrides[aula_id] = semana_index;
    });
    const novosPerdidos = Array.from(
      new Set([...(settings.perdidos ?? []), ...params.perder]),
    );
    salvarSettings({
      ...settings,
      plano_overrides: novosOverrides,
      perdidos: novosPerdidos,
    });
  }

  function recuperarPerdida(aulaId: string) {
    const novosPerdidos = (settings.perdidos ?? []).filter((id) => id !== aulaId);
    const novosOverrides = { ...(settings.plano_overrides ?? {}) };
    novosOverrides[aulaId] = currentWeekIndex + 1;
    salvarSettings({
      ...settings,
      perdidos: novosPerdidos,
      plano_overrides: novosOverrides,
    });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-6">
      {/* Header (alinhado ao Dashboard) */}
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 flex items-center gap-2">
            Mapa de guerra <Sparkles className="h-3 w-3 text-accent" />
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Trilha Estratégica.
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Priorizamos o que cai na sua prova com base no seu rodízio e desempenho.
          </p>
        </div>
        <Button
          onClick={() => setSetupOpen(true)}
          className="tactile-btn rounded-2xl bg-background hover:bg-background text-foreground border-none font-bold text-xs uppercase tracking-wider h-12 px-5 gap-2"
        >
          <SettingsIcon className="h-4 w-4" />
          Configurar
        </Button>
      </header>

      {/* Bento Grid — Progresso da Semana */}
      {/* Bento Grid — Progresso da Semana */}
      {podeDirecionamento && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[140px]">
          {/* Hero: Progresso da semana (estilo Meta Diária do Dashboard) */}
          <BentoCard className="col-span-2 row-span-2 bg-gradient-to-br from-[hsl(var(--primary))] to-[#00264d] text-white border-none shadow-[0_30px_60px_-12px_rgba(0,29,57,0.6)] ring-1 ring-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.08] pointer-events-none group-hover:scale-110 transition-transform duration-700">
              <Map className="w-48 h-48 text-[hsl(var(--accent))]" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.3em] font-black text-[hsl(var(--accent))] drop-shadow-[0_0_12px_hsl(var(--accent)/0.6)]">
                  Status da Semana
                </span>
                <div className="p-2.5 rounded-2xl bg-[hsl(var(--accent))]/20 border border-[hsl(var(--accent))]/30 backdrop-blur-sm shadow-[0_0_15px_hsl(var(--accent)/0.2)]">
                  <Target className="h-5 w-5 text-[hsl(var(--accent))] drop-shadow-[0_0_12px_hsl(var(--accent))]" />
                </div>
              </div>

              <div className="my-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl sm:text-7xl md:text-9xl font-black tabular-nums leading-none tracking-tighter text-[hsl(var(--accent))] drop-shadow-[0_0_35px_hsl(var(--accent)/0.5)]">
                    {studiedThisWeek}
                  </span>
                  <span className="text-2xl sm:text-4xl md:text-5xl font-black text-[hsl(var(--accent))] opacity-50 tabular-nums">
                    /{metaSemana}
                  </span>
                </div>
                {espLabel ? (
                  <div className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 shadow-xl group-hover:bg-white/20 transition-colors">
                    <Flame className="h-4 w-4 text-[hsl(var(--accent))]" />
                    <p className="text-xs md:text-sm font-bold text-white uppercase tracking-wider">
                      Rodízio: <span className="text-[hsl(var(--accent))] font-black">{espLabel}</span>
                    </p>
                  </div>
                ) : isMedico && (
                  <div className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 shadow-xl group-hover:bg-white/20 transition-colors">
                    <Sparkles className="h-4 w-4 text-[hsl(var(--accent))]" />
                    <p className="text-xs md:text-sm font-bold text-white uppercase tracking-wider">
                      Perfil: <span className="text-[hsl(var(--accent))] font-black">Médico</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Progresso Geral</p>
                    <p className="text-xl font-black text-white">{progresso}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">OQs Restantes</p>
                    <p className="text-xl font-black text-[hsl(var(--accent))]">{Math.max(0, metaSemana - studiedThisWeek)}</p>
                  </div>
                </div>
                <div className="h-4 rounded-full bg-black/30 overflow-hidden p-[3px] shadow-inner ring-1 ring-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progresso}%` }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--accent))] via-[#fcd34d] to-cyan-400 relative overflow-hidden"
                    style={{ boxShadow: "0 0 25px hsl(var(--accent)/0.6)" }}
                  >
                    <div className="absolute inset-0 bg-white/20 mix-blend-overlay animate-pulse" />
                    <motion.div 
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-1/2"
                    />
                  </motion.div>
                </div>
              </div>
            </div>
          </BentoCard>

          {/* Cards menores */}
          <BentoCard>
            <div className="flex flex-col h-full justify-between">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Foco</span>
              <span className="text-4xl md:text-5xl font-bold tabular-nums tracking-tight text-[hsl(var(--accent))]">
                {focoAulas.length}
              </span>
              <span className="text-[10px] text-muted-foreground">aulas no rodízio</span>
            </div>
          </BentoCard>

          <BentoCard>
            <div className="flex flex-col h-full justify-between">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Base</span>
              <span className="text-4xl md:text-5xl font-bold tabular-nums tracking-tight text-foreground">
                {baseAulas.length}
              </span>
              <span className="text-[10px] text-muted-foreground">alta prevalência</span>
            </div>
          </BentoCard>

          <BentoCard className={cn(pendenciasCount > 0 ? "ring-1 ring-destructive/30" : "")}>
            <div className="flex flex-col h-full justify-between">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Pendências</span>
              <span className={cn(
                "text-4xl md:text-5xl font-bold tabular-nums tracking-tight",
                pendenciasCount > 0 ? "text-[hsl(var(--destructive))]" : "text-foreground"
              )}>
                {pendenciasCount}
              </span>
              <span className="text-[10px] text-muted-foreground">aulas atrasadas</span>
            </div>
          </BentoCard>

          <BentoCard>
            <div className="flex flex-col h-full justify-between">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold flex items-center gap-1">
                <Trophy className="h-3 w-3" /> Prova
              </span>
              <span className="text-4xl md:text-5xl font-bold tabular-nums tracking-tight text-foreground">
                {diasProva ?? "—"}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                {diasProva !== null ? `dias · ${settings.prova_nome || "definida"}` : "configure no setup"}
              </span>
            </div>
          </BentoCard>
        </div>
      )}

      {/* Calendário */}
      <CalendarioEstudos settings={settings as any} onSave={salvarSettings} />

      {/* Foco Sincronizado e Base — apenas Plano Ouro / Trial / Admin */}
      {podeDirecionamento ? (
        <>
          {focoAulas.length > 0 && (
            <section id="foco-sincronizado" className="space-y-4">
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <Flame className="h-3.5 w-3.5 text-orange-500" /> Foco Sincronizado
                  </h2>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Alinhado ao seu rodízio de {espLabel || "internato"}.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {focoAulas.map((a) => (
                  <BlocoAula key={a.id} aula={a} accent="foco" />
                ))}
              </div>
            </section>
          )}

          {/* Base da Prova */}
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-[hsl(var(--accent))]" /> Base da Prova
                </h2>
                <p className="text-xs text-muted-foreground/60 mt-1">Temas de alta prevalência histórica.</p>
              </div>
            </div>
            {baseAulas.length === 0 ? (
              <BentoCard className="border-dashed text-center">
                <p className="text-sm text-muted-foreground font-medium py-6">
                  Nenhuma aula tier 1–2 disponível com OQs gerados ainda.
                </p>
              </BentoCard>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {baseAulas.slice(0, 9).map((a) => (
                  <BlocoAula key={a.id} aula={a} accent="base" />
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-amber-500" /> Direcionamento Automático
            </h2>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Recurso exclusivo do Plano Ouro — baseado nos materiais e no seu desempenho.
            </p>
          </div>
          <div className="paper-card p-6 md:p-8 border-amber-500/30 flex flex-col md:flex-row items-center gap-6 bg-gradient-to-br from-amber-500/5 to-transparent">
            <div className="shrink-0 grid place-items-center rounded-2xl w-16 h-16 bg-amber-500/15 shadow-neu-out-sm">
              <Crown className="h-7 w-7 text-amber-500" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="text-[10px] uppercase tracking-widest font-black text-amber-500 mb-1">Plano Ouro</p>
              <h3 className="font-display font-bold text-lg md:text-xl mb-1">
                Desbloqueie o Foco Sincronizado e a Base da Prova
              </h3>
              <p className="text-sm text-muted-foreground">
                A Trilha do Ouro direciona automaticamente suas aulas com base no seu rodízio, na prevalência das provas e
                nos materiais de estudo da biblioteca premium.
              </p>
            </div>
            <Button asChild className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold hover:opacity-90 px-6 rounded-xl h-12 shadow-lg whitespace-nowrap">
              <Link to="/meu-plano?upgrade=ouro">
                <Crown className="h-4 w-4 mr-1.5" />
                Upgrade para Ouro
              </Link>
            </Button>
          </div>
        </section>
      )}

      {/* Pendências (aulas atrasadas) */}
      {podeDirecionamento && pendenciasAulas.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-[hsl(var(--destructive))]" /> Aulas atrasadas
              </h2>
              <p className="text-xs text-[hsl(var(--destructive))]/80 mt-1 font-bold">
                {pendenciasAulas.length} {pendenciasAulas.length === 1 ? "aula" : "aulas"} de semanas anteriores.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRedistOpen(true)}
              className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 h-10 px-4 text-[10px] font-black uppercase tracking-wider"
            >
              Redistribuir (máx {AULAS_POR_SEMANA})
            </Button>
          </div>
          <BentoCard className="p-0 overflow-hidden ring-1 ring-destructive/20">
            <div className="divide-y divide-border/40">
              {pendenciasAulas.slice(0, 8).map((a) => (
                <div key={a.id} className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-destructive/[0.03] transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm md:text-base break-words sm:truncate">{a.nome}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-1 flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive/40" />
                      {ESPECIALIDADE_LABEL[a.especialidade as keyof typeof ESPECIALIDADE_LABEL] ?? a.especialidade}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/estudo?tipo=aula&aula_id=${a.id}`)}
                    className="rounded-xl font-black uppercase tracking-wider text-[10px] h-10 px-5 bg-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/90 text-white shadow-lg shadow-destructive/20 w-full sm:w-auto"
                  >
                    Fazer agora
                  </Button>
                </div>
              ))}
            </div>
          </BentoCard>
        </section>
      )}

      {/* Estudos que você perdeu */}
      {podeDirecionamento && perdidosAulas.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <GhostIcon className="h-3.5 w-3.5 text-muted-foreground" /> Estudos que você perdeu
            </h2>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Aulas que ficaram de fora da redistribuição. Você pode resgatá-las quando quiser.
            </p>
          </div>
          <BentoCard className="p-0 overflow-hidden">
            <div className="divide-y divide-border/40">
              {perdidosAulas.map((a) => (
                <div key={a.id} className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm md:text-base break-words sm:truncate text-muted-foreground">{a.nome}</div>
                    <div className="text-[10px] text-muted-foreground/70 uppercase tracking-widest font-black mt-1">
                      {ESPECIALIDADE_LABEL[a.especialidade as keyof typeof ESPECIALIDADE_LABEL] ?? a.especialidade}
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      size="sm" variant="outline"
                      onClick={() => recuperarPerdida(a.id)}
                      className="flex-1 sm:flex-none rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-wider"
                    >
                      Resgatar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/estudo?tipo=aula&aula_id=${a.id}`)}
                      className="flex-1 sm:flex-none rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-wider bg-foreground text-background"
                    >
                      Fazer agora
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </BentoCard>
        </section>
      )}

      {/* Revisão específica + Dica */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RevisaoEspecifica aulas={aulas} />
        {podeDirecionamento && (
          <BentoCard className="flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="h-4 w-4 text-[hsl(var(--accent))]" />
              <h4 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">Dica da Trilha</h4>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">
              Foque em completar as aulas de <strong>Foco Sincronizado</strong> primeiro — elas são a chave para o seu rodízio atual.
              A <strong>Base da Prova</strong> garante que você não esqueça os temas que mais caem, independente da área.
            </p>
          </BentoCard>
        )}
      </section>

      <SetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        initial={settings}
        onSave={salvarSettings}
      />

      <RedistribuirDialog
        open={redistOpen}
        onOpenChange={setRedistOpen}
        pendencias={pendenciasAulas}
        maxPorSemana={AULAS_POR_SEMANA}
        proximasSemanas={proximasSemanasDisponiveis}
        currentWeekIndex={currentWeekIndex}
        onConfirm={aplicarRedistribuicao}
      />
    </div>
  );
}
