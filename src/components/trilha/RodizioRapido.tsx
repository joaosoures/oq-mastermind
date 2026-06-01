import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Stethoscope, Shuffle, Check, X } from "lucide-react";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";
import type { TrilhaSettings, RodizioItem } from "@/hooks/useTrilhaPlano";
import { cn } from "@/lib/utils";

interface Props {
  settings: TrilhaSettings;
  onSave: (s: TrilhaSettings) => void;
}

const DURACOES = [
  { v: 1, l: "Só essa semana" },
  { v: 2, l: "2 semanas" },
  { v: 3, l: "3 semanas" },
  { v: 4, l: "1 mês (4 sem)" },
  { v: 6, l: "~1,5 mês (6 sem)" },
  { v: 8, l: "2 meses (8 sem)" },
  { v: 12, l: "3 meses (12 sem)" },
];

export default function RodizioRapido({ settings, onSave }: Props) {
  const atual = settings.rodizio_atual;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RodizioItem>(
    atual ?? { especialidade: "clinica_medica", semanas: 2 },
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const espLabel = atual
    ? ESPECIALIDADE_LABEL[atual.especialidade as keyof typeof ESPECIALIDADE_LABEL] ??
      atual.especialidade
    : null;

  const handleSaveClick = () => {
    const mudouEspecialidade = !atual || atual.especialidade !== draft.especialidade;
    const mudouSemanas = !atual || atual.semanas !== draft.semanas;
    if ((atual && (mudouEspecialidade || mudouSemanas))) {
      setConfirmOpen(true);
    } else {
      confirmSave();
    }
  };

  const confirmSave = () => {
    onSave({ ...settings, rodizio_atual: { ...draft } });
    setEditing(false);
    setConfirmOpen(false);
  };

  return (
    <div className="paper-card p-4 md:p-5 backdrop-blur-sm border border-border/40">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "h-10 w-10 rounded-2xl grid place-items-center shrink-0",
              atual ? "bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]" : "bg-muted/30 text-muted-foreground",
            )}
          >
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
              Rodízio atual
            </p>
            <p className="text-base md:text-lg font-black tracking-tight truncate">
              {atual ? espLabel : "Sem rodízio configurado"}
            </p>
            {atual && (
              <p className="text-[11px] text-muted-foreground">
                Duração: <strong>{atual.semanas}</strong> semana{atual.semanas > 1 ? "s" : ""} — as matérias serão distribuídas ao longo desse período.
              </p>
            )}
          </div>
        </div>
        {!editing && (
          <Button
            size="sm"
            onClick={() => {
              setDraft(atual ?? { especialidade: "clinica_medica", semanas: 2 });
              setEditing(true);
            }}
            className="rounded-xl h-9 text-[10px] font-black uppercase tracking-wider gap-1.5 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white"
          >
            <Shuffle className="h-3.5 w-3.5" />
            {atual ? "Trocar rodízio" : "Definir rodízio"}
          </Button>
        )}
      </div>

      {editing && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 p-3 rounded-2xl bg-muted/20 border border-border/30">
          <div>
            <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              Especialidade
            </Label>
            <Select
              value={draft.especialidade}
              onValueChange={(v) => setDraft({ ...draft, especialidade: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ESPECIALIDADE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              Duração
            </Label>
            <Select
              value={String(draft.semanas)}
              onValueChange={(v) => setDraft({ ...draft, semanas: Number(v) })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURACOES.map((d) => (
                  <SelectItem key={d.v} value={String(d.v)}>
                    {d.l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 flex gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              className="rounded-xl h-9 text-[10px] font-black uppercase tracking-wider gap-1"
            >
              <X className="h-3.5 w-3.5" /> Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveClick}
              className="rounded-xl h-9 text-[10px] font-black uppercase tracking-wider gap-1 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white"
            >
              <Check className="h-3.5 w-3.5" /> Aplicar rodízio
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar troca de rodízio?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Trocar o rodízio <strong>recalcula a distribuição</strong> das matérias nas próximas semanas para priorizar a nova especialidade.
                </p>
                <p className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-xs">
                  ✓ Seu <strong>histórico de estudos</strong>, matérias já concluídas e pendências <strong>são preservados</strong>. Apenas a ordem das próximas semanas é reorganizada.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSave}>Sim, aplicar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
