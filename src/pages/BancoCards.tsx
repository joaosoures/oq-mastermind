import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, User, Search, Filter, Layers, EyeOff, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { ESPECIALIDADE_LABEL, MODO_LABEL, type Especialidade, type Modo } from "@/lib/oq";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FilterType = "todos" | "verificados" | "aluno";

export default function BancoCards() {
  const [cards, setCards] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FilterType>("todos");
  const [especialidadeFiltro, setEspecialidadeFiltro] = useState<Especialidade | "todas">("todas");
  const [exclusoes, setExclusoes] = useState<Set<string>>(new Set());
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Banco de OQs — OQ Falta?";
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    
    // Carregar cards
    const { data: cardsData } = await supabase.from("cards").select("*").order("criado_em", { ascending: false }).limit(200);
    setCards(cardsData || []);

    // Carregar exclusões do usuário
    const { data: exclData } = await supabase.from("user_excluded_cards").select("card_id").eq("user_id", user.id);
    setExclusoes(new Set(exclData?.map(e => e.card_id) || []));
  }

  async function toggleExclusion(cardId: string) {
    if (!user) return;
    const isExcluded = exclusoes.has(cardId);
    
    if (isExcluded) {
      const { error } = await supabase.from("user_excluded_cards").delete().eq("user_id", user.id).eq("card_id", cardId);
      if (!error) {
        setExclusoes(prev => {
          const next = new Set(prev);
          next.delete(cardId);
          return next;
        });
        toast.success("Card reativado para revisão");
      }
    } else {
      const { error } = await supabase.from("user_excluded_cards").insert({ user_id: user.id, card_id: cardId });
      if (!error) {
        setExclusoes(prev => new Set(prev).add(cardId));
        toast.success("Card ocultado da sua revisão");
      }
    }
  }

  async function deleteCard(cardId: string) {
    if (!window.confirm("Tem certeza que deseja excluir permanentemente este card?")) return;
    
    const { error } = await supabase.from("cards").delete().eq("id", cardId);
    if (!error) {
      setCards(prev => prev.filter(c => c.id !== cardId));
      toast.success("Card excluído com sucesso");
    } else {
      toast.error("Erro ao excluir card");
    }
  }

  async function handleUpdateCard(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCard) return;

    try {
      const { error } = await supabase
        .from("cards")
        .update({
          comando: editingCard.comando,
          info_1: editingCard.info_1,
          var_1: editingCard.var_1,
          alternativa_correta: editingCard.alternativa_correta,
          alternativa_a: editingCard.alternativa_a,
          alternativa_b: editingCard.alternativa_b,
          alternativa_c: editingCard.alternativa_c,
          alternativa_d: editingCard.alternativa_d,
          alternativa_e: editingCard.alternativa_e,
          explicacao: editingCard.explicacao,
          especialidade: editingCard.especialidade
        })
        .eq("id", editingCard.id);

      if (error) throw error;

      setCards(prev => prev.map(c => c.id === editingCard.id ? { ...c, ...editingCard } : c));
      setIsEditDialogOpen(false);
      setEditingCard(null);
      toast.success("OQ atualizado com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao atualizar OQ: " + err.message);
    }
  }

  const filtrados = cards.filter((c) => {
    const matchesBusca = busca.trim() === "" || c.comando.toLowerCase().includes(busca.toLowerCase());
    const matchesFiltro = 
      filtro === "todos" || 
      (filtro === "verificados" && c.verificado) || 
      (filtro === "aluno" && !c.verificado);
    
    const matchesEspecialidade = 
      especialidadeFiltro === "todas" || 
      c.especialidade === especialidadeFiltro;
    
    return matchesBusca && matchesFiltro && matchesEspecialidade;
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

      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Especialidade</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setEspecialidadeFiltro("todas")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all border-2",
              especialidadeFiltro === "todas"
                ? "bg-accent text-white border-accent shadow-lg shadow-accent/20"
                : "bg-card/40 border-border/40 text-muted-foreground hover:border-border/80"
            )}
          >
            Todas as Especialidades
          </button>
          {(Object.keys(ESPECIALIDADE_LABEL) as Especialidade[]).map((esp) => (
            <button
              key={esp}
              onClick={() => setEspecialidadeFiltro(esp)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all border-2",
                especialidadeFiltro === esp
                  ? "bg-accent text-white border-accent shadow-lg shadow-accent/20"
                  : "bg-card/40 border-border/40 text-muted-foreground hover:border-border/80"
              )}
            >
              {ESPECIALIDADE_LABEL[esp]}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros Estruturados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { id: "todos", label: "Todos os OQs", desc: "Acervo completo", icon: Layers, color: "accent" },
          { id: "verificados", label: "BEEmed Education", desc: "Conteúdo oficial", icon: CheckCircle2, color: "success" },
          { id: "aluno", label: "Feito por mim", desc: "Gerações do aluno", icon: User, color: "primary" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setFiltro(item.id as FilterType)}
            className={`
              relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group
              ${filtro === item.id 
                ? `border-${item.color} bg-${item.color}/5 shadow-[0_0_20px_rgba(var(--${item.color}-rgb),0.1)]` 
                : "border-border/40 bg-card/40 hover:border-border/80"}
            `}
          >
            <div className={`
              shrink-0 w-12 h-12 rounded-xl grid place-items-center transition-colors
              ${filtro === item.id 
                ? (item.id === "verificados" ? "bg-emerald-500 text-white" : `bg-${item.color} text-white`) 
                : "bg-muted text-muted-foreground group-hover:bg-muted/80"}
            `}>
              <item.icon className={cn("h-6 w-6", item.id === "verificados" && filtro !== "verificados" && "text-emerald-500")} />
            </div>
            <div>
              <p className={`text-sm font-black uppercase tracking-wider ${filtro === item.id ? `text-${item.color}` : "text-foreground"}`}>
                {item.label}
              </p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight opacity-70">
                {item.desc}
              </p>
            </div>
            {filtro === item.id && (
              <div className={`absolute top-3 right-3 w-2 h-2 rounded-full bg-${item.color} animate-pulse`} />
            )}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {filtrados.map((c) => {
          const isExcluded = exclusoes.has(c.id);
          const isOwner = c.criado_por_usuario_id === user?.id;

          return (
            <Card key={c.id} className={cn(
              "paper-card p-5 group hover:border-accent/30 transition-all",
              isExcluded && "opacity-60 grayscale-[0.5]"
            )}>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {MODO_LABEL[c.modo as keyof typeof MODO_LABEL]}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {ESPECIALIDADE_LABEL[c.especialidade as keyof typeof ESPECIALIDADE_LABEL]}
                  </span>
                  {isExcluded && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                      Oculto da Revisão
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
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

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!c.verificado && isOwner && (
                      <button
                        onClick={() => {
                          setEditingCard({ ...c });
                          setIsEditDialogOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                        title="Editar OQ"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => toggleExclusion(c.id)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        isExcluded 
                          ? "bg-success/10 text-success hover:bg-success/20" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                      title={isExcluded ? "Reativar card" : "Não quero estudar esse card"}
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                    </button>
                    
                    {!c.verificado && isOwner && (
                      <button
                        onClick={() => deleteCard(c.id)}
                        className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                        title="Excluir permanentemente"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <p className="font-medium text-[hsl(var(--foreground))] leading-relaxed">{c.comando}</p>
              
              {isExcluded && (
                <p className="text-[10px] text-muted-foreground mt-2 italic">Este card não aparecerá nas suas sessões de estudo.</p>
              )}
            </Card>
          );
        })}
        
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
