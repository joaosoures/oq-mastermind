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

      <Card className="p-6">
        <h2 className="font-semibold text-lg mb-3">Créditos de IA do mês</h2>
        {status?.credits?.remaining ? (
          <div>
            <div className="text-3xl font-bold">{status.credits.remaining}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {status.credits.limit
                ? `de ${status.credits.limit} disponíveis para todos os alunos.`
                : "ainda disponíveis para gerar OQs hoje."}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            O contador de créditos não está visível agora. Se as gerações estiverem funcionando, está tudo bem —
            os professores acompanham o consumo nos bastidores.
          </p>
        )}
      </Card>

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
