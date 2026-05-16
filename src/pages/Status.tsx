import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Trash2, Clock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { readAiErrors, clearAiErrors, AiErrorEntry } from "@/lib/aiErrorLog";
import { cn } from "@/lib/utils";

type Status = "online" | "lento" | "limitado" | "sem_creditos" | "offline";

interface AiStatus {
  ok: boolean;
  status: Status;
  message: string;
  latencyMs?: number;
  credits?: { remaining: string; limit?: string | null } | null;
  checkedAt: string;
}

const STATUS_STYLE: Record<Status, { label: string; bg: string; fg: string; Icon: any }> = {
  online:       { label: "Tudo certo",     bg: "bg-emerald-500/10 border-emerald-500/30", fg: "text-emerald-500", Icon: CheckCircle2 },
  lento:        { label: "Um pouco lento", bg: "bg-amber-500/10 border-amber-500/30",     fg: "text-amber-500",   Icon: Clock },
  limitado:     { label: "Movimento alto", bg: "bg-amber-500/10 border-amber-500/30",     fg: "text-amber-500",   Icon: AlertTriangle },
  sem_creditos: { label: "Sem créditos",   bg: "bg-red-500/10 border-red-500/30",         fg: "text-red-500",     Icon: XCircle },
  offline:      { label: "Fora do ar",     bg: "bg-red-500/10 border-red-500/30",         fg: "text-red-500",     Icon: XCircle },
};

export default function Status() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<AiErrorEntry[]>([]);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-status", { body: {} });
      if (error) throw error;
      setStatus(data as AiStatus);
    } catch {
      setStatus({
        ok: false,
        status: "offline",
        message: "Não conseguimos falar com o serviço de IA agora.",
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      setErrors(readAiErrors());
    }
  }

  useEffect(() => {
    document.title = "Status — OQ MED";
    load();
  }, []);

  const s = status ? STATUS_STYLE[status.status] : STATUS_STYLE.offline;
  const Icon = s.Icon;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" /> Status do estudo inteligente
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Veja se a geração de OQs por IA está funcionando agora.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      <Card className={cn("p-6 border-2 transition-colors", s.bg)}>
        <div className="flex items-start gap-4">
          <Icon className={cn("w-10 h-10 shrink-0", s.fg)} />
          <div className="flex-1">
            <div className={cn("text-sm font-semibold uppercase tracking-wider", s.fg)}>
              {s.label}
            </div>
            <p className="text-lg font-medium mt-1">
              {status?.message ?? "Verificando..."}
            </p>
            {status?.latencyMs != null && (
              <p className="text-xs text-muted-foreground mt-2">
                Tempo de resposta: {(status.latencyMs / 1000).toFixed(1)}s · Verificado{" "}
                {new Date(status.checkedAt).toLocaleTimeString("pt-BR")}
              </p>
            )}
          </div>
        </div>
      </Card>

        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> Como funcionam os créditos?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            {status?.status === "sem_creditos" ? (
              <div className="space-y-3 p-5 rounded-2xl bg-red-500/5 border border-red-500/10">
                <div className="text-3xl font-bold text-red-500">Esgotados</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Os créditos de inteligência artificial para este mês foram atingidos. Nossa equipe já foi notificada para providenciar a reposição o quanto antes.
                </p>
                <div className="bg-white/5 p-3 rounded-lg border border-red-500/10">
                  <p className="text-sm font-medium text-red-500">O que fazer agora?</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                    <li>Você ainda pode estudar os OQs que já foram gerados.</li>
                    <li>Pratique com os cards do Banco Geral.</li>
                  </ul>
                </div>
              </div>
            ) : status?.credits?.remaining ? (
              <div className="space-y-3 p-5 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-primary">{status.credits?.remaining ?? "0"}</span>
                  <span className="text-sm text-muted-foreground font-medium">gerações restantes</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {status.credits.limit
                    ? `Você ainda tem uma boa reserva de ${status.credits.remaining} gerações de um total de ${status.credits.limit} para este período.`
                    : "Sua conta está com saldo positivo para gerar novas questões agora."}
                </p>
              </div>
            ) : (
              <div className="space-y-3 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold text-lg">Créditos Disponíveis</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  O saldo está positivo. Você pode continuar enviando seus PDFs e resumos para transformar em OQs normalmente.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Regras do Plano Ouro</h3>
              <ul className="space-y-3">
                <li className="flex gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Limite Generoso:</strong> Você tem direito a gerações mensais que cobrem toda a sua jornada de estudo.</span>
                </li>
                <li className="flex gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Consumo por PDF:</strong> Cada "geração" consome 1 crédito e cria entre 8 e 12 OQs estratégicas de uma só vez.</span>
                </li>
                <li className="flex gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Renovação Mensal:</strong> Seus créditos são renovados automaticamente a cada ciclo de 30 dias da sua assinatura.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-2xl">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <h4 className="text-sm font-bold uppercase tracking-widest">Uso Consciente</h4>
          </div>
          <p className="text-sm text-amber-700/80 leading-relaxed">
            Para garantir a melhor performance para todos os alunos, evite enviar o mesmo PDF repetidamente. Cada geração é otimizada para extrair os pontos mais importantes do conteúdo de forma estratégica.
          </p>
        </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Últimas mensagens que você viu</h2>
          {errors.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { clearAiErrors(); setErrors([]); }}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Limpar
            </Button>
          )}
        </div>
        {errors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum problema registrado por aqui. 🎉
          </p>
        ) : (
          <ul className="space-y-2">
            {errors.map((e, i) => (
              <li key={i} className="text-sm border-l-2 border-amber-500/40 pl-3 py-1">
                <div className="text-foreground">{e.message}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {e.context ? `${e.context} · ` : ""}
                  {new Date(e.at).toLocaleString("pt-BR")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Se algo parecer travado por muito tempo, recarregue a página ou tente novamente em alguns minutos.
      </p>
    </div>
  );
}
