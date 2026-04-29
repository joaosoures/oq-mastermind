import { useState, useRef, KeyboardEvent } from "react";
import { CardRow, matchAnswer } from "@/lib/oq";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Estado = "respondendo" | "mostrando_explicacao";

function revelar(resp: string, nivel: number): string {
  // nivel 1: primeira letra; 2: ~30%; 3: ~60%
  const len = resp.length;
  const reveal = nivel === 1 ? 1 : nivel === 2 ? Math.ceil(len * 0.3) : Math.ceil(len * 0.6);
  return resp.split("").map((c, i) => {
    if (c === " ") return " ";
    return i < reveal ? c : "_";
  }).join(" ");
}

export default function ModoLacuna({
  card, onFinalizar,
}: {
  card: CardRow;
  onFinalizar: (r: { acertou: boolean; nivelPista: number; tentativas: number }) => void;
}) {
  const [valor, setValor] = useState("");
  const [estado, setEstado] = useState<Estado>("respondendo");
  const [tentativas, setTentativas] = useState(0);
  const [shake, setShake] = useState(false);
  const [errMsg, setErrMsg] = useState(false);
  const [nivelPista, setNivelPista] = useState(0);
  const [acertou, setAcertou] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const respostaCorreta = card.info_1 ?? "";

  function tentar() {
    if (estado !== "respondendo") return;
    if (!valor.trim()) return;
    setTentativas((t) => t + 1);
    if (matchAnswer(valor, respostaCorreta, card.var_1)) {
      setAcertou(true);
      setEstado("mostrando_explicacao");
      onFinalizar({ acertou: true, nivelPista, tentativas: tentativas + 1 });
    } else {
      setErrMsg(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setErrMsg(false), 2000);
    }
  }

  function desmistificar() {
    if (estado !== "respondendo") return;
    if (nivelPista >= 3) {
      // 4ª = erro
      setEstado("mostrando_explicacao");
      onFinalizar({ acertou: false, nivelPista: 4, tentativas });
      return;
    }
    setNivelPista((n) => n + 1);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") tentar();
  }

  return (
    <div className="space-y-6">
      <p className="text-lg leading-relaxed">{card.comando}</p>

      {nivelPista > 0 && estado === "respondendo" && (
        <p className="text-center text-2xl tracking-[0.4em] font-mono text-primary/80">
          {revelar(respostaCorreta, nivelPista)}
        </p>
      )}

      <div className="relative">
        <Input
          ref={inputRef}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={onKey}
          disabled={estado !== "respondendo"}
          autoFocus
          maxLength={300}
          placeholder="Digite sua resposta…"
          className={cn(
            "h-14 text-lg neon-border bg-card/60",
            shake && "animate-shake",
            estado === "mostrando_explicacao" && acertou && "border-success",
            estado === "mostrando_explicacao" && !acertou && "border-destructive",
          )}
        />
        {errMsg && <p className="text-destructive text-xs mt-2 animate-fade-up">ainda não é isso…</p>}
      </div>

      {estado === "respondendo" && (
        <div className="flex justify-center">
          <Button size="lg" onClick={tentar} disabled={!valor.trim()} className="min-w-40">Confirmar</Button>
        </div>
      )}

      {estado === "mostrando_explicacao" && (
        <div className="space-y-3 animate-fade-up">
          <div className={cn("rounded-xl border p-5", acertou ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5")}>
            <p className="text-sm text-muted-foreground mb-1">Resposta correta</p>
            <p className="font-medium">{respostaCorreta}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <p className="text-sm text-muted-foreground mb-2 font-medium">Explicação</p>
            <p className="leading-relaxed">{card.explicacao}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center pt-2">
        {estado === "respondendo" && (
          <Button onClick={desmistificar} variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
            💡 Desmistificar ({3 - nivelPista} restantes)
          </Button>
        )}
      </div>
    </div>
  );
}
