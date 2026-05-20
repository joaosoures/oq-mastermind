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
            <Select value={s.perfil} onValueChange={(v: any) => setS({ ...s, perfil: v })}>
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
              <div>
                <Label>Rodízio atual</Label>
                <Select
                  value={s.rodizio_atual?.especialidade ?? ""}
                  onValueChange={(v) =>
                    setS({ ...s, rodizio_atual: { especialidade: v, semanas: s.rodizio_atual?.semanas ?? 4 } })
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Selecione a especialidade" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ESPECIALIDADE_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

          <div>
            <Label>Disponibilidade — dias da semana</Label>
            <div className="flex gap-1 mt-2 flex-wrap">
              {DIAS.map((d, i) => (
                <button
                  key={d} type="button"
                  onClick={() => {
                    const novo = [...s.disponibilidade.dias];
                    novo[i] = !novo[i];
                    setS({ ...s, disponibilidade: { ...s.disponibilidade, dias: novo } });
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    s.disponibilidade.dias[i]
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >{d}</button>
              ))}
            </div>
          </div>

          <div>
            <Label>Horas por dia: <span className="font-semibold text-primary">{s.disponibilidade.horas}h</span></Label>
            <Slider
              value={[s.disponibilidade.horas]} min={0.5} max={8} step={0.5}
              onValueChange={([v]) => setS({ ...s, disponibilidade: { ...s.disponibilidade, horas: v } })}
              className="mt-3"
            />
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
