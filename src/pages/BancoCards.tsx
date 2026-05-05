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

  const filtrados = cards.filter((c) => {
    const matchesBusca = busca.trim() === "" || c.comando.toLowerCase().includes(busca.toLowerCase());
    const matchesFiltro = 
      filtro === "todos" || 
      (filtro === "verificados" && c.verificado) || 
      (filtro === "aluno" && !c.verificado);
    
    return matchesBusca && matchesFiltro;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">Banco de OQs</h1>
          <p className="text-muted-foreground text-sm">Explore e gerencie seu acervo de questões.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
            <Input 
              value={busca} 
              onChange={(e) => setBusca(e.target.value)} 
              placeholder="Buscar por termo..." 
              maxLength={200} 
              className="pl-9 w-full sm:w-[300px] rounded-xl border-border/60 focus:border-accent/50 transition-all" 
            />
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-muted/30 rounded-2xl w-fit border border-border/40">
        <button
          onClick={() => setFiltro("todos")}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${filtro === "todos" ? "bg-background text-foreground shadow-sm ring-1 ring-border/20" : "text-muted-foreground hover:text-foreground"}`}
        >
          Todos
        </button>
        <button
          onClick={() => setFiltro("verificados")}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${filtro === "verificados" ? "bg-success/10 text-success shadow-sm ring-1 ring-success/20" : "text-muted-foreground hover:text-foreground"}`}
        >
          <CheckCircle2 className="h-3 w-3" />
          BEEmed Education
        </button>
        <button
          onClick={() => setFiltro("aluno")}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${filtro === "aluno" ? "bg-accent/10 text-accent shadow-sm ring-1 ring-accent/20" : "text-muted-foreground hover:text-foreground"}`}
        >
          <User className="h-3 w-3" />
          Feito por mim
        </button>
      </div>

      <div className="grid gap-3">
        {filtrados.map((c) => (
          <Card key={c.id} className="paper-card p-5 group hover:border-accent/30 transition-all">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {MODO_LABEL[c.modo as keyof typeof MODO_LABEL]}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {ESPECIALIDADE_LABEL[c.especialidade as keyof typeof ESPECIALIDADE_LABEL]}
                </span>
              </div>
              
              {c.verificado ? (
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-success bg-success/10 px-2 py-1 rounded-lg border border-success/20">
                  <CheckCircle2 className="h-3 w-3" />
                  BEEmed Education
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-accent bg-accent/10 px-2 py-1 rounded-lg border border-accent/20">
                  <User className="h-3 w-3" />
                  Geração Própria
                </div>
              )}
            </div>
            
            <p className="font-medium text-[hsl(var(--foreground))] leading-relaxed">{c.comando}</p>
          </Card>
        ))}
        
        {filtrados.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-border/40 rounded-3xl bg-muted/5">
            <Search className="h-10 w-10 mx-auto text-muted-foreground/30 mb-4" />
            <p className="font-bold text-muted-foreground">Nenhum OQ encontrado.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Tente ajustar seus filtros ou busca.</p>
          </div>
        )}
      </div>
    </div>
  );
}
