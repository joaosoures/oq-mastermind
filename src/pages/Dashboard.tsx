import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ESPECIALIDADE_LABEL, Especialidade } from "@/lib/oq";

const NOTA_LABEL = ["Fácil demais", "Fácil", "Médio", "Difícil", "Impossível/Erro"];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, acertos: 0, erros: 0, hoje: 0, dist: [0,0,0,0,0] });
  const [historico, setHistorico] = useState<any[]>([]);

  useEffect(() => {
    document.title = "Área do aluno — OQ Falta?";
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("desempenho_cards")
        .select("*, cards(comando, especialidade)")
        .eq("usuario_id", user.id)
        .order("timestamp_ultima", { ascending: false })
        .limit(100);
      const all = data ?? [];
      const dist = [0,0,0,0,0];
      let total = 0, acertos = 0, erros = 0, hoje = 0;
      const hoje0 = new Date(); hoje0.setHours(0,0,0,0);
      all.forEach((d: any) => {
        total += d.contador_vezes;
        acertos += d.contador_acertos;
        erros += d.contador_erros;
        if (d.ultima_nota !== null) dist[d.ultima_nota]++;
        if (d.timestamp_ultima && new Date(d.timestamp_ultima) >= hoje0) hoje++;
      });
      setStats({ total, acertos, erros, hoje, dist });
      setHistorico(all.slice(0, 10));
    })();
  }, [user]);

  const taxa = stats.total > 0 ? Math.round((stats.acertos / stats.total) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold">Sua jornada</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: "OQs respondidos", v: stats.total },
          { l: "Taxa de acerto", v: `${taxa}%` },
          { l: "Hoje", v: stats.hoje },
          { l: "Erros totais", v: stats.erros },
        ].map((s, i) => (
          <Card key={i} className="p-5 bg-card/60">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.l}</p>
            <p className="text-3xl font-bold mt-1 neon-text">{s.v}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6 bg-card/60">
        <h2 className="font-semibold mb-4">Distribuição por desempenho</h2>
        <div className="space-y-2">
          {NOTA_LABEL.map((l, i) => {
            const max = Math.max(...stats.dist, 1);
            const pct = (stats.dist[i] / max) * 100;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm w-32 text-muted-foreground">{i} — {l}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm w-8 text-right">{stats.dist[i]}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <div>
        <h2 className="font-semibold mb-3">Revisão inteligente</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            ["criticos", "OQs críticos"],
            ["dificeis", "OQs difíceis"],
            ["novos", "OQs novos"],
            ["esquecidos", "OQs esquecidos"],
          ].map(([t, l]) => (
            <Button key={t} asChild variant="outline" className="h-auto py-4 justify-start">
              <Link to={`/estudo?tipo=${t}`}>{l}</Link>
            </Button>
          ))}
          <Button asChild variant="outline" className="h-auto py-4 justify-start">
            <Link to="/estudo?tipo=favoritos">Favoritos</Link>
          </Button>
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-3">Por especialidade</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {(Object.keys(ESPECIALIDADE_LABEL) as Especialidade[]).map((e) => (
            <Button key={e} asChild variant="outline" className="h-auto py-4 justify-start">
              <Link to={`/estudo?esp=${e}`}>{ESPECIALIDADE_LABEL[e]}</Link>
            </Button>
          ))}
        </div>
      </div>

      <Card className="p-6 bg-card/60">
        <h2 className="font-semibold mb-3">Últimos OQs</h2>
        {historico.length === 0 ? (
          <p className="text-sm text-muted-foreground">Você ainda não estudou hoje.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {historico.map((h: any) => (
              <li key={h.id} className="py-3 flex items-start gap-3 text-sm">
                <span className={`px-2 py-0.5 rounded text-xs ${h.ultima_nota === 4 ? "bg-destructive/20 text-destructive" : "bg-success/20 text-success"}`}>
                  Nota {h.ultima_nota}
                </span>
                <span className="flex-1 line-clamp-1">{h.cards?.comando}</span>
                <span className="text-muted-foreground text-xs">{new Date(h.timestamp_ultima).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
