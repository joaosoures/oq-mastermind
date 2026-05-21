import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan, type Feature, type PlanoEfetivo } from "@/hooks/useUserPlan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Check, X, AlertTriangle, Crown, Award, CircleDashed, CreditCard,
  Calendar, Clock, Mail, User as UserIcon, ShieldCheck, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { Settings } from "lucide-react";

type PlanKey = "ouro" | "prata" | "gratis";

interface PlanDef {
  key: PlanKey;
  nome: string;
  preco: number;
  precoDia: number;
  cor: string;
  icone: typeof Crown;
  destaque?: string;
  features: { label: string; ok: boolean }[];
}

const PLANOS: PlanDef[] = [
  {
    key: "ouro",
    nome: "Aluno de Ouro",
    preco: 28.5,
    precoDia: 28.5 / 31,
    cor: "from-amber-400 via-yellow-500 to-amber-600",
    icone: Crown,
    destaque: "Mais completo",
    features: [
      { label: "Estudar OQs nativos (Gerais e Especialidades)", ok: true },
      { label: "Acesso completo a métricas detalhadas", ok: true },
      { label: "Módulos de Estudo Focado (Crítico, Novo, Difíceis, Esquecidos)", ok: true },
      { label: "Gerar OQs por Importação de Planilha", ok: true },
      { label: "Gerar OQs ilimitados por Inteligência Artificial (IA)", ok: true },
      { label: "Acesso total a materiais de apoio e áudio aulas", ok: true },
    ],
  },
  {
    key: "prata",
    nome: "Aluno de Prata",
    preco: 21.5,
    precoDia: 21.5 / 31,
    cor: "from-slate-300 via-slate-400 to-slate-500",
    icone: Award,
    features: [
      { label: "Estudar OQs nativos (Gerais e Especialidades)", ok: true },
      { label: "Acesso completo a métricas detalhadas", ok: true },
      { label: "Módulos de Estudo Focado (Crítico, Novo, Difíceis, Esquecidos)", ok: true },
      { label: "Gerar OQs por Importação de Planilha", ok: true },
      { label: "Gerar OQs por Inteligência Artificial (IA)", ok: true },
      { label: "Acesso a materiais de apoio e áudio aulas", ok: false },
      { label: "Direcionamento automático na Trilha (baseado em desempenho)", ok: false },
    ],
  },
  {
    key: "gratis",
    nome: "Grátis",
    preco: 0,
    precoDia: 0,
    cor: "from-zinc-500 via-zinc-600 to-zinc-700",
    icone: CircleDashed,
    destaque: "7 dias de trial Ouro",
    features: [
      { label: 'Estudar OQs nativos apenas em "Estudar" e "Especialidades"', ok: true },
      { label: "Acesso a métricas básicas", ok: true },
      { label: "Módulos de Estudo Focado (Crítico, Novo, Difíceis, Esquecidos)", ok: false },
      { label: "Gerar novos OQs (IA ou Planilha)", ok: false },
    ],
  },
];

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const diasAte = (iso?: string | null) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
};

function planoToKey(p: PlanoEfetivo): PlanKey {
  if (p === "ouro") return "ouro";
  if (p === "prata") return "prata";
  return "gratis"; // trial e gratis_expirado caem aqui visualmente
}

export default function MeuPlano() {
  const { user } = useAuth();
  const { plano, assinatura, loading, refresh } = useUserPlan();
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [perfil, setPerfil] = useState<{ nome?: string; foto_url?: string | null } | null>(null);
  const { openCheckout, checkoutDialog } = useStripeCheckout();
  const [portalLoading, setPortalLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const handleUpgrade = (key: PlanKey) => {
    if (!user) return;
    const priceId = key === "ouro" ? "ouro_mensal" : "prata_mensal";
    openCheckout({
      priceId,
      userId: user.id,
      customerEmail: user.email ?? undefined,
      returnUrl: `${window.location.origin}/meu-plano?checkout=success`,
    });
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/meu-plano` },
      });
      if (error || !data?.url) throw new Error(data?.error || error?.message || "Falha ao abrir portal");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error("Não foi possível abrir o portal", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Meu plano — OQ MED";
  }, []);

  // Auto-abre checkout de Ouro quando vier de ?upgrade=ouro
  useEffect(() => {
    if (searchParams.get("upgrade") === "ouro" && user) {
      handleUpgrade("ouro");
      const params = new URLSearchParams(searchParams);
      params.delete("upgrade");
      setSearchParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user]);

  // Feedback pós-checkout: confirma e força refresh até webhook chegar
  useEffect(() => {
    if (searchParams.get("checkout") !== "success") return;
    toast.success("Pagamento confirmado!", {
      description: "Estamos ativando seu plano. Isso leva alguns segundos.",
    });
    let tries = 0;
    const iv = setInterval(() => {
      refresh();
      tries++;
      if (tries >= 6) clearInterval(iv);
    }, 2500);
    const params = new URLSearchParams(searchParams);
    params.delete("checkout");
    setSearchParams(params, { replace: true });
    return () => clearInterval(iv);
  }, [searchParams, setSearchParams, refresh]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("pagamentos")
      .select("*")
      .eq("usuario_id", user.id)
      .order("data_pagamento", { ascending: false })
      .limit(3)
      .then(({ data }) => setPagamentos(data || []));
    supabase
      .from("profiles")
      .select("nome, foto_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setPerfil(data));
  }, [user]);

  const planoAtualKey = useMemo(() => planoToKey(plano), [plano]);

  const { diasTrialRestantes, diasAteExclusao } = useUserPlan();
  const diasRenov = diasAte(assinatura?.proxima_renovacao);

  const alertaCritico = useMemo(() => {
    if (plano === "congelado" || plano === "gratis_expirado") {
      const dias = diasAteExclusao ?? 60;
      if (dias <= 15) {
        return {
          titulo: "Atenção: seus dados serão apagados em breve",
          texto: `Faltam ${Math.max(0, dias)} dia(s) para a exclusão permanente das suas métricas e dos OQs que você gerou. Reative sua assinatura para preservar tudo.`,
        };
      }
      return {
        titulo: "Sua conta está congelada",
        texto: `Você tem ${Math.max(0, dias)} dia(s) para reativar seu acesso antes que seus dados sejam removidos permanentemente.`,
      };
    }
    
    if (plano === "trial" && diasTrialRestantes !== null && diasTrialRestantes <= 3) {
      return {
        titulo: "Seu período de teste está acabando",
        texto: `Restam ${Math.max(0, diasTrialRestantes)} dia(s) de trial. Escolha um plano para não perder seu progresso.`,
      };
    }
    return null;
  }, [plano, diasTrialRestantes, diasAteExclusao]);

  const planoLabel: Record<PlanoEfetivo, string> = {
    trial: "Trial (Ouro por 7 dias)",
    ouro: "Aluno de Ouro",
    prata: "Aluno de Prata",
    gratis: "Grátis",
    gratis_expirado: "Grátis (trial expirado)",
    congelado: "Conta congelada",
  };

  const planoBadgeCor: Record<PlanoEfetivo, string> = {
    trial: "bg-gradient-to-r from-amber-400 to-yellow-500 text-black",
    ouro: "bg-gradient-to-r from-amber-400 to-yellow-500 text-black",
    prata: "bg-gradient-to-r from-slate-300 to-slate-500 text-black",
    gratis: "bg-zinc-600 text-white",
    gratis_expirado: "bg-zinc-700 text-white",
    congelado: "bg-red-700 text-white",
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 sm:py-10 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Meu plano</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie sua assinatura, veja status e compare os planos disponíveis.
        </p>
      </header>

      {/* ============ ÁREA SUPERIOR ============ */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* Perfil */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserIcon className="h-4 w-4" /> Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={perfil?.foto_url ?? undefined} />
              <AvatarFallback>
                {(perfil?.nome ?? user?.email ?? "U").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold truncate">{perfil?.nome ?? "Usuário"}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <Mail className="h-3 w-3" /> {user?.email}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Plano atual */}
        <Card className="relative overflow-hidden">
          <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", PLANOS.find(p => p.key === planoAtualKey)!.cor)} />
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" /> Plano atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge className={cn("text-sm px-3 py-1 font-semibold", planoBadgeCor[plano])}>
              {planoLabel[plano]}
            </Badge>
            {assinatura?.valor_mensal ? (
              <p className="text-sm text-muted-foreground">
                Mensalidade: <strong className="text-foreground">{fmt(assinatura.valor_mensal)}</strong>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Sem mensalidade ativa.</p>
            )}
            <p className="text-xs text-muted-foreground">
              Status: <span className="font-medium text-foreground capitalize">{assinatura?.status ?? "—"}</span>
            </p>
          </CardContent>
        </Card>

        {/* Datas importantes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" /> Datas importantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {plano === "trial" && diasTrialRestantes !== null && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fim do trial</span>
                <span className="font-semibold">{Math.max(0, diasTrialRestantes)} dia(s)</span>
              </div>
            )}
            {assinatura?.proxima_renovacao && diasRenov !== null && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Próxima renovação</span>
                <span className="font-semibold">em {Math.max(0, diasRenov)} dia(s)</span>
              </div>
            )}
            {diasAteExclusao !== null && (plano === "congelado" || plano === "gratis_expirado") && (
              <div className="flex items-center justify-between text-destructive">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Exclusão de dados</span>
                <span className="font-semibold">em {Math.max(0, diasAteExclusao)} dia(s)</span>
              </div>
            )}
            {assinatura?.data_inicio_plano && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Início do plano</span>
                <span className="font-medium">
                  {new Date(assinatura.data_inicio_plano).toLocaleDateString("pt-BR")}
                </span>
              </div>
            )}
            {!assinatura?.proxima_renovacao && plano !== "trial" && diasAteExclusao === null && (
              <p className="text-muted-foreground">Sem datas relevantes no momento.</p>
            )}
          </CardContent>
        </Card>

        {/* Pagamento */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" /> Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Método atual</p>
              <p className="font-medium">{assinatura?.metodo_pagamento ?? "Nenhum método cadastrado"}</p>
            </div>
            <Separator />
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Últimos pagamentos</p>
              {pagamentos.length === 0 && (
                <p className="text-muted-foreground">Sem histórico de pagamentos.</p>
              )}
              {pagamentos.map(p => (
                <div key={p.id} className="flex items-center justify-between py-1">
                  <span>{new Date(p.data_pagamento).toLocaleDateString("pt-BR")} · {p.plano}</span>
                  <span className={cn("font-semibold", p.status === "pago" ? "text-emerald-500" : "text-destructive")}>
                    {fmt(Number(p.valor))}
                  </span>
                </div>
              ))}
            </div>
            {((assinatura as any)?.stripe_subscription_id || (assinatura as any)?.stripe_customer_id) && (
              <>
                <Separator />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={openPortal}
                  disabled={portalLoading}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {portalLoading ? "Abrindo…" : "Gerenciar assinatura"}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Cancelar, trocar cartão, mudar de plano ou ver faturas.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {(assinatura as any)?.cancel_at_period_end && assinatura?.proxima_renovacao && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Assinatura cancelada</AlertTitle>
          <AlertDescription>
            Seu acesso premium continua ativo até {new Date(assinatura.proxima_renovacao).toLocaleDateString("pt-BR")}.
            Depois disso sua conta volta para o plano grátis.
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta crítico */}
      {alertaCritico && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{alertaCritico.titulo}</AlertTitle>
          <AlertDescription>{alertaCritico.texto}</AlertDescription>
        </Alert>
      )}

      {/* ============ ÁREA INFERIOR — CARDS COMPARATIVOS ============ */}
      <section className="space-y-4">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Compare os planos</h2>
            <p className="text-sm text-muted-foreground">
              Escolha o plano que melhor se encaixa na sua rotina de estudos.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PLANOS.map(p => {
            const atual = planoAtualKey === p.key;
            const Icone = p.icone;
            return (
              <Card
                key={p.key}
                className={cn(
                  "relative overflow-hidden flex flex-col",
                  atual && "ring-2 ring-primary shadow-lg"
                )}
              >
                <div className={cn("h-1 w-full bg-gradient-to-r", p.cor)} />
                {atual && (
                  <Badge className="absolute top-3 right-3 z-10 bg-primary text-primary-foreground">
                    Seu plano
                  </Badge>
                )}
                {p.destaque && !atual && (
                  <Badge variant="secondary" className="absolute top-3 right-3 z-10">
                    {p.destaque}
                  </Badge>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-2 rounded-lg bg-gradient-to-br text-black", p.cor)}>
                      <Icone className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{p.nome}</CardTitle>
                  </div>
                  <div className="mt-2">
                    {p.preco > 0 ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold">{fmt(p.preco)}</span>
                          <span className="text-sm text-muted-foreground">/mês</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          aproximadamente {fmt(p.precoDia)}/dia
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-3xl font-bold">Grátis</div>
                        <p className="text-xs text-muted-foreground">
                          7 dias com acesso Ouro · depois acesso reduzido
                        </p>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2 flex-1">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        {f.ok ? (
                          <Check className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 mt-0.5 text-destructive/70 shrink-0" />
                        )}
                        <span className={cn(!f.ok && "text-muted-foreground line-through decoration-destructive/40")}>
                          {f.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-5 w-full"
                    variant={atual ? "secondary" : p.key === "ouro" ? "default" : "outline"}
                    disabled={atual || p.key === "gratis"}
                    onClick={() => p.key !== "gratis" && handleUpgrade(p.key)}
                  >
                    {atual ? "Plano atual" : p.key === "gratis" ? "Plano padrão" : (
                      <>
                        <Sparkles className="h-4 w-4 mr-1" />
                        {planoAtualKey === "prata" && p.key === "ouro" ? "Upgrade para Ouro" : "Assinar"}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          Pagamentos processados com segurança. Cancele quando quiser. Após 30 dias de inadimplência (planos pagos) ou
          15 dias após o fim do trial (grátis), suas métricas e OQs gerados são removidos permanentemente.
        </p>
      </section>
      {checkoutDialog}
    </div>
  );
}
