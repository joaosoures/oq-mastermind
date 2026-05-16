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
      { label: "Gerar OQs por Inteligência Artificial (IA)", ok: false },
      { label: "Acesso a materiais de apoio e áudio aulas", ok: false },
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
  const { plano, assinatura, loading } = useUserPlan();
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [perfil, setPerfil] = useState<{ nome?: string; foto_url?: string | null } | null>(null);

  useEffect(() => {
    document.title = "Meu plano — OQ MED";
  }, []);

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

  const diasTrial = diasAte(assinatura?.data_fim_trial);
  const diasExclusao = diasAte(assinatura?.excluir_dados_em);
  const diasRenov = diasAte(assinatura?.proxima_renovacao);

  const alertaCritico = useMemo(() => {
    if (plano === "gratis_expirado" && diasExclusao !== null && diasExclusao <= 15) {
      return {
        titulo: "Atenção: seus dados serão apagados em breve",
        texto: `Faltam ${Math.max(0, diasExclusao)} dia(s) para a exclusão permanente das suas métricas e dos OQs que você gerou. Faça upgrade para preservar tudo.`,
      };
    }
    if (assinatura?.status === "inadimplente") {
      const restantes = 30 - (assinatura.dias_inadimplente ?? 0);
      return {
        titulo: "Pagamento em atraso",
        texto: `Regularize sua assinatura. Faltam ${Math.max(0, restantes)} dia(s) até a exclusão definitiva de métricas e OQs gerados.`,
      };
    }
    if (plano === "trial" && diasTrial !== null && diasTrial <= 3) {
      return {
        titulo: "Seu período de teste está acabando",
        texto: `Restam ${Math.max(0, diasTrial)} dia(s) de trial. Escolha um plano para não perder seu progresso.`,
      };
    }
    return null;
  }, [plano, assinatura, diasTrial, diasExclusao]);

  const planoLabel: Record<PlanoEfetivo, string> = {
    trial: "Trial (Ouro por 7 dias)",
    ouro: "Aluno de Ouro",
    prata: "Aluno de Prata",
    gratis: "Grátis",
    gratis_expirado: "Grátis (trial expirado)",
  };

  const planoBadgeCor: Record<PlanoEfetivo, string> = {
    trial: "bg-gradient-to-r from-amber-400 to-yellow-500 text-black",
    ouro: "bg-gradient-to-r from-amber-400 to-yellow-500 text-black",
    prata: "bg-gradient-to-r from-slate-300 to-slate-500 text-black",
    gratis: "bg-zinc-600 text-white",
    gratis_expirado: "bg-zinc-700 text-white",
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
            {plano === "trial" && diasTrial !== null && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fim do trial</span>
                <span className="font-semibold">{Math.max(0, diasTrial)} dia(s)</span>
              </div>
            )}
            {assinatura?.proxima_renovacao && diasRenov !== null && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Próxima renovação</span>
                <span className="font-semibold">em {Math.max(0, diasRenov)} dia(s)</span>
              </div>
            )}
            {diasExclusao !== null && (plano === "gratis_expirado" || assinatura?.status === "inadimplente") && (
              <div className="flex items-center justify-between text-destructive">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Exclusão de dados</span>
                <span className="font-semibold">em {Math.max(0, diasExclusao)} dia(s)</span>
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
            {!assinatura?.proxima_renovacao && plano !== "trial" && !diasExclusao && (
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
          </CardContent>
        </Card>
      </section>

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
                    disabled={atual}
                  >
                    {atual ? "Plano atual" : p.key === "gratis" ? "Plano padrão" : (
                      <>
                        <Sparkles className="h-4 w-4 mr-1" />
                        Fazer upgrade
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
    </div>
  );
}
