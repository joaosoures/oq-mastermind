import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, ChevronRight } from "lucide-react";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";
import type { AulaPlano } from "@/hooks/useTrilhaPlano";
import { cn } from "@/lib/utils";

interface Props {
  aula: AulaPlano;
  accent?: "foco" | "base";
}

export default function BlocoAula({ aula, accent = "base" }: Props) {
  const navigate = useNavigate();
  
  return (
    <div className={cn(
      "group relative rounded-[2rem] border p-6 transition-all duration-300",
      accent === "foco" 
        ? "bg-gradient-to-br from-accent/[0.08] via-background to-background border-accent/20 hover:border-accent/40 shadow-sm hover:shadow-accent/5" 
        : "bg-card border-border/50 hover:border-border shadow-sm"
    )}>
      {accent === "foco" && (
        <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-accent animate-pulse" />
      )}
      
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-lg text-[9px] font-black uppercase tracking-widest bg-muted/50">
              {ESPECIALIDADE_LABEL[aula.especialidade as keyof typeof ESPECIALIDADE_LABEL] ?? aula.especialidade}
            </Badge>
            {aula.tier <= 2 && (
              <Badge className="rounded-lg text-[9px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-600 border-none">
                Prioridade
              </Badge>
            )}
          </div>
          <h4 className="font-display font-black text-lg leading-tight tracking-tight group-hover:text-accent transition-colors">
            {aula.nome}
          </h4>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            {aula.total_oqs} OQs disponíveis
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            size="sm" 
            variant="outline" 
            className="rounded-xl border-none shadow-neu-out-sm hover:shadow-neu-in bg-background text-[10px] font-black uppercase tracking-widest h-10 gap-2"
            onClick={() => navigate(`/materiais?id=${aula.id}`)}
          >
            <FileText className="h-3.5 w-3.5 text-muted-foreground" /> 
            Material
          </Button>
          <Button
            size="sm" 
            className={cn(
              "rounded-xl font-black text-[10px] uppercase tracking-widest h-10 gap-2 shadow-lg transition-transform active:scale-95",
              accent === "foco" ? "bg-accent hover:bg-accent/90 shadow-accent/20" : "bg-primary hover:bg-primary/90"
            )}
            onClick={() => navigate(`/estudo?tipo=aula&aula_id=${aula.id}`)}
            disabled={aula.total_oqs === 0}
          >
            <BookOpen className="h-3.5 w-3.5" /> 
            Estudar
          </Button>
        </div>
      </div>
    </div>
  );
}
