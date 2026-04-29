import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, FileText, Headphones } from "lucide-react";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";

export default function Materiais() {
  const { user } = useAuth();
  const [mats, setMats] = useState<any[]>([]);
  const [plano, setPlano] = useState<string>("trial");

  useEffect(() => {
    document.title = "Materiais — OQ Falta?";
    supabase.from("materiais").select("*").eq("ativo", true).then(({ data }) => setMats(data ?? []));
    if (user) supabase.from("assinaturas").select("plano").eq("usuario_id", user.id).maybeSingle()
      .then(({ data }) => setPlano(data?.plano ?? "trial"));
  }, [user]);

  const isOuro = plano === "ouro";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Materiais</h1>
        <p className="text-muted-foreground mt-1">Conteúdo exclusivo do plano <span className="text-primary">Estudante de Ouro</span>.</p>
      </div>
      {mats.length === 0 ? (
        <Card className="p-10 text-center bg-card/60 text-muted-foreground">
          Nenhum material publicado ainda.
        </Card>
      ) : (
        <div className="grid gap-4">
          {mats.map((m) => (
            <Card key={m.id} className="p-5 bg-card/60 flex items-start gap-4">
              {m.tipo === "pdf" ? <FileText className="h-6 w-6 text-primary" /> : <Headphones className="h-6 w-6 text-primary" />}
              <div className="flex-1">
                <h3 className="font-semibold">{m.titulo}</h3>
                <p className="text-sm text-muted-foreground">{m.descricao}</p>
                <Badge variant="outline" className="mt-2">{ESPECIALIDADE_LABEL[m.especialidade as keyof typeof ESPECIALIDADE_LABEL]}</Badge>
              </div>
              {!isOuro && <Lock className="h-5 w-5 text-muted-foreground" />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
