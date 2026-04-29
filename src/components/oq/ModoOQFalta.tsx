import { useEffect, useMemo, useRef, useState, KeyboardEvent } from "react";
import { CardRow, getInfos, matchAnswer, sortearLacuna } from "@/lib/oq";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Estado = "respondendo" | "mostrando_explicacao";

function revelar(resp: string, nivel: number): string {
  const len = resp.length;
  const reveal = nivel === 1 ? 1 : nivel === 2 ? Math.ceil(len * 0.3) : Math.ceil(len * 0.6);
  return resp.split("").map((c, i) => (c === " " ? " " : i < reveal ? c : "_")).join(" ");
}

export default function ModoOQFalta({
  card, onFinalizar,
}: {
  card: CardRow;
  onFinalizar: (r: { acertou: boolean; nivelPista: number; tentativas: number }) => void;
}) {
  const infos = useMemo(() => getInfos(card), [card]);
  const lacunaIdx = useMemo(() => sortearLacuna(card), [card.id]);
  const lacuna = infos.find((i) => i.idx === lacunaIdx)!;
  const visiveis = infos.filter((i) => i.idx !== lacunaIdx);

  const [valor, setValor] = useState("");
  const [estado, setEstado] = useState<Estado>("respondendo");
  const [tentativas, setTentativas] = useState(0);
  const [shake, setShake] = useState(false);
  const [errMsg, setErrMsg] = useState(false);
  const [nivelPista, setNivelPista] = useState(0);
  const [acertou, setAcertou] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setValor(""); setEstado("respondendo"); setTentativas(0); setNivelPista(0); setAcertou(false); }, [card.id]);

  function tentar() {
    if (estado !== "respondendo" || !valor.trim()) return;
    setTentativas((t) => t + 1);
    if (matchAnswer(valor, lacuna.info, lacuna.vars)) {
      setAcertou(true);
      setEstado("mostrando_explicacao");
      onFinalizar({ acertou: true, nivelPista, tentativas: tentativas + 1 });
    } else {
      setShake(true); setErrMsg(true);
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setErrMsg(false), 2000);
    }
  }

  function desmistificar() {
    if (estado !== "respondendo") return;
    if (nivelPista >= 3) {
      setEstado("mostrando_explicacao");
      onFinalizar({ acertou: false, nivelPista: 4, tentativas });
      return;
    }
    setNivelPista((n) => n + 1);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) { if (e.key === "Enter") tentar(); }

  return (
    <div className="space-y-6">
      <p className="text-lg leading-relaxed">{card.comando}</p>

      <ul className="space-y-2">
        {infos.map((i) => {
          if (i.idx === lacunaIdx) {
            return (
              <li key={i.idx} className="flex items-start gap-3">
                <span className="text-primary mt-1.5">▸</span>
                <span className="flex-1">
                  {estado === "mostrando_explicacao" ? (
                    <span className={cn("font-medium", acertou ? "text-success" : "text-destructive")}>
                      {i.info}
                    </span>
                  ) : nivelPista > 0 ? (
                    <span className="font-mono tracking-widest text-primary/80">{revelar(i.info, nivelPista)}</span>
                  ) : (
                    <span className="text-muted-foreground italic">— OQ falta —</span>
                  )}
                </span>
              </li>
            );
          }
          return (
            <li key={i.idx} className="flex items-start gap-3">
              <span className="text-primary mt-1.5">▸</span>
              <span className="flex-1">{i.info}</span>
            </li>
          );
        })}
      </ul>

      {estado === "respondendo" && (
        <>
          <div className="relative">
            <Input
              ref={inputRef}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onKeyDown={onKey}
              autoFocus
              maxLength={300}
              placeholder="Digite a informação que falta…"
              className={cn("h-14 text-lg neon-border bg-card/60", shake && "animate-shake")}
            />
            {errMsg && <p className="text-destructive text-xs mt-2 animate-fade-up">ainda não é isso…</p>}
          </div>
          <div className="flex justify-center">
            <Button size="lg" onClick={tentar} disabled={!valor.trim()} className="min-w-40">Confirmar</Button>
          </div>
        </>
      )}

      {estado === "mostrando_explicacao" && (
        <div className="rounded-xl border border-border/60 bg-card/40 p-5 animate-fade-up">
          <p className="text-sm text-muted-foreground mb-2 font-medium">Explicação</p>
          <p className="leading-relaxed">{card.explicacao}</p>
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
