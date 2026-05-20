import { useEffect, useState, useMemo } from "react";
import { Settings as SettingsIcon, Flame, Target, AlertCircle, Map, Sparkles, Trophy, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useTrilhaPlano } from "@/hooks/useTrilhaPlano";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";
import SetupDialog from "@/components/trilha/SetupDialog";
import BlocoAula from "@/components/trilha/BlocoAula";
import RevisaoEspecifica from "@/components/trilha/RevisaoEspecifica";
import CalendarioEstudos from "@/components/trilha/CalendarioEstudos";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function TrilhaEstrategica() {
  const {
    loading, settings, salvarSettings,
    aulas, focoAulas, baseAulas,
    metaSemana, studiedThisWeek, deficitAnterior,
  } = useTrilhaPlano();

  const [setupOpen, setSetupOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !settings.setup_done) setSetupOpen(true);
  }, [loading, settings.setup_done]);

  const progresso = Math.min(100, Math.round((studiedThisWeek / Math.max(1, metaSemana)) * 100));
  const espRodizio = settings.rodizio_atual?.especialidade;
  const espLabel = espRodizio ? (ESPECIALIDADE_LABEL[espRodizio as keyof typeof ESPECIALIDADE_LABEL] ?? espRodizio) : null;

  const pendencias = useMemo(() => {
    if (deficitAnterior <= 0) return [];
    return [...focoAulas, ...baseAulas].slice(0, 5);
  }, [deficitAnterior, focoAulas, baseAulas]);

  const redistribuir = (aulaId: string, aulaNome: string) => {
    const ja = settings.redistribuidos.find((r) => r.aula_id === aulaId);
    if (ja?.ja_redistribuido) return;
    const novo = [
      ...settings.redistribuidos.filter((r) => r.aula_id !== aulaId),
      { aula_id: aulaId, aula_nome: aulaNome, semana_iso: "futuro", ja_redistribuido: true },
    ];
    salvarSettings({ ...settings, redistribuidos: novo });
  };

  return (
    <div className="min-h-full px-4 md:px-8 py-8 md:py-12 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500">
      {/* Header Estilizado */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Personalizado</span>
            <div className="h-px w-8 bg-accent/30" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-black tracking-tighter text-foreground flex items-center gap-3">
            Trilha Estratégica
            <Sparkles className="h-6 w-6 text-accent animate-pulse" />
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl">
            Seu mapa de guerra otimizado. Priorizamos o que cai na sua prova com base no seu rodízio e desempenho.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="lg" 
          onClick={() => setSetupOpen(true)}
          className="rounded-2xl border-none shadow-neu-out-sm hover:shadow-neu-in bg-background font-bold text-xs uppercase tracking-wider h-12 gap-2"
        >
          <SettingsIcon className="h-4 w-4" />
          Configurar Planejamento
        </Button>
      </header>

      {/* Painel de Controle (Bento Style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 p-8 rounded-[2.5rem] bg-black text-white relative overflow-hidden shadow-2xl group">
          <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
            <Map className="w-48 h-48 text-accent" />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Progresso da Semana</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black tracking-tighter">{studiedThisWeek}</span>
                  <span className="text-xl font-bold text-white/40">/ {metaSemana} OQs</span>
                </div>
              </div>
              {espLabel && (
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl">
                  <Flame className="h-4 w-4 text-orange-400" />
                  <span className="text-xs font-bold">{espLabel}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/60">
                <span>Meta Semanal</span>
                <span>{progresso}%</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progresso}%` }}
                  className="h-full bg-gradient-to-r from-accent to-blue-400 rounded-full shadow-[0_0_15px_rgba(0,163,255,0.5)]"
                />
              </div>
            </div>

            {settings.prova_data && (
              <div className="flex items-center gap-2 text-xs text-white/50 font-medium">
                <Trophy className="h-3.5 w-3.5 text-accent" />
                <span>{settings.prova_nome || "Prova"} em {Math.max(0, Math.ceil((new Date(settings.prova_data).getTime() - Date.now()) / 86400000))} dias</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-accent/5 border border-accent/20 flex flex-col justify-between group hover:border-accent/40 transition-colors shadow-sm">
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center shadow-lg shadow-accent/20 group-hover:scale-110 transition-transform">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Foco Total</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                Priorizamos temas de alta incidência e as áreas do seu rodízio atual.
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full mt-6 justify-between px-0 hover:bg-transparent group"
            onClick={() => {
              const el = document.getElementById('foco-sincronizado');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <span className="text-xs font-black uppercase tracking-widest">Ver metas</span>
            <ArrowUpRight className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </Button>
        </div>
      </div>

      {/* Foco Sincronizado */}
      {focoAulas.length > 0 && (
        <section id="foco-sincronizado" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h2 className="font-black text-xl tracking-tight">Foco Sincronizado</h2>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Alinhado ao seu rodízio de {espLabel}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {focoAulas.map((a) => (
              <BlocoAula key={a.id} aula={a} accent="foco" />
            ))}
          </div>
        </section>
      )}

      {/* Base da Prova */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-black text-xl tracking-tight">Base da Prova</h2>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Alta prevalência histórica</p>
            </div>
          </div>
        </div>
        {baseAulas.length === 0 ? (
          <div className="p-10 rounded-[2rem] border border-dashed border-border flex flex-col items-center text-center space-y-3">
            <p className="text-sm text-muted-foreground font-medium">Nenhuma aula tier 1–2 disponível com OQs gerados.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {baseAulas.slice(0, 9).map((a) => (
              <BlocoAula key={a.id} aula={a} accent="base" />
            ))}
          </div>
        )}
      </section>

      {/* Pendências */}
      {pendencias.length > 0 && deficitAnterior > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h2 className="font-black text-xl tracking-tight">Pendências</h2>
              <p className="text-[10px] text-destructive uppercase font-bold tracking-widest">Déficit de {deficitAnterior} OQs</p>
            </div>
          </div>
          <div className="rounded-[2.5rem] border border-destructive/20 bg-destructive/5 overflow-hidden">
            <div className="divide-y divide-destructive/10">
              {pendencias.map((a) => {
                const ja = settings.redistribuidos.find((r) => r.aula_id === a.id)?.ja_redistribuido;
                return (
                  <div key={a.id} className="p-6 flex items-center justify-between gap-4 flex-wrap hover:bg-destructive/[0.02] transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-base truncate">{a.nome}</div>
                      <div className="text-[11px] text-muted-foreground uppercase tracking-widest font-black mt-1">
                        {ESPECIALIDADE_LABEL[a.especialidade as keyof typeof ESPECIALIDADE_LABEL] ?? a.especialidade}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => navigate(`/estudo?tipo=aula&aula_id=${a.id}`)}
                        className="rounded-xl font-bold h-10 px-6"
                      >
                        Fazer agora
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        disabled={ja}
                        title={ja ? "Já redistribuído antes" : "Redistribuir para próximas semanas"}
                        onClick={() => redistribuir(a.id, a.nome)}
                        className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 h-10"
                      >
                        {ja ? "Redistribuído" : "Redistribuir"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Revisão específica & Rodapé */}
      <footer className="pt-10 border-t border-border/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RevisaoEspecifica aulas={aulas} />
          <div className="p-8 rounded-[2rem] bg-muted/30 border border-border/50 flex flex-col justify-center">
            <h4 className="font-bold text-sm">Dica da Trilha</h4>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Foque em completar as aulas de <strong>Foco Sincronizado</strong> primeiro. Elas são a chave para o seu rodízio atual. 
              A <strong>Base da Prova</strong> serve para garantir que você não esqueça os temas que mais caem, independente da área.
            </p>
          </div>
        </div>
      </footer>

      <SetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        initial={settings}
        onSave={salvarSettings}
      />
    </div>
  );
}
