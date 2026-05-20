import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Target,
  Map,
  ListChecks,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Objetivo = "residencia" | "revalida" | "titulo" | "manutencao";

const OBJETIVOS: { id: Objetivo; label: string; desc: string; icon: string }[] = [
  { id: "residencia", label: "Residência médica", desc: "Provas de R1/R3", icon: "🎓" },
  { id: "revalida", label: "Revalida / INEP", desc: "Reconhecimento de diploma", icon: "🌎" },
  { id: "titulo", label: "Prova de título", desc: "Especialização", icon: "🏆" },
  { id: "manutencao", label: "Manutenção da prática", desc: "Estudo contínuo", icon: "💡" },
];

const STEPS = [
  { key: "boas-vindas", icon: Sparkles, label: "Boas-vindas" },
  { key: "objetivo", icon: Target, label: "Objetivo" },
  { key: "trilha", icon: Map, label: "Trilha" },
  { key: "tarefas", icon: ListChecks, label: "Semana" },
  { key: "concluido", icon: CheckCircle2, label: "Pronto!" },
];

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [saving, setSaving] = useState(false);

  const progress = ((step + 1) / STEPS.length) * 100;

  const handleSkip = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ onboarding_skipped: true } as never)
      .eq("id", user.id);
    onSkip();
  };

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        objetivo_principal: objetivo,
      } as never)
      .eq("id", user.id);
    setSaving(false);
    onComplete();
  };

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      {/* Skip discreto */}
      <button
        onClick={handleSkip}
        className="absolute top-4 right-4 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-2 py-1 rounded"
        aria-label="Pular tutorial"
      >
        <X className="h-3 w-3" /> Pular tutorial
      </button>

      <div className="w-full max-w-2xl bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header progresso */}
        <div className="p-6 pb-4 border-b border-border/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const active = i === step;
                const done = i < step;
                return (
                  <div
                    key={s.key}
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                      active && "bg-primary text-primary-foreground scale-110 shadow-lg",
                      done && "bg-primary/30 text-primary",
                      !active && !done && "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                );
              })}
            </div>
            <span className="text-xs text-muted-foreground">
              Passo {step + 1} de {STEPS.length}
            </span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        {/* Conteúdo */}
        <div className="p-6 sm:p-8 min-h-[320px]">
          {step === 0 && (
            <div className="text-center space-y-4">
              <div className="text-6xl">👋</div>
              <h2 className="text-2xl font-bold">Bem-vindo ao OQ.Med!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Você ganhou <strong className="text-primary">7 dias grátis</strong> com acesso total a tudo —
                geração de OQs por IA, materiais e trilha personalizada.
              </p>
              <p className="text-sm text-muted-foreground">
                Vamos configurar seu estudo em <strong>menos de 3 minutos</strong>.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold mb-1">Qual é o seu objetivo principal?</h2>
                <p className="text-sm text-muted-foreground">
                  Vamos calibrar a IA e os materiais para você.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {OBJETIVOS.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setObjetivo(o.id)}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      objetivo === o.id
                        ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                        : "border-border/60 hover:border-primary/40 hover:bg-muted/40"
                    )}
                  >
                    <div className="text-2xl mb-2">{o.icon}</div>
                    <div className="font-semibold text-sm">{o.label}</div>
                    <div className="text-xs text-muted-foreground">{o.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center space-y-4">
              <Map className="h-12 w-12 mx-auto text-primary" />
              <h2 className="text-xl font-bold">Configure sua Trilha Estratégica</h2>
              <p className="text-muted-foreground max-w-md mx-auto text-sm">
                A Trilha organiza seu estudo dia a dia, com base em ciência e no que mais cai nas provas.
                Vamos abrir a configuração rapidíssima para você.
              </p>
              <Button
                size="lg"
                onClick={() => {
                  navigate("/trilha?setup=1");
                  next();
                }}
              >
                Configurar trilha <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <div>
                <button
                  onClick={next}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Pular essa etapa
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <ListChecks className="h-12 w-12 mx-auto text-primary" />
                <h2 className="text-xl font-bold">Suas tarefas da semana</h2>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Conforme você responde OQs, o algoritmo aprende seu ritmo e calibra as estatísticas.
                  Dê uma olhada no que te espera:
                </p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Responder OQs novos da especialidade escolhida</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Revisar OQs que você errou (repetição espaçada)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Estudar 1 material em PDF guiado</span>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                💡 Quanto mais você responde, mais inteligente fica seu estudo.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-4">
              <div className="text-6xl">🚀</div>
              <h2 className="text-2xl font-bold">Tudo pronto!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Bons estudos! Lembre-se: você tem <strong className="text-primary">7 dias grátis</strong> com
                acesso total. Depois disso, são apenas <strong>R$ 0,72/dia</strong> para continuar com o plano Prata.
              </p>
              <p className="text-xs text-muted-foreground italic">
                Acreditamos na democratização do estudo médico de qualidade.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/60 flex items-center justify-between bg-muted/20">
          <Button variant="ghost" onClick={prev} disabled={step === 0} size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={next}
              disabled={step === 1 && !objetivo}
              size="sm"
            >
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={saving} size="sm">
              {saving ? "Salvando..." : "Começar a estudar"} <Sparkles className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
