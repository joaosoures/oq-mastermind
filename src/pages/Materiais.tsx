import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Lock, 
  FileText, 
  Headphones, 
  Search, 
  ExternalLink, 
  Play, 
  BookOpen,
  Filter
} from "lucide-react";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";
import { toast } from "sonner";

interface Material {
  id: string;
  nome: string;
  titulo?: string;
  link_drive: string;
  tipo: "resumo" | "audio" | string;
  especialidade: string;
  ativo: boolean;
}

export default function Materiais() {
  const { user } = useAuth();
  const [mats, setMats] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [plano, setPlano] = useState<string>("trial");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    document.title = "Materiais — OQ Falta?";
    fetchPlano();
    fetchMaterials(true);
  }, [user]);

  const fetchPlano = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("assinaturas")
      .select("plano")
      .eq("usuario_id", user.id)
      .maybeSingle();
    setPlano(data?.plano ?? "trial");
  };

  const fetchMaterials = async (isInitial = false) => {
    try {
      setLoading(true);
      const currentPage = isInitial ? 0 : page;
      
      const { data, error } = await supabase
        .from("materiais")
        .select("*")
        .eq("ativo", true)
        .order("criado_em", { ascending: false })
        .range(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE - 1);

      if (error) throw error;

      if (isInitial) {
        setMats(data ?? []);
        setPage(1);
      } else {
        setMats(prev => [...prev, ...(data ?? [])]);
        setPage(prev => prev + 1);
      }
      
      if ((data?.length || 0) < ITEMS_PER_PAGE) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Erro ao buscar materiais:", error);
      toast.error("Erro ao carregar materiais");
    } finally {
      setLoading(false);
    }
  };

  const isOuro = plano === "ouro";

  const filteredMats = useMemo(() => {
    return mats.filter((m) => {
      const matchesSearch = (m.nome || m.titulo || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = 
        activeTab === "all" || 
        (activeTab === "resumos" && m.tipo === "resumo") || 
        (activeTab === "audios" && m.tipo === "audio");
      return matchesSearch && matchesTab;
    });
  }, [mats, searchTerm, activeTab]);

  const handleOpenLink = (link: string) => {
    if (!isOuro) {
      toast.error("Acesso exclusivo para assinantes Ouro", {
        description: "Assine para desbloquear todo o conteúdo."
      });
      return;
    }
    if (link) {
      window.open(link, "_blank");
    } else {
      toast.error("Link não disponível para este material");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight">Materiais</h1>
          <p className="text-muted-foreground text-lg">
            Conteúdo exclusivo do plano <span className="text-primary font-semibold">Estudante de Ouro</span>.
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full w-fit">
          <Filter className="h-4 w-4" />
          {mats.length} Materiais Disponíveis
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar material pelo nome..." 
            className="pl-10 bg-card/50 border-border/50 focus:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={setActiveTab}>
          <TabsList className="bg-card/50 border border-border/50 p-1">
            <TabsTrigger value="all" className="px-6">Todos</TabsTrigger>
            <TabsTrigger value="resumos" className="px-6">Resumos</TabsTrigger>
            <TabsTrigger value="audios" className="px-6">Áudios</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filteredMats.length === 0 && !loading ? (
        <Card className="p-16 text-center bg-card/40 border-dashed border-2 flex flex-col items-center gap-4">
          <div className="bg-muted p-4 rounded-full">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-semibold">Nenhum material encontrado</h3>
            <p className="text-muted-foreground">Tente ajustar sua busca ou trocar o filtro.</p>
          </div>
          <Button variant="outline" onClick={() => {setSearchTerm(""); setActiveTab("all");}}>
            Limpar Filtros
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMats.map((m) => (
            <Card 
              key={m.id} 
              className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 border-border/50 bg-gradient-to-br from-card to-background p-0 ${!isOuro ? 'opacity-80' : ''}`}
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-2xl ${m.tipo === "resumo" ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                    {m.tipo === "resumo" ? <FileText className="h-6 w-6" /> : <Headphones className="h-6 w-6" />}
                  </div>
                  {!isOuro && (
                    <div className="bg-amber-500/10 text-amber-500 p-2 rounded-lg">
                      <Lock className="h-4 w-4" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">
                    {m.nome || m.titulo}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-secondary/50 font-medium">
                      {ESPECIALIDADE_LABEL[m.especialidade as keyof typeof ESPECIALIDADE_LABEL] || m.especialidade}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {m.tipo}
                    </Badge>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <Button 
                    variant={isOuro ? "default" : "outline"} 
                    className={`w-full gap-2 font-semibold shadow-sm transition-all ${isOuro ? 'hover:scale-[1.02]' : 'border-dashed'}`}
                    onClick={() => handleOpenLink(m.link_drive)}
                  >
                    {m.tipo === "resumo" ? (
                      <>
                        <BookOpen className="h-4 w-4" />
                        Ler Resumo
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Ouvir Áudio
                      </>
                    )}
                    <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
                  </Button>
                </div>
              </div>
              
              {/* Decorative background element */}
              <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all duration-500" />
            </Card>
          ))}
        </div>
      )}

      {hasMore && !loading && filteredMats.length > 0 && (
        <div className="flex justify-center pt-8">
          <Button 
            variant="ghost" 
            className="text-muted-foreground hover:text-primary gap-2"
            onClick={() => fetchMaterials()}
          >
            Carregar mais materiais
            <div className="animate-bounce">↓</div>
          </Button>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-card animate-pulse border border-border/50" />
          ))}
        </div>
      )}
    </div>
  );
}
