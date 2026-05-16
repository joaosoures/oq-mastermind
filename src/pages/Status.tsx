import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity, Sparkles, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
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

export default function Status() {
  const navigate = useNavigate();
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

  const remaining = Number(status?.credits?.remaining ?? 0);
  const limit = Number(status?.credits?.limit ?? 0);

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-12 space-y-12 animate-fade-in relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="absolute top-0 left-6 md:left-12 -mt-4 rounded-xl flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-widest">Voltar</span>
      </Button>
      {/* Header Minimalista */}
      <div className="flex items-center justify-between border-b border-white/5 pb-8">
        <div className="flex items-center gap-4">
          <div className={cn("w-3 h-3 rounded-full animate-pulse", 
            status?.status === 'online' ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" : 
            status?.status === 'offline' ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]" : "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
          )} />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Sistema de IA</h1>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mt-1">
              {status?.latencyMs ? `${status.latencyMs}ms de latência` : "Verificando..." }
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={load} 
          disabled={loading}
          className="rounded-xl hover:bg-white/5"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Grid Matemático */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Disponível</p>
          <div className={cn("text-4xl font-black tracking-tighter", remaining <= 0 ? "text-red-500" : "text-primary")}>
            {remaining}
          </div>
          <p className="text-[10px] text-muted-foreground/60 font-bold">CRÉDITOS ATUAIS</p>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Custo Estimado</p>
          <div className="text-4xl font-black tracking-tighter text-foreground">
            1.0
          </div>
          <p className="text-[10px] text-muted-foreground/60 font-bold">CRÉDITO POR PDF</p>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Renovação</p>
          <div className="text-4xl font-black tracking-tighter text-foreground">
            {limit || "---"}
          </div>
          <p className="text-[10px] text-muted-foreground/60 font-bold">CRÉDITOS / MÊS</p>
        </div>
      </div>

      {/* Alerta de Créditos Esgotados */}
      {remaining <= 0 && limit > 0 && (
        <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 space-y-2">
          <p className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
            <XCircle className="w-3 h-3" /> Limite Atingido
          </p>
          <p className="text-[11px] text-red-700/80 leading-relaxed font-medium">
            Você utilizou todos os {limit} créditos do seu período atual. A geração de novas OQs está bloqueada até a próxima renovação mensal da sua assinatura.
          </p>
        </div>
      )}

      {/* Detalhes Técnicos e Estimativa */}
      <div className="space-y-6 pt-8 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Estimativa de Uso</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Gerações Possíveis</span>
                <span className="font-bold">{remaining}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">OQs Estimados</span>
                <span className="font-bold text-primary">~{remaining * 10}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Variação de Custo</span>
                <span className="font-bold">1.0 a 1.2*</span>
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground italic leading-tight">
              *Varia conforme o tamanho do PDF e complexidade do tema.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Uso Consciente</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Cada geração processa o PDF e extrai de <span className="text-foreground font-bold">8 a 12 OQs</span> estratégicas. 
              O reprocessamento do mesmo material consome novos créditos. 
              Evite redundâncias para otimizar seu saldo mensal.
            </p>
          </div>
        </div>
      </div>

      {/* Logs de Erro */}
      {errors.length > 0 && (
        <div className="space-y-4 pt-8 border-t border-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Mensagens Recentes</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { clearAiErrors(); setErrors([]); }}
              className="h-6 text-[9px] uppercase font-black tracking-widest opacity-50 hover:opacity-100"
            >
              Limpar Logs
            </Button>
          </div>
          <div className="space-y-2">
            {errors.map((e, i) => (
              <div key={i} className="text-[11px] font-medium bg-white/5 p-3 rounded-xl flex justify-between gap-4">
                <span className="text-foreground/80">{e.message}</span>
                <span className="text-[9px] text-muted-foreground uppercase whitespace-nowrap mt-0.5">
                  {new Date(e.at).toLocaleTimeString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center space-y-4 pt-12">
        <p className="text-[10px] text-muted-foreground font-medium italic opacity-60">
          "Se algo parecer travado por muito tempo, recarregue a página ou tente novamente em alguns minutos."
        </p>
        <div className="flex items-center justify-center gap-2">
           <p className="text-[9px] text-muted-foreground/30 uppercase tracking-[0.2em] font-black">
            Última verificação: {status?.checkedAt ? new Date(status.checkedAt).toLocaleTimeString("pt-BR") : "---"}
          </p>
        </div>
      </div>
    </div>
  );
}
