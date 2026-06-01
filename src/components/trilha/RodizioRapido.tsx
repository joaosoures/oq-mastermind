import { useState } from "react";
import { createPortal } from "react-dom";
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
import { Stethoscope, Shuffle, Check, X, Trash2 } from "lucide-react";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";
import type { TrilhaSettings, RodizioItem } from "@/hooks/useTrilhaPlano";
import { cn } from "@/lib/utils";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";

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
  const [draftPerfil, setDraftPerfil] = useState(settings.perfil);
  const [draftRodizio, setDraftRodizio] = useState<RodizioItem>(
    atual ?? { especialidade: "clinica_medica", semanas: 2 },
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  const espLabel = atual
    ? ESPECIALIDADE_LABEL[atual.especialidade as keyof typeof ESPECIALIDADE_LABEL] ??
      atual.especialidade
    : null;

  const perfilLabel = {
    medico: "Médico",
    interno_4: "Interno do 4º ano",
    interno_geral: "Interno geral",
  }[settings.perfil];

  const openEditor = () => {
    setDraftPerfil(settings.perfil);
    setDraftRodizio(atual ?? { especialidade: "clinica_medica", semanas: 2 });
    setEditing(true);
  };

  const handleSaveClick = () => {
    const mudouPerfil = settings.perfil !== draftPerfil;
    const mudouEspecialidade = !atual || atual.especialidade !== draftRodizio.especialidade;
    const mudouSemanas = !atual || atual.semanas !== draftRodizio.semanas;

    if (mudouPerfil || (draftPerfil === "interno_geral" && (mudouEspecialidade || mudouSemanas))) {
      setConfirmOpen(true);
    } else {
      confirmSave();
    }
  };

  const confirmSave = () => {
    const patch: Partial<TrilhaSettings> = { perfil: draftPerfil };
    if (draftPerfil === "interno_geral") {
      patch.rodizio_atual = { ...draftRodizio };
    } else {
      patch.rodizio_atual = null;
      patch.proximos_rodizios = [];
    }
    onSave({ ...settings, ...patch });
    setEditing(false);
    setConfirmOpen(false);
  };

  const removerRodizio = () => {
    onSave({ ...settings, rodizio_atual: null, proximos_rodizios: [] });
    setConfirmRemoveOpen(false);
  };

  return (
    <div className="paper-card p-4 md:p-5 backdrop-blur-sm border border-border/40">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "h-10 w-10 rounded-2xl grid place-items-center shrink-0",
              settings.perfil === "medico" ? "bg-muted/30 text-muted-foreground" : "bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]",
            )}
          >
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
              Perfil e Rotina
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base md:text-lg font-black tracking-tight truncate">
                {perfilLabel} {settings.perfil === "interno_geral" && atual && `— ${espLabel}`}
              </p>
              {settings.perfil === "interno_geral" && atual && (
                <button
                  type="button"
                  onClick={() => setConfirmRemoveOpen(true)}
                  aria-label="Remover rodízio"
                  className="h-7 w-7 rounded-full grid place-items-center bg-destructive/10 hover:bg-destructive/20 text-destructive transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {settings.perfil === "interno_geral" && atual && (
              <p className="text-[11px] text-muted-foreground">
                Duração: <strong>{atual.semanas}</strong> semana{atual.semanas > 1 ? "s" : ""} — matérias distribuídas para o rodízio.
              </p>
            )}
            {settings.perfil !== "interno_geral" && (
              <p className="text-[11px] text-muted-foreground">
                Rotina padrão sem direcionamento de rodízios.
              </p>
            )}
          </div>
        </div>

        <LayoutGroup id="rotina-morph-group">
          <AnimatePresence>
            {!editing && (
              <motion.button
                key="rotina-trigger"
                layoutId="rotina-morph"
                onClick={openEditor}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="inline-flex items-center gap-1.5 rounded-xl h-9 px-3 text-[10px] font-black uppercase tracking-wider bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white shadow"
              >
                <Shuffle className="h-3.5 w-3.5" />
                Alterar rotina
              </motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {editing && (
              <motion.div
                key="rotina-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditing(false)}
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 pt-[12vh] sm:pt-4"
              >
                <motion.div
                  layoutId="rotina-morph"
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-3xl shadow-2xl ring-1 ring-border/60 w-full max-w-md overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <Shuffle className="h-4 w-4 text-[hsl(var(--primary))]" />
                      <p className="text-sm font-black uppercase tracking-wider truncate">
                        Alterar rotina
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="h-8 w-8 rounded-full grid place-items-center hover:bg-muted/60 text-muted-foreground"
                      aria-label="Fechar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                        Seu Perfil Atual
                      </Label>
                      <Select
                        value={draftPerfil}
                        onValueChange={(v: any) => setDraftPerfil(v)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="medico">Médico</SelectItem>
                          <SelectItem value="interno_4">Interno do 4º ano</SelectItem>
                          <SelectItem value="interno_geral">Interno geral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {draftPerfil === "interno_geral" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                            Especialidade do Rodízio
                          </Label>
                          <Select
                            value={draftRodizio.especialidade}
                            onValueChange={(v) => setDraftRodizio({ ...draftRodizio, especialidade: v })}
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
                            Duração Restante
                          </Label>
                          <Select
                            value={String(draftRodizio.semanas)}
                            onValueChange={(v) => setDraftRodizio({ ...draftRodizio, semanas: Number(v) })}
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
                      </div>
                    )}

                    <div className="flex gap-2 justify-end pt-2 border-t border-border/40">
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
                        <Check className="h-3.5 w-3.5" /> Salvar
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      </div>

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

      <AlertDialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover rodízio atual?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  O foco sincronizado em <strong>{espLabel}</strong> será desativado e as próximas semanas voltarão à distribuição padrão.
                </p>
                <p className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-xs">
                  ✓ Seu histórico e matérias já feitas são <strong>preservados</strong>.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={removerRodizio}>Sim, remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
