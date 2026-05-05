import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ESPECIALIDADE_LABEL, Especialidade } from "@/lib/oq";
import { ArrowUpRight, Flame, Sparkles, Clock, Heart, Stethoscope, Scissors, Baby, HeartPulse, Activity, Info } from "lucide-react";
import NeonProgressBar from "@/components/console/NeonProgressBar";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

const NOTA_LABEL = ["Fácil demais", "Fácil", "Médio", "Difícil", "Impossível/Erro"];
const NOTA_COLOR = ["bg-[hsl(var(--success))]", "bg-[hsl(152_60%_55%)]", "bg-[hsl(var(--warning))]", "bg-[hsl(20_90%_55%)]", "bg-[hsl(var(--destructive))]"];

const ESP_ICON: Record<Especialidade, any> = {
  clinica_medica: Stethoscope, cirurgia_geral: Scissors, pediatria: Baby,
  ginecologia_obstetricia: HeartPulse, medicina_preventiva: Activity,
};

function ContainerRevisaoExpandivel({ tipo, label, icon: Icon, colorClass }: { tipo: string; label: string; icon: any; colorClass?: string }) {
  const [expandido, setExpandido] = useState(false);

  return (
    <div className={cn(
      "relative transition-all duration-300",
      expandido ? "z-50" : "z-0"
    )}>
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

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, acertos: 0, erros: 0, hoje: 0, dist: [0,0,0,0,0] });
  const [historico, setHistorico] = useState<any[]>([]);

  useEffect(() => {
    document.title = "Área do aluno — OQ MED";
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("desempenho_cards")
        .select("*, cards(comando, especialidade)")
        .eq("usuario_id", user.id)
        .order("timestamp_ultima", { ascending: false })
        .limit(100);
      const all = data ?? [];
      const dist = [0,0,0,0,0];
      let total = 0, acertos = 0, erros = 0, hoje = 0;
      const hoje0 = new Date(); hoje0.setHours(0,0,0,0);
      all.forEach((d: any) => {
        total += d.contador_vezes;
        acertos += d.contador_acertos;
        erros += d.contador_erros;
        if (d.ultima_nota !== null) dist[d.ultima_nota]++;
        if (d.timestamp_ultima && new Date(d.timestamp_ultima) >= hoje0) hoje++;
      });
      setStats({ total, acertos, erros, hoje, dist });
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

      {/* Revisão inteligente */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Revisão inteligente</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <ContainerRevisaoExpandivel tipo="criticos" label="Críticos" icon={Flame} colorClass="text-destructive" />
          <ContainerRevisaoExpandivel tipo="dificeis" label="Difíceis" icon={Activity} colorClass="text-warning" />
          <ContainerRevisaoExpandivel tipo="novos" label="Novos" icon={Sparkles} colorClass="text-accent" />
          <ContainerRevisaoExpandivel tipo="esquecidos" label="Esquecidos" icon={Clock} colorClass="text-muted-foreground" />
          <ContainerRevisaoExpandivel tipo="favoritos" label="Favoritos" icon={Heart} colorClass="text-accent" />
        </div>
      </section>

      {/* Especialidades */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Por especialidade</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(Object.keys(ESPECIALIDADE_LABEL) as Especialidade[]).map((e) => {
            const Icon = ESP_ICON[e];
            return (
              <Link key={e} to={`/estudo?esp=${e}`} className="paper-card p-4 hover:-translate-y-1 transition-all">
                <Icon className="h-5 w-5 text-[hsl(var(--primary))] mb-3" />
                <p className="font-semibold text-sm leading-tight">{ESPECIALIDADE_LABEL[e]}</p>
              </Link>
            );
          })}
        </div>
      </section>

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
