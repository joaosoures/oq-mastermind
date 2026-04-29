import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function GerarOQs() {
  useEffect(() => { document.title = "Gerar OQs — OQ Falta?"; }, []);
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Card className="p-10 bg-card/60 text-center space-y-4">
        <Sparkles className="h-12 w-12 mx-auto text-primary" />
        <h1 className="text-2xl font-bold">Gerar OQs por IA</h1>
        <p className="text-muted-foreground">
          Em breve: envie um PDF (até 20 páginas) ou CSV e a IA gera entre 6 e 25 OQs adaptados ao seu estudo.
        </p>
        <p className="text-xs text-muted-foreground">
          Estrutura técnica pronta — falta criar a edge function que chama a IA. Peça na próxima mensagem para implementar.
        </p>
      </Card>
    </div>
  );
}
