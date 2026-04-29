import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Admin() {
  const [stats, setStats] = useState({ users: 0, cards: 0, reports: 0 });
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    document.title = "Admin — OQ Falta?";
    (async () => {
      const [u, c, r] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("cards").select("id", { count: "exact", head: true }),
        supabase.from("reports_erro").select("*, cards(comando)").eq("status", "pendente").order("criado_em", { ascending: false }).limit(20),
      ]);
      setStats({ users: u.count ?? 0, cards: c.count ?? 0, reports: r.data?.length ?? 0 });
      setReports(r.data ?? []);
    })();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold">Painel admin</h1>
      <div className="grid grid-cols-3 gap-4">
        {[["Usuários", stats.users], ["OQs", stats.cards], ["Reports pendentes", stats.reports]].map(([l, v]) => (
          <Card key={l as string} className="p-5 bg-card/60">
            <p className="text-xs uppercase text-muted-foreground">{l}</p>
            <p className="text-3xl font-bold neon-text mt-1">{v}</p>
          </Card>
        ))}
      </div>
      <Card className="p-6 bg-card/60">
        <h2 className="font-semibold mb-3">Reports pendentes</h2>
        {reports.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum report pendente.</p> : (
          <ul className="divide-y divide-border/50">
            {reports.map((r) => (
              <li key={r.id} className="py-3 flex gap-3 items-start text-sm">
                <Badge variant="outline">{r.tipo}</Badge>
                <span className="flex-1">{r.cards?.comando}</span>
                <span className="text-xs text-muted-foreground">{new Date(r.criado_em).toLocaleDateString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-xs text-muted-foreground">CRUD de cards, gerenciamento detalhado de reports/problemas e importação CSV ficaram como próximos passos.</p>
    </div>
  );
}
