import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ESPECIALIDADE_LABEL, Especialidade } from "@/lib/oq";
import { ArrowUpRight, Flame, Sparkles, Clock, Heart, Stethoscope, Scissors, Baby, HeartPulse, Activity, Info, Trophy, Target, Award, Zap, Brain, TrendingUp, Lock, Crown, BookOpen, AlertTriangle, Compass } from "lucide-react";
import NeonProgressBar from "@/components/console/NeonProgressBar";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { useUserPlan } from "@/hooks/useUserPlan";

const NOTA_LABEL = ["Fácil demais", "Fácil", "Médio", "Difícil", "Impossível/Erro"];
const NOTA_COLOR = ["bg-[hsl(var(--success))]", "bg-[hsl(152_60%_55%)]", "bg-[hsl(var(--warning))]", "bg-[hsl(20_90%_55%)]", "bg-[hsl(var(--destructive))]"];

const ESP_ICON: Record<Especialidade, any> = {
  clinica_medica: Stethoscope, cirurgia_geral: Scissors, pediatria: Baby,
  ginecologia_obstetricia: HeartPulse, medicina_preventiva: Activity,
};

function ContainerRevisaoExpandivel({ tipo, label, icon: Icon, colorClass, locked }: { tipo: string; label: string; icon: any; colorClass?: string; locked?: boolean }) {
  const [expandido, setExpandido] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setExpandido(false);
      }
    }
    if (expandido) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expandido]);

  if (locked) {
    return (
      <button
        onClick={() => navigate("/meu-plano")}
        className="paper-card p-4 text-left w-full relative overflow-hidden group opacity-90 hover:opacity-100 hover:-translate-y-1 transition-all border-dashed"
        title="Disponível nos planos Prata e Ouro"
      >
        <div className="absolute top-2 right-2 bg-amber-500/15 text-amber-500 p-1.5 rounded-lg">
          <Lock className="h-3.5 w-3.5" />
        </div>
        <Icon className={cn("h-5 w-5 mb-3 text-muted-foreground/70")} />
        <p className="font-semibold text-muted-foreground">{label}</p>
        <p className="text-xs text-amber-500/90 mt-1 flex items-center gap-1">
          <Crown className="h-3 w-3" /> Plano pago
        </p>
      </button>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative transition-all duration-300",
        expandido ? "z-50" : "z-0"
      )}
    >
      <button
        onClick={() => setExpandido(!expandido)}
        className={cn(
          "paper-card p-4 text-left transition-all group w-full",
          expandido ? `ring-2 ring-accent border-accent/50 shadow-xl shadow-accent/10` : "hover:-translate-y-1"
        )}
      >
        <Icon className={cn("h-5 w-5 mb-3 transition-colors", expandido ? "text-accent fill-accent" : colorClass || "text-accent")} />
        <p className="font-semibold text-[hsl(var(--foreground))]">{label}</p>
        <p className="text-xs text-muted-foreground mt-1 group-hover:text-accent transition">
          {expandido ? "Selecione a área ↓" : "Estudar →"}
        </p>
      </button>

      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute top-full left-0 right-0 mt-2 p-2 bg-card border border-border shadow-2xl rounded-2xl flex flex-col gap-1 min-w-[200px]"
          >
            <Link
              to={`/estudo?tipo=${tipo}`}
              className="px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-accent hover:text-white transition-colors flex items-center justify-between group"
            >
              Todas as Especialidades
              <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
            </Link>
            <div className="h-px bg-border/50 my-1" />
            {(Object.keys(ESPECIALIDADE_LABEL) as Especialidade[]).map((e) => (
              <Link
                key={e}
                to={`/estudo?tipo=${tipo}&esp=${e}`}
                className="px-3 py-2 text-xs font-medium rounded-xl hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors flex items-center justify-between group"
              >
                {ESPECIALIDADE_LABEL[e]}
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface EspecialidadeStats {
  especialidade: Especialidade;
  visto: number;
  acertos: number;
  erros: number;
  dominio: number;
}
function EspecialidadesRanking({ stats }: { stats: EspecialidadeStats[] }) {
  if (stats.length === 0) return null;

  // Filtra especialidades que o aluno realmente estudou (pelo menos 1 visto)
  const estudadas = stats.filter(s => s.visto > 0);
  if (estudadas.length === 0) return null;

  // Ordena por domínio, mas o título principal vai para quem tem mais volume + domínio
  // Score = domínio * (visto / maxVisto)
  const maxVisto = Math.max(...estudadas.map(s => s.visto));
  const sortedStats = [...estudadas].sort((a, b) => {
    const scoreA = a.dominio * (a.visto / maxVisto);
    const scoreB = b.dominio * (b.visto / maxVisto);
    return scoreB - scoreA;
  });

  const topEspecialidade = sortedStats[0];

  const getCreativeTitle = (esp: Especialidade) => {
    switch (esp) {
      case "clinica_medica": return "Mestre dos Diagnósticos";
      case "cirurgia_geral": return "Prodígio do Centro Cirúrgico";
      case "pediatria": return "Guardião dos Pequenos";
      case "ginecologia_obstetricia": return "Especialista em Vida";
      case "medicina_preventiva": return "Visionário da Saúde Coletiva";
      default: return "Estrategista Médico";
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Monitor de Proficiência</h2>
          <p className="text-xs text-muted-foreground/60 mt-1">Sua evolução detalhada por área de atuação médica.</p>
        </div>
        {topEspecialidade.dominio > 40 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-accent/10 border border-accent/20 rounded-2xl animate-pulse">
            <Trophy className="h-5 w-5 text-accent" />
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-accent">Status Atual</p>
              <p className="text-xs font-bold text-foreground">{getCreativeTitle(topEspecialidade.especialidade)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 1 Highlight */}
        <BentoCard className="md:col-span-2 bg-gradient-to-br from-accent/5 via-card to-card border-accent/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
            <Brain className="w-32 h-32 text-accent" />
          </div>
          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/30">
                <Award className="h-4 w-4 text-accent" />
                <span className="text-[10px] font-black uppercase tracking-widest text-accent">Seu Maior Domínio</span>
              </div>
              <h3 className="text-3xl font-black tracking-tight">{ESPECIALIDADE_LABEL[topEspecialidade.especialidade]}</h3>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Precisão</p>
                  <p className="text-2xl font-black text-success">{Math.round((topEspecialidade.acertos / (topEspecialidade.visto || 1)) * 100)}%</p>
                </div>
                <div className="w-px h-8 bg-border/50 hidden md:block mt-2" />
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">OQs Vencidos</p>
                  <p className="text-2xl font-black text-foreground">{topEspecialidade.visto}</p>
                </div>
              </div>
            </div>
            <div className="w-32 h-32 relative">
              <svg className="w-full h-full -rotate-90">
                <circle cx="64" cy="64" r="58" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
                <motion.circle
                  cx="64" cy="64" r="58" fill="none" stroke="currentColor" strokeWidth="8"
                  strokeDasharray={364}
                  initial={{ strokeDashoffset: 364 }}
                  animate={{ strokeDashoffset: 364 - (364 * topEspecialidade.dominio) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="text-accent"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-black">{Math.round(topEspecialidade.dominio)}%</span>
              </div>
            </div>
          </div>
        </BentoCard>

        {/* Outras Especialidades */}
        {sortedStats.slice(1).map((s, idx) => (
          <div key={s.especialidade} className="paper-card p-4 flex items-center gap-4 hover:border-border/80 transition-all">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground font-black">
              #{idx + 2}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{ESPECIALIDADE_LABEL[s.especialidade]}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s.dominio}%` }}
                    className="h-full bg-accent/60"
                  />
                </div>
                <span className="text-[10px] font-bold tabular-nums">{Math.round(s.dominio)}%</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-success">+{s.acertos}</p>
              <p className="text-[10px] font-bold text-destructive">-{s.erros}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function InsightSurpresa({ stats }: { stats: any }) {
  const [insight, setInsight] = useState<{ icon: any; title: string; text: string; color: string } | null>(null);

  useEffect(() => {
    const total = stats.total || 0;
    const taxa = total > 0 ? (stats.acertos / total) * 100 : 0;
    
    if (total === 0) return;

    if (taxa > 85) {
      setInsight({
        icon: Zap,
        title: "Frequência de Gênio",
        text: "Sua precisão está em nível de elite. Você não está apenas estudando, está reescrevendo o que é possível.",
        color: "text-accent"
      });
    } else if (stats.hoje > 50) {
      setInsight({
        icon: Flame,
        title: "Ritmo Inabalável",
        text: "Sua consistência hoje é maior que 90% dos usuários. Esse é o momento onde a memória se torna permanente.",
        color: "text-orange-500"
      });
    } else if (stats.erros > stats.acertos * 0.5) {
      setInsight({
        icon: Target,
        title: "Resiliência Pura",
        text: "Você está enfrentando os cards mais difíceis sem recuar. É no erro que o cérebro cria as conexões mais fortes.",
        color: "text-blue-500"
      });
    } else {
      setInsight({
        icon: Sparkles,
        title: "Evolução Silenciosa",
        text: "Cada OQ respondido é uma sinapse a mais. Você está construindo uma base inabalável para o seu futuro.",
        color: "text-purple-500"
      });
    }
  }, [stats]);

  if (!insight) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative p-6 rounded-[2rem] bg-black text-white overflow-hidden group shadow-2xl"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent opacity-50" />
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
        <div className={cn("p-4 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/10", insight.color)}>
          <insight.icon className="w-8 h-8" />
        </div>
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-accent">{insight.title}</h3>
          </div>
          <p className="text-lg md:text-xl font-medium leading-relaxed tracking-tight text-white/90">
            "{insight.text}"
          </p>
        </div>
      </div>
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
    </motion.div>
  );
}

function RecomendacoesMateriais({ stats, locked }: { stats: EspecialidadeStats[]; locked: boolean }) {
  const navigate = useNavigate();
  const todas = Object.keys(ESPECIALIDADE_LABEL) as Especialidade[];

  // Constrói recomendações estratégicas (máx 3) priorizando: baixo domínio com volume → não estudadas → reforço top
  const recs: { esp: Especialidade; tipo: "fraco" | "novo" | "reforco"; razao: string; metric: string }[] = [];
  const estudadas = stats.filter(s => s.visto > 0);
  const fracas = [...estudadas].filter(s => s.dominio < 70).sort((a, b) => a.dominio - b.dominio);
  for (const s of fracas.slice(0, 2)) {
    recs.push({
      esp: s.especialidade,
      tipo: "fraco",
      razao: "Domínio abaixo do ideal — revise os materiais para virar o jogo.",
      metric: `${Math.round(s.dominio)}% de acerto · ${s.erros} erros`,
    });
  }
  const estudadasIds = new Set(estudadas.map(s => s.especialidade));
  const naoEstudadas = todas.filter(e => !estudadasIds.has(e));
  for (const e of naoEstudadas.slice(0, 3 - recs.length)) {
    recs.push({
      esp: e,
      tipo: "novo",
      razao: "Ainda sem dados — comece pelos materiais para criar base.",
      metric: "Território inexplorado",
    });
  }
  if (recs.length < 3 && estudadas.length > 0) {
    const fortes = [...estudadas].sort((a, b) => b.dominio - a.dominio);
    for (const s of fortes) {
      if (recs.find(r => r.esp === s.especialidade)) continue;
      recs.push({
        esp: s.especialidade,
        tipo: "reforco",
        razao: "Mantenha o nível — material rápido para consolidar.",
        metric: `${Math.round(s.dominio)}% de domínio`,
      });
      if (recs.length >= 3) break;
    }
  }

  const tipoMeta: Record<string, { Icon: any; tag: string; color: string }> = {
    fraco: { Icon: AlertTriangle, tag: "Ponto Crítico", color: "text-destructive" },
    novo: { Icon: Compass, tag: "Explorar", color: "text-accent" },
    reforco: { Icon: TrendingUp, tag: "Consolidar", color: "text-success" },
  };

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Próximos materiais sugeridos</h2>
          <p className="text-xs text-muted-foreground/60 mt-1">Direcionamentos baseados no seu desempenho nos OQs.</p>
        </div>
        {locked && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full">
            <Crown className="h-3 w-3" /> Exclusivo Plano Ouro
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {recs.map((r) => {
          const Icon = ESP_ICON[r.esp];
          const meta = tipoMeta[r.tipo];
          const MetaIcon = meta.Icon;
          const action = () => {
            if (locked) navigate("/meu-plano");
            else navigate(`/materiais?esp=${r.esp}`);
          };
          return (
            <button
              key={r.esp + r.tipo}
              onClick={action}
              className={cn(
                "paper-card p-5 text-left group relative overflow-hidden transition-all hover:-translate-y-1 hover:border-accent/40",
                locked && "border-dashed opacity-90"
              )}
              title={locked ? "Disponível no plano Ouro" : `Abrir materiais de ${ESPECIALIDADE_LABEL[r.esp]}`}
            >
              {locked && (
                <div className="absolute top-3 right-3 bg-amber-500/15 text-amber-500 p-1.5 rounded-lg">
                  <Lock className="h-3.5 w-3.5" />
                </div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <MetaIcon className={cn("h-3.5 w-3.5", meta.color)} />
                <span className={cn("text-[10px] font-black uppercase tracking-[0.18em]", meta.color)}>
                  {meta.tag}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-muted/60 shrink-0">
                  <Icon className="h-5 w-5 text-[hsl(var(--primary))]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm leading-tight">{ESPECIALIDADE_LABEL[r.esp]}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">{r.metric}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground/90 mt-3 leading-relaxed">{r.razao}</p>
              <div className={cn(
                "mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors",
                locked ? "text-amber-500" : "text-accent group-hover:translate-x-1"
              )}>
                {locked ? <><Crown className="h-3 w-3" /> Desbloquear</> : <><BookOpen className="h-3 w-3" /> Abrir materiais <ArrowUpRight className="h-3 w-3" /></>}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { canUse } = useUserPlan();
  const lockFocado = !canUse("estudo_focado");
  const [stats, setStats] = useState({ total: 0, acertos: 0, erros: 0, hoje: 0, dist: [0,0,0,0,0] });
  const [historico, setHistorico] = useState<any[]>([]);
  const [especialidadeStats, setEspecialidadeStats] = useState<EspecialidadeStats[]>([]);

  useEffect(() => {
    document.title = "Área do aluno — OQ MED";
    if (!user) return;
    (async () => {
      // Get daily progress via RPC for accuracy (total completions)
      const { data: dailyCount } = await supabase.rpc("get_daily_progress", { p_user_id: user.id });

      const { data } = await supabase
        .from("desempenho_cards")
        .select("*, cards(comando, especialidade)")
        .eq("usuario_id", user.id)
        .order("timestamp_ultima", { ascending: false })
        .limit(100);
      
      const all = data ?? [];
      const dist = [0,0,0,0,0];
      let total = 0, acertos = 0, erros = 0;

      // Processar estatísticas por especialidade
      const espMap: Record<string, any> = {};
      all.forEach((d: any) => {
        total += d.contador_vezes;
        acertos += d.contador_acertos;
        erros += d.contador_erros;
        if (d.ultima_nota !== null) dist[d.ultima_nota]++;

        const esp = d.cards?.especialidade;
        if (esp) {
          if (!espMap[esp]) espMap[esp] = { visto: 0, acertos: 0, erros: 0 };
          espMap[esp].visto += d.contador_vezes;
          espMap[esp].acertos += d.contador_acertos;
          espMap[esp].erros += d.contador_erros;
        }
      });

      const processedEspStats = Object.entries(espMap).map(([esp, data]: [string, any]) => ({
        especialidade: esp as Especialidade,
        visto: data.visto,
        acertos: data.acertos,
        erros: data.erros,
        dominio: Math.max(0, Math.min(100, (data.acertos / (data.visto || 1)) * 100))
      }));

      setStats({ total, acertos, erros, hoje: Number(dailyCount) || 0, dist });
      setEspecialidadeStats(processedEspStats);
      setHistorico(all.slice(0, 8));
    })();
  }, [user]);

  const taxa = stats.total > 0 ? Math.round((stats.acertos / stats.total) * 100) : 0;
  const { dailyGoal } = useSettings();
  const dailyPct = Math.min(100, (stats.hoje / dailyGoal) * 100);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Sua jornada</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[hsl(var(--foreground))]">Hoje, {stats.hoje} OQs.</h1>
        </div>
        <Link to="/estudo" className="text-sm font-medium text-[hsl(var(--accent))] hover:underline inline-flex items-center gap-1">
          Continuar estudando <ArrowUpRight className="h-4 w-4" />
        </Link>
      </header>

      {/* Bento grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[140px]">
        {/* Meta diária — wide */}
        <BentoCard className="col-span-2 row-span-2 bg-[hsl(var(--primary))] text-white border-none shadow-[0_20px_50px_-12px_rgba(0,29,57,0.5)] ring-1 ring-white/10">
          <div className="flex flex-col h-full justify-between p-1">
            <div className="flex items-center justify-between">
              <span className="text-sm uppercase tracking-[0.25em] font-black text-[hsl(var(--accent))] drop-shadow-[0_0_8px_hsl(var(--accent)/0.5)]">Meta diária</span>
              <div className="p-2 rounded-full bg-[hsl(var(--accent))]/20 border border-[hsl(var(--accent))]/30">
                <Flame className="h-6 w-6 text-[hsl(var(--accent))] drop-shadow-[0_0_12px_hsl(var(--accent))]" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-8xl md:text-9xl font-black tabular-nums leading-none tracking-tighter text-[hsl(var(--accent))] drop-shadow-[0_0_25px_hsl(var(--accent)/0.6)]">
                  {stats.hoje}
                </span>
                <span className="text-4xl font-black text-[hsl(var(--accent))] opacity-70 drop-shadow-sm tabular-nums">/{dailyGoal}</span>
              </div>
              <div className="mt-3 inline-flex items-center px-4 py-1.5 rounded-full bg-[hsl(var(--accent))] shadow-[0_0_20px_hsl(var(--accent)/0.4)]">
                <p className="text-sm md:text-base font-black text-[hsl(var(--primary))] uppercase tracking-wider">
                  {dailyGoal - stats.hoje > 0 ? `Faltam ${dailyGoal - stats.hoje} OQs` : "Meta cumprida! ✨"}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-white/40">
                <span>Progresso</span>
                <span>{Math.round(dailyPct)}%</span>
              </div>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden p-[2px]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${dailyPct}%` }}
                  transition={{ duration: 1, ease: "circOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--accent))] to-cyan-400"
                  style={{ boxShadow: "0 0 20px hsl(var(--accent)/0.5)" }}
                />
              </div>
            </div>
          </div>
        </BentoCard>

        <BentoCard>
          <Stat label="Taxa de acerto" value={`${taxa}%`} accent />
        </BentoCard>
        <BentoCard>
          <Stat label="Total" value={stats.total} />
        </BentoCard>
        <BentoCard>
          <Stat label="Acertos" value={stats.acertos} positive />
        </BentoCard>
        <BentoCard>
          <Stat label="Erros" value={stats.erros} negative />
        </BentoCard>
      </div>

      {/* Distribuição */}
      <BentoCard className="md:p-7">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">Distribuição por desempenho</h2>
        <div className="space-y-3">
          {NOTA_LABEL.map((l, i) => {
            const max = Math.max(...stats.dist, 1);
            const pct = (stats.dist[i] / max) * 100;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm w-36 text-muted-foreground">{i} — {l}</span>
                <div className="flex-1 h-2 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.05 }}
                    className={cn("h-full rounded-full", NOTA_COLOR[i])}
                  />
                </div>
                <span className="text-sm w-10 text-right tabular-nums font-medium">{stats.dist[i]}</span>
              </div>
            );
          })}
        </div>
      </BentoCard>

      {/* Ranking de Especialidades */}
      <EspecialidadesRanking stats={especialidadeStats} />

      {/* Insight Surpresa */}
      <InsightSurpresa stats={stats} />

      {/* Revisão inteligente */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Revisão inteligente</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <ContainerRevisaoExpandivel tipo="criticos" label="Críticos" icon={Flame} colorClass="text-destructive" locked={lockFocado} />
          <ContainerRevisaoExpandivel tipo="dificeis" label="Difíceis" icon={Activity} colorClass="text-warning" locked={lockFocado} />
          <ContainerRevisaoExpandivel tipo="novos" label="Novos" icon={Sparkles} colorClass="text-accent" locked={lockFocado} />
          <ContainerRevisaoExpandivel tipo="esquecidos" label="Esquecidos" icon={Clock} colorClass="text-muted-foreground" locked={lockFocado} />
          <ContainerRevisaoExpandivel tipo="favoritos" label="Favoritos" icon={Heart} colorClass="text-accent" />
          <ContainerRevisaoExpandivel tipo="favoritos" label="Favoritos" icon={Heart} colorClass="text-accent" />
        </div>
      </section>

      {/* Direcionamentos estratégicos para materiais */}
      <RecomendacoesMateriais stats={especialidadeStats} locked={!canUse("materiais")} />

      {/* Últimos */}
      <BentoCard>
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Últimos OQs</h2>
        {historico.length === 0 ? (
          <p className="text-sm text-muted-foreground">Você ainda não estudou hoje.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {historico.map((h: any) => (
              <li key={h.id} className="py-3 flex items-start gap-3 text-sm">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[11px] font-semibold",
                  h.ultima_nota === 4 ? "bg-[hsl(var(--destructive))/0.15] text-[hsl(var(--destructive))]" : "bg-[hsl(var(--success))/0.15] text-[hsl(var(--success))]"
                )}>
                  {h.ultima_nota}
                </span>
                <span className="flex-1 line-clamp-1">{h.cards?.comando}</span>
                <span className="text-muted-foreground text-xs">{new Date(h.timestamp_ultima).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })}</span>
              </li>
            ))}
          </ul>
        )}
      </BentoCard>
      {/* Aviso de Retenção */}
      <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex gap-3 max-w-4xl mx-auto mt-12">
        <Info className="h-5 w-5 text-blue-600 shrink-0" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Políticas de Retenção de Dados e Desempenho</p>
          <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
            O seu algoritmo de repetição espaçada e a ordem personalizada das questões dependem exclusivamente dos seus dados históricos. A inadimplência por mais de 15 dias acarreta a exclusão definitiva dessas estatísticas, resultando na perda do seu comportamento individualizado de estudo e dos materiais gerados por IA.
          </p>
        </div>
      </div>
    </div>
  );
}

function BentoCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn("paper-card p-5", className)}
    >
      {children}
    </motion.div>
  );
}

function Stat({ label, value, accent, positive, negative }: { label: string; value: any; accent?: boolean; positive?: boolean; negative?: boolean }) {
  return (
    <div className="flex flex-col h-full justify-between">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">{label}</span>
      <span className={cn(
        "text-4xl md:text-5xl font-bold tabular-nums tracking-tight",
        accent && "text-[hsl(var(--accent))]",
        positive && "text-[hsl(var(--success))]",
        negative && "text-[hsl(var(--destructive))]",
      )}>{value}</span>
    </div>
  );
}
