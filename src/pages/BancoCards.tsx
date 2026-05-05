import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, User, Search, Filter } from "lucide-react";
import { ESPECIALIDADE_LABEL, MODO_LABEL } from "@/lib/oq";

type FilterType = "todos" | "verificados" | "aluno";

export default function BancoCards() {
  const [cards, setCards] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FilterType>("todos");
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Banco de OQs — OQ Falta?";
    supabase.from("cards").select("*").order("criado_em", { ascending: false }).limit(200)
      .then(({ data }) => setCards(data ?? []));
  }, []);

  const filtrados = cards.filter((c) =>
    busca.trim() === "" || c.comando.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold">Banco de OQs</h1>
      <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar…" maxLength={200} className="max-w-md" />
      <div className="space-y-3">
        {filtrados.map((c) => (
          <Card key={c.id} className="p-4 bg-card/60">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="outline">{MODO_LABEL[c.modo as keyof typeof MODO_LABEL]}</Badge>
              <Badge variant="outline">{ESPECIALIDADE_LABEL[c.especialidade as keyof typeof ESPECIALIDADE_LABEL]}</Badge>
              {c.verificado && <Badge className="bg-success/20 text-success border-success/40 hover:bg-success/20">✓ Verificado</Badge>}
              {!c.verificado && c.criado_por_usuario_id === user?.id && <Badge variant="secondary">Criado por você</Badge>}
            </div>
            <p className="text-sm">{c.comando}</p>
          </Card>
        ))}
        {filtrados.length === 0 && <p className="text-muted-foreground">Nenhum OQ encontrado.</p>}
      </div>
    </div>
  );
}
