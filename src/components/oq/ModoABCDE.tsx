import { useState } from "react";
import { CardRow } from "@/lib/oq";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

type Estado = "respondendo" | "mostrando_explicacao";

const LETTERS = ["A", "B", "C", "D", "E"] as const;

export default function ModoABCDE({
  card, onFinalizar,
}: {
  card: CardRow;
  onFinalizar: (r: { acertou: boolean; nivelPista: number; tentativas: number }) => void;
}) {
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>("respondendo");
  const [eliminadas, setEliminadas] = useState<string[]>([]);
  const [resultado, setResultado] = useState<{ acertou: boolean; nivelPista: number } | null>(null);

  const correta = card.alternativa_correta;
  const alternativas = LETTERS.map((L) => ({
    letra: L,
    texto: (card as any)[`alternativa_${L.toLowerCase()}`] as string | null,
  })).filter((a) => !!a.texto);

  function desmistificar() {
    if (estado !== "respondendo") return;
    const restantes = alternativas.filter((a) => a.letra !== correta && !eliminadas.includes(a.letra));
    if (eliminadas.length >= 3) {
      // 4ª = erro automático
      setResultado({ acertou: false, nivelPista: 4 });
      setEstado("mostrando_explicacao");
      onFinalizar({ acertou: false, nivelPista: 4, tentativas: 1 });
      return;
    }
    if (restantes.length === 0) return;
    const sorteada = restantes[Math.floor(Math.random() * restantes.length)];
    setEliminadas([...eliminadas, sorteada.letra]);
    if (selecionada === sorteada.letra) setSelecionada(null);
  }

  function confirmar() {
    if (!selecionada || estado !== "respondendo") return;
    const acertou = selecionada === correta;
    const nivelPista = eliminadas.length;
    setResultado({ acertou, nivelPista });
    setEstado("mostrando_explicacao");
    onFinalizar({ acertou, nivelPista, tentativas: 1 });
  }

  return (
    <div className="space-y-6">
      <p className="text-lg leading-relaxed">{card.comando}</p>
      <div className="space-y-2">
        {alternativas.map((a) => {
          const isElim = eliminadas.includes(a.letra);
          const isSelected = selecionada === a.letra;
          const showResult = estado === "mostrando_explicacao";
          const isCorreta = a.letra === correta;
          const wrongPick = showResult && isSelected && !isCorreta;
          return (
            <button
              key={a.letra}
              disabled={isElim || estado !== "respondendo"}
              onClick={() => setSelecionada(a.letra)}
              className={cn(
                "w-full text-left p-4 rounded-xl border bg-card/60 transition flex gap-3 items-start",
                "hover:border-primary/50 hover:bg-card",
                isSelected && !showResult && "border-primary bg-primary/5",
                showResult && isCorreta && "border-success bg-success/10",
                wrongPick && "border-destructive bg-destructive/10",
                isElim && "opacity-30 line-through pointer-events-none",
              )}
            >
              <span className="font-bold text-primary">{a.letra}</span>
              <span className="flex-1">{a.texto}</span>
              {showResult && isCorreta && <Check className="text-success h-5 w-5 shrink-0" />}
              {wrongPick && <X className="text-destructive h-5 w-5 shrink-0" />}
            </button>
          );
        })}
      </div>

      {estado === "mostrando_explicacao" && (
        <div className="rounded-xl border border-border/60 bg-card/40 p-5 animate-fade-up">
          <p className="text-sm text-muted-foreground mb-2 font-medium">Explicação</p>
          <p className="leading-relaxed">{card.explicacao}</p>
        </div>
      )}

      <div className="flex items-center justify-center pt-2">
        {estado === "respondendo" && (
          <Button onClick={desmistificar} variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
            💡 Desmistificar ({3 - eliminadas.length} restantes)
          </Button>
        )}
      </div>
    </div>
  );
}
