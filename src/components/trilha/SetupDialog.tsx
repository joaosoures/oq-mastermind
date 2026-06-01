import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, ShieldCheck, CalendarClock, Target, AlertTriangle, Sparkles, Check } from "lucide-react";
import type { TrilhaSettings, RodizioItem, AulaPlano, FocoIncidencia } from "@/hooks/useTrilhaPlano";
import { maxTierFor } from "@/hooks/useTrilhaPlano";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";
import { cn } from "@/lib/utils";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MAX_MAT_SEMANA = 6;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: TrilhaSettings;
  onSave: (s: TrilhaSettings) => void;
  aulas?: AulaPlano[];
}

const FOCO_OPCOES: { value: FocoIncidencia; label: string; desc: string; tone: string }[] = [
  { value: "todas", label: "Cobertura total", desc: "Alta + média + baixa incidência", tone: "from-primary/15 to-primary/5 border-primary/40" },
  { value: "alta_media", label: "Estratégico", desc: "Apenas alta + média incidência", tone: "from-amber-500/15 to-amber-500/5 border-amber-500/40" },
  { value: "alta", label: "Essencial", desc: "Apenas alta incidência", tone: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/40" },
];

function detectarMudancasDestrutivas(antes: TrilhaSettings, depois: TrilhaSettings): string[] {
  const mudancas: string[] = [];
  if (!antes.setup_done) return mudancas; // primeira configuração — sem alertas
  if (antes.prova_data !== depois.prova_data) mudancas.push("Data da prova");
  if (antes.perfil !== depois.perfil) mudancas.push("Perfil de rotina");
  if ((antes.foco_incidencia ?? "todas") !== (depois.foco_incidencia ?? "todas")) mudancas.push("Estratégia de preparação");
  const r1 = antes.rodizio_atual, r2 = depois.rodizio_atual;
  if ((r1?.especialidade ?? null) !== (r2?.especialidade ?? null)) mudancas.push("Rodízio atual");
  if ((r1?.semanas ?? null) !== (r2?.semanas ?? null)) mudancas.push("Duração do rodízio");
  if (JSON.stringify(antes.proximos_rodizios) !== JSON.stringify(depois.proximos_rodizios)) {
    mudancas.push("Próximos rodízios");
  }
  if (JSON.stringify(antes.disponibilidade) !== JSON.stringify(depois.disponibilidade)) {
    mudancas.push("Disponibilidade semanal");
  }
  return mudancas;
}

export default function SetupDialog({ open, onOpenChange, initial, onSave, aulas = [] }: Props) {
  const [s, setS] = useState<TrilhaSettings>(initial);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mudancas, setMudancas] = useState<string[]>([]);
  useEffect(() => { setS(initial); }, [initial, open]);

  const updRodizio = (idx: number, patch: Partial<RodizioItem>) => {
    setS((x) => ({
      ...x,
      proximos_rodizios: x.proximos_rodizios.map((r, i) => i === idx ? { ...r, ...patch } : r),
    }));
  };

  // ===== Cálculos de cronograma e recomendações =====
  const aulasValidas = useMemo(() => aulas.filter((a) => a.total_oqs > 0), [aulas]);
  const countByTier = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0 };
    for (const a of aulasValidas) {
      if (a.tier === 1) c[1]++;
      else if (a.tier === 2) c[2]++;
      else if (a.tier === 3) c[3]++;
    }
    return c;
  }, [aulasValidas]);
  const totalPorFoco = (f: FocoIncidencia) => {
    if (f === "alta") return countByTier[1];
    if (f === "alta_media") return countByTier[1] + countByTier[2];
    return countByTier[1] + countByTier[2] + countByTier[3];
  };

  const semanasAteProva = useMemo(() => {
    if (!s.prova_data) return null;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const prova = new Date(s.prova_data + "T00:00:00");
    const dias = Math.ceil((prova.getTime() - hoje.getTime()) / 86400000);
    return Math.max(1, Math.ceil(dias / 7));
  }, [s.prova_data]);

  const focoAtual: FocoIncidencia = s.foco_incidencia ?? "todas";
  const totalAtual = totalPorFoco(focoAtual);
  const matsPorSemana = semanasAteProva ? Math.ceil(totalAtual / semanasAteProva) : null;
  const diasRecomendados = matsPorSemana ? Math.min(7, Math.max(3, Math.ceil(matsPorSemana * 1.3))) : null;
  const excede = matsPorSemana !== null && matsPorSemana > MAX_MAT_SEMANA;

  // Sugestão automática de foco menos intenso que caiba
  const focoSugerido: FocoIncidencia | null = useMemo(() => {
    if (!semanasAteProva || !excede) return null;
    const candidatos: FocoIncidencia[] = ["alta_media", "alta"];
    for (const c of candidatos) {
      if (Math.ceil(totalPorFoco(c) / semanasAteProva) <= MAX_MAT_SEMANA) return c;
    }
    return "alta";
  }, [semanasAteProva, excede, countByTier]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto minimal-scroll rounded-l-3xl">
        <SheetHeader>
          <SheetTitle>Configuração do plano</SheetTitle>
          <SheetDescription>Ajuste sua trilha de estudos para a prova.</SheetDescription>
        </SheetHeader>


        <div className="space-y-5 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data da prova</Label>
              <Input
                type="date"
                value={s.prova_data ?? ""}
                onChange={(e) => setS({ ...s, prova_data: e.target.value || null })}
              />
            </div>
            <div>
              <Label>Prova alvo</Label>
              <Input
                placeholder="Ex: ENARE, PSU-MG"
                value={s.prova_nome}
                onChange={(e) => setS({ ...s, prova_nome: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Perfil de rotina</Label>
            <Select 
              value={s.perfil} 
              onValueChange={(v: any) => {
                const patch: Partial<TrilhaSettings> = { perfil: v };
                if (v === "medico") {
                  patch.rodizio_atual = null;
                  patch.proximos_rodizios = [];
                }
                setS({ ...s, ...patch });
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="medico">Médico</SelectItem>
                <SelectItem value="interno_4">Interno do 4º ano</SelectItem>
                <SelectItem value="interno_geral">Interno geral</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {s.perfil !== "medico" && (
            <div className="space-y-3 rounded-2xl border border-border/60 p-4 bg-card/50">
              <div className="space-y-2">
                <Label>Rodízio atual</Label>
                <Select
                  value={s.rodizio_atual?.especialidade ?? ""}
                  onValueChange={(v) =>
                    setS({ ...s, rodizio_atual: { especialidade: v, semanas: s.rodizio_atual?.semanas ?? 1 } })
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Selecione a especialidade" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ESPECIALIDADE_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {s.rodizio_atual && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Duração restante neste rodízio</Label>
                    <Select
                      value={String(s.rodizio_atual.semanas)}
                      onValueChange={(v) =>
                        setS({ ...s, rodizio_atual: { ...s.rodizio_atual!, semanas: Number(v) } })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Só essa semana</SelectItem>
                        <SelectItem value="2">+1 semana (2 no total)</SelectItem>
                        <SelectItem value="3">+2 semanas (3 no total)</SelectItem>
                        <SelectItem value="4">+3 semanas (1 mês)</SelectItem>
                        <SelectItem value="6">+5 semanas (~1,5 mês)</SelectItem>
                        <SelectItem value="8">+7 semanas (2 meses)</SelectItem>
                        <SelectItem value="12">+11 semanas (3 meses)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Próximos rodízios</Label>
                  <Button
                    type="button" size="sm" variant="outline"
                    onClick={() => setS({
                      ...s,
                      proximos_rodizios: [...s.proximos_rodizios, { especialidade: "clinica_medica", semanas: 4 }],
                    })}
                  >
                    <Plus className="h-3 w-3" /> Adicionar
                  </Button>
                </div>
                {s.proximos_rodizios.map((r, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Select value={r.especialidade} onValueChange={(v) => updRodizio(i, { especialidade: v })}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ESPECIALIDADE_LABEL).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number" min={1} max={12} className="w-20"
                      value={r.semanas}
                      onChange={(e) => updRodizio(i, { semanas: Number(e.target.value) })}
                    />
                    <Button
                      type="button" size="icon" variant="ghost"
                      onClick={() => setS({ ...s, proximos_rodizios: s.proximos_rodizios.filter((_, j) => j !== i) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Label>Disponibilidade e Horas por dia</Label>
            <div className="grid gap-3">
              {DIAS.map((d, i) => {
                const isActive = s.disponibilidade.dias[i];
                const horas = s.disponibilidade.horas_por_dia?.[i] ?? s.disponibilidade.horas;
                
                return (
                  <div key={d} className={`flex flex-col gap-2 p-3 rounded-xl border transition-all ${
                    isActive ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-transparent opacity-60"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const novoDias = [...s.disponibilidade.dias];
                            novoDias[i] = !novoDias[i];
                            setS({ ...s, disponibilidade: { ...s.disponibilidade, dias: novoDias } });
                          }}
                          className={`w-10 h-6 rounded-full transition-colors relative ${
                            isActive ? "bg-primary" : "bg-muted-foreground/30"
                          }`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                            isActive ? "left-5" : "left-1"
                          }`} />
                        </button>
                        <span className={`font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                          {d}
                        </span>
                      </div>
                      {isActive && (
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                          {horas}h
                        </span>
                      )}
                    </div>
                    
                    {isActive && (
                      <Slider
                        value={[horas]} min={0.5} max={12} step={0.5}
                        onValueChange={([v]) => {
                          const novasHoras = [...(s.disponibilidade.horas_por_dia ?? [2,2,2,2,2,2,2])];
                          novasHoras[i] = v;
                          setS({ ...s, disponibilidade: { ...s.disponibilidade, horas_por_dia: novasHoras, horas: v } });
                        }}
                        className="py-2"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <SheetFooter className="gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => {
              const m = detectarMudancasDestrutivas(initial, s);
              if (m.length > 0) {
                setMudancas(m);
                setConfirmOpen(true);
              } else {
                const now = new Date();
                const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
                onSave({
                  ...s,
                  setup_done: true,
                  data_inicio_plano: s.data_inicio_plano ?? todayIso,
                });
                onOpenChange(false);
              }
            }}
          >Salvar plano</Button>
        </SheetFooter>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar alterações no plano?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm">
                  <p>Você alterou itens que <strong>recalculam a distribuição</strong> das matérias nas próximas semanas:</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-foreground">
                    {mudancas.map((m) => <li key={m}><strong>{m}</strong></li>)}
                  </ul>
                  <div className="flex gap-2 items-start text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-xs">
                    <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Seu <strong>histórico de estudos</strong>, matérias <strong>concluídas</strong>, pendências e ajustes manuais <strong>continuam preservados</strong>. Apenas a ordem futura das matérias será reorganizada.
                    </span>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Revisar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const now = new Date();
                  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
                  onSave({
                    ...s,
                    setup_done: true,
                    data_inicio_plano: s.data_inicio_plano ?? todayIso,
                  });
                  setConfirmOpen(false);
                  onOpenChange(false);
                }}
              >Sim, aplicar mudanças</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
