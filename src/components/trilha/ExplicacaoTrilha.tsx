import { Info, Flame, Target, BarChart3 } from "lucide-react";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";
import { cn } from "@/lib/utils";

interface Props {
  currentWeekIndex: number;
  totalSemanas: number;
  aulasSemanaAtual: any[];
  focoSemana: any[];
  baseSemana: any[];
  espLabel: string | null;
  getRodizioForWeek: (wk: number) => string | null;
  totalAulas: number;
}

export default function ExplicacaoTrilha({
  currentWeekIndex,
  totalSemanas,
  aulasSemanaAtual,
  focoSemana,
  baseSemana,
  espLabel,
  getRodizioForWeek,
  totalAulas,
}: Props) {
  const alta = aulasSemanaAtual.filter((a) => a.tier <= 1).length;
  const media = aulasSemanaAtual.filter((a) => a.tier === 2).length;
  const baixa = aulasSemanaAtual.filter((a) => a.tier >= 3).length;

  // Encontrar duração do rodízio atual
  let rodizioFim = currentWeekIndex;
  while (getRodizioForWeek(rodizioFim + 1) === getRodizioForWeek(currentWeekIndex) && rodizioFim < totalSemanas) {
    rodizioFim++;
  }

  return (
    <div className="bg-muted/30 rounded-3xl p-5 border border-border/40 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Info className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
          Análise da Estratégia
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Rodízio */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            <Flame className="h-3 w-3 text-orange-500" />
            Rodízio Atual
          </div>
          <p className="text-sm font-bold">
            {espLabel ? (
              <>
                {espLabel} (Semana {currentWeekIndex + 1} a {rodizioFim + 1})
              </>
            ) : (
              "Nenhum rodízio ativo"
            )}
          </p>
          <div className="flex gap-2">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700">
              {focoSemana.length} conteúdos sincronizados
            </span>
          </div>
        </div>

        {/* Incidência */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            <BarChart3 className="h-3 w-3 text-blue-500" />
            Mix de Incidência
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">{alta}</span>
              <span className="text-[9px] uppercase font-black text-muted-foreground">Altas</span>
            </div>
            <div className="w-px h-6 bg-border mx-1" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">{media}</span>
              <span className="text-[9px] uppercase font-black text-muted-foreground">Médias</span>
            </div>
            <div className="w-px h-6 bg-border mx-1" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">{baixa}</span>
              <span className="text-[9px] uppercase font-black text-muted-foreground">Baixas</span>
            </div>
          </div>
        </div>

        {/* Progressão */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            <Target className="h-3 w-3 text-green-500" />
            Cobertura do Plano
          </div>
          <p className="text-sm font-bold">
            {aulasSemanaAtual.length} de {totalAulas} matérias totais
          </p>
          <p className="text-[10px] text-muted-foreground">
            {focoSemana.length} do foco sincronizado + {baseSemana.length} matérias base
          </p>
        </div>
      </div>
    </div>
  );
}
