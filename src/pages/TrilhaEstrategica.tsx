import { useEffect, useState, useMemo } from "react";
import { Settings as SettingsIcon, Flame, Target, AlertCircle, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useTrilhaPlano } from "@/hooks/useTrilhaPlano";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";
import SetupDialog from "@/components/trilha/SetupDialog";
import BlocoAula from "@/components/trilha/BlocoAula";
import RevisaoEspecifica from "@/components/trilha/RevisaoEspecifica";
import { useNavigate } from "react-router-dom";

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

  // pendências = primeiras N aulas de foco + base não estudadas até atingir o déficit (limite 5 itens)
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
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground shadow-md">
            <Map className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Trilha Estratégica</h1>
            <p className="text-xs text-muted-foreground">Seu mapa para a prova</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSetupOpen(true)}>
          <SettingsIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Configurações</span>
        </Button>
      </div>

      {/* Painel de Controle */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <div className="text-sm text-muted-foreground">Status semanal</div>
            <div className="text-2xl font-bold">
              {studiedThisWeek}<span className="text-muted-foreground text-base">/{metaSemana}</span>{" "}
              <span className="text-sm font-normal text-muted-foreground">OQs</span>
            </div>
          </div>
          {espLabel && (
            <Badge className="bg-accent/20 text-accent-foreground border-accent/40">
              <Flame className="h-3 w-3" /> Modo: Rodízio de {espLabel}
            </Badge>
          )}
        </div>
        <Progress value={progresso} className="h-2.5" />
        {settings.prova_data && (
          <p className="text-xs text-muted-foreground mt-2">
            Prova {settings.prova_nome || "alvo"} em{" "}
            {Math.max(0, Math.ceil((new Date(settings.prova_data).getTime() - Date.now()) / 86400000))} dias
          </p>
        )}
      </div>

      {/* Foco Sincronizado */}
      {focoAulas.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-accent" />
            <h2 className="font-bold text-lg">Foco Sincronizado</h2>
            <span className="text-xs text-muted-foreground">— alinhado ao seu rodízio</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {focoAulas.map((a) => (
              <BlocoAula key={a.id} aula={a} accent="foco" />
            ))}
          </div>
        </section>
      )}

      {/* Base da Prova */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-lg">Base da Prova</h2>
          <span className="text-xs text-muted-foreground">— alta prevalência</span>
        </div>
        {baseAulas.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 rounded-xl bg-muted/40">
            Nenhuma aula tier 1–2 disponível com OQs gerados.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {baseAulas.slice(0, 8).map((a) => (
              <BlocoAula key={a.id} aula={a} accent="base" />
            ))}
          </div>
        )}
      </section>

      {/* Pendências */}
      {pendencias.length > 0 && deficitAnterior > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <h2 className="font-bold text-lg">Pendências da semana anterior</h2>
            <Badge variant="destructive">{deficitAnterior} OQs</Badge>
          </div>
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 divide-y divide-destructive/20">
            {pendencias.map((a) => {
              const ja = settings.redistribuidos.find((r) => r.aula_id === a.id)?.ja_redistribuido;
              return (
                <div key={a.id} className="p-3 flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{a.nome}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {ESPECIALIDADE_LABEL[a.especialidade as keyof typeof ESPECIALIDADE_LABEL] ?? a.especialidade}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => navigate(`/estudo?tipo=aula&aula_id=${a.id}`)}>
                      Fazer agora
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      disabled={ja}
                      title={ja ? "Já redistribuído antes" : "Redistribuir para próximas semanas"}
                      onClick={() => redistribuir(a.id, a.nome)}
                    >
                      {ja ? "Já redistribuído" : "Redistribuir"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground italic">
            Cada pendência só pode ser redistribuída uma vez — evita o efeito bola de neve.
          </p>
        </section>
      )}

      {/* Revisão específica */}
      <RevisaoEspecifica aulas={aulas} />

      <SetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        initial={settings}
        onSave={salvarSettings}
      />
    </div>
  );
}
