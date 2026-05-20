import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2 } from "lucide-react";
import type { TrilhaSettings, RodizioItem } from "@/hooks/useTrilhaPlano";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: TrilhaSettings;
  onSave: (s: TrilhaSettings) => void;
}

export default function SetupDialog({ open, onOpenChange, initial, onSave }: Props) {
  const [s, setS] = useState<TrilhaSettings>(initial);
  useEffect(() => { setS(initial); }, [initial, open]);

  const updRodizio = (idx: number, patch: Partial<RodizioItem>) => {
    setS((x) => ({
      ...x,
      proximos_rodizios: x.proximos_rodizios.map((r, i) => i === idx ? { ...r, ...patch } : r),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto minimal-scroll">
        <DialogHeader>
          <DialogTitle>Configuração do plano</DialogTitle>
          <DialogDescription>Ajuste sua trilha de estudos para a prova.</DialogDescription>
        </DialogHeader>

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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => {
              onSave({ ...s, setup_done: true });
              onOpenChange(false);
            }}
          >Salvar plano</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
