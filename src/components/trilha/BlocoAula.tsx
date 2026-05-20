import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, RotateCcw } from "lucide-react";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";
import type { AulaPlano } from "@/hooks/useTrilhaPlano";

interface Props {
  aula: AulaPlano;
  accent?: "foco" | "base";
}

export default function BlocoAula({ aula, accent = "base" }: Props) {
  const navigate = useNavigate();
  const tone = accent === "foco"
    ? "border-accent/60 bg-gradient-to-br from-accent/10 to-card"
    : "border-primary/30 bg-card";

  return (
    <div className={`rounded-2xl border ${tone} p-4 shadow-sm hover:shadow-md transition`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h4 className="font-semibold text-foreground text-sm md:text-base leading-snug">
            {aula.nome}
          </h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="secondary" className="text-[10px]">
              {ESPECIALIDADE_LABEL[aula.especialidade as keyof typeof ESPECIALIDADE_LABEL] ?? aula.especialidade}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Tier {aula.tier}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {aula.total_oqs} OQs
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Button
          size="sm" variant="outline" className="text-xs"
          onClick={() => navigate(`/materiais?id=${aula.id}`)}
        >
          <FileText className="h-3 w-3 mr-1" /> Material
        </Button>
        <Button
          size="sm" className="text-xs"
          onClick={() => navigate(`/estudo?tipo=aula&aula_id=${aula.id}`)}
          disabled={aula.total_oqs === 0}
        >
          <BookOpen className="h-3 w-3 mr-1" /> OQs do tema
        </Button>
      </div>
    </div>
  );
}
