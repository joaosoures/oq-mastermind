import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Lock, 
  FileText, 
  Headphones, 
  Search, 
  Play, 
  BookOpen,
  Filter,
  Crown,
  Download,
  Flame,
  ChevronRight,
  Zap,
  Clock
} from "lucide-react";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";
import { toast } from "sonner";
import { useUserPlan } from "@/hooks/useUserPlan";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Material {
  id: string;
  nome: string;
  tipo_1: string;
  link_1: string;
  tipo_2: string | null;
  link_2: string | null;
  especialidade: string;
  tier: 1 | 2 | 3;
  key_words: string | null;
}

export default function Materiais() {
  const { user, isAdmin } = useAuth();
  const { canUse } = useUserPlan();
  const [mats, setMats] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("all");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);

  useEffect(() => {
    document.title = "Materiais — OQ Falta?";
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("materiais")
        .select("*")
        .order("tier", { ascending: true })
        .order("nome", { ascending: true });

      if (error) throw error;
      setMats(data || []);
    } catch (error) {
      console.error("Erro ao buscar materiais:", error);
      toast.error("Erro ao carregar materiais");
    } finally {
      setLoading(false);
    }
  };

  const isOuro = canUse("materiais") || isAdmin;

  const filteredMats = useMemo(() => {
    return mats.filter((m) => {
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch = 
        m.nome.toLowerCase().includes(searchStr) || 
        (m.key_words || "").toLowerCase().includes(searchStr);
      
      const matchesSpecialty = selectedSpecialty === "all" || m.especialidade === selectedSpecialty;
      const matchesTier = selectedTier === "all" || m.tier.toString() === selectedTier;

      return matchesSearch && matchesSpecialty && matchesTier;
    });
  }, [mats, searchTerm, selectedSpecialty, selectedTier]);

  const getGoogleDriveId = (url: string) => {
    if (!url) return null;
    const match = url.match(/[-\w]{25,}/);
    return match ? match[0] : null;
  };

  const getEmbedUrl = (url: string) => {
    const id = getGoogleDriveId(url);
    if (!id) return url;
    return `https://drive.google.com/file/d/${id}/preview`;
  };

  const getDirectDownloadUrl = (url: string) => {
    const id = getGoogleDriveId(url);
    if (!id) return url;
    return `https://drive.google.com/uc?export=download&id=${id}`;
  };

  const handleOpenPreview = (material: Material) => {
    if (!isOuro && !isAdmin) {
      toast.error("Acesso exclusivo para assinantes Ouro", {
        description: "Vá em Meu plano para fazer upgrade.",
        action: { label: "Ver planos", onClick: () => (window.location.href = "/meu-plano") },
      });
      return;
    }
    setPreviewMaterial(material);
  };

  const getTierInfo = (tier: number) => {
    switch (tier) {
      case 1:
        return { label: "Alta Incidência", color: "text-red-500", bg: "bg-red-500/10", icon: <Flame className="h-3 w-3" />, border: "border-red-500/50" };
      case 2:
        return { label: "Média", color: "text-amber-500", bg: "bg-amber-500/10", icon: <Zap className="h-3 w-3" />, border: "border-amber-500/30" };
      case 3:
      default:
        return { label: "Baixa", color: "text-blue-500", bg: "bg-blue-500/10", icon: <Clock className="h-3 w-3" />, border: "border-blue-500/20" };
    }
  };

  const specialties = useMemo(() => {
    const set = new Set(mats.map(m => m.especialidade));
    return Array.from(set).sort();
  }, [mats]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight">Materiais</h1>
          <p className="text-muted-foreground text-lg">
            Conteúdo exclusivo do plano <span className="text-primary font-semibold">Estudante de Ouro</span>.
          </p>
        </div>

        {!isOuro && !isAdmin && (
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
            <div className="flex items-start gap-3">
              <div className="bg-amber-500/15 p-2 rounded-xl text-amber-500">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Materiais são exclusivos do plano Ouro</p>
                <p className="text-sm text-muted-foreground">Faça upgrade para liberar todos os PDFs e áudio aulas.</p>
              </div>
            </div>
            <Button asChild className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:opacity-90 w-full sm:w-auto">
              <Link to="/meu-plano">
                <Crown className="h-4 w-4 mr-1" /> Ver planos
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar tema ou palavra-chave..." 
            className="pl-10 bg-card/50 border-border/50 focus:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
          <SelectTrigger className="bg-card/50 border-border/50">
            <SelectValue placeholder="Especialidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Especialidades</SelectItem>
            {specialties.map(s => (
              <SelectItem key={s} value={s}>
                {ESPECIALIDADE_LABEL[s as keyof typeof ESPECIALIDADE_LABEL] || s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedTier} onValueChange={setSelectedTier}>
          <SelectTrigger className="bg-card/50 border-border/50">
            <SelectValue placeholder="Incidência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Incidências</SelectItem>
            <SelectItem value="1">Alta Incidência</SelectItem>
            <SelectItem value="2">Média Incidência</SelectItem>
            <SelectItem value="3">Baixa Incidência</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-card animate-pulse border border-border/50" />
          ))}
        </div>
      ) : filteredMats.length === 0 ? (
        <Card className="p-16 text-center bg-card/40 border-dashed border-2 flex flex-col items-center gap-4">
          <div className="bg-muted p-4 rounded-full">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-semibold">Nenhum material encontrado</h3>
            <p className="text-muted-foreground">Tente ajustar sua busca ou trocar os filtros.</p>
          </div>
          <Button variant="outline" onClick={() => {setSearchTerm(""); setSelectedSpecialty("all"); setSelectedTier("all");}}>
            Limpar Filtros
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMats.map((m) => {
            const tierInfo = getTierInfo(m.tier);
            const hasAudio = m.link_2 && m.link_2 !== "SEM AUDIO";
            
            return (
              <Card 
                key={m.id} 
                onClick={() => handleOpenPreview(m)}
                className={`group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer border-border/50 bg-gradient-to-br from-card to-background p-0 ${m.tier === 1 ? 'border-l-4 border-l-red-500' : ''} ${(!isOuro && !isAdmin) ? 'opacity-90' : ''}`}
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className={`${tierInfo.bg} ${tierInfo.color} border-none font-bold text-[10px] uppercase tracking-wider flex items-center gap-1`}>
                      {tierInfo.icon}
                      {tierInfo.label}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {hasAudio && (
                        <div className="bg-primary/10 text-primary p-1.5 rounded-full">
                          <Play className="h-3 w-3 fill-current" />
                        </div>
                      )}
                      {(!isOuro && !isAdmin) && (
                        <Lock className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                      {m.nome}
                    </h3>
                    <Badge variant="outline" className="bg-secondary/20 text-muted-foreground font-medium">
                      {ESPECIALIDADE_LABEL[m.especialidade as keyof typeof ESPECIALIDADE_LABEL] || m.especialidade}
                    </Badge>
                  </div>

                  <div className="pt-2 flex items-center text-primary font-bold text-sm group-hover:translate-x-1 transition-transform">
                    Acessar Conteúdo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </div>
                </div>
                
                {/* Visual indicator for Tier 1 */}
                {m.tier === 1 && (
                  <div className="absolute top-0 right-0 p-2">
                    <Flame className="h-4 w-4 text-red-500 animate-pulse" />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Visualizador Dual */}
      <Dialog open={!!previewMaterial} onOpenChange={(open) => !open && setPreviewMaterial(null)}>
        <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] flex flex-col p-0 overflow-hidden border-none rounded-3xl paper-card">
          <DialogHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between bg-card/80 backdrop-blur-md sticky top-0 z-10">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-bold tracking-tight">
                {previewMaterial?.nome}
              </DialogTitle>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                  {previewMaterial?.especialidade && ESPECIALIDADE_LABEL[previewMaterial.especialidade as keyof typeof ESPECIALIDADE_LABEL]}
                </Badge>
                {previewMaterial && (
                  <Badge variant="secondary" className={getTierInfo(previewMaterial.tier).bg + " " + getTierInfo(previewMaterial.tier).color}>
                    {getTierInfo(previewMaterial.tier).label}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mr-10">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 rounded-xl gap-2 hover:bg-primary/10"
                onClick={() => previewMaterial && window.open(previewMaterial.link_1, '_blank')}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
              {previewMaterial?.link_2 && previewMaterial.link_2 !== "SEM AUDIO" && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 rounded-xl gap-2 hover:bg-primary/10"
                  onClick={() => previewMaterial && window.open(previewMaterial.link_2, '_blank')}
                >
                  <Headphones className="h-4 w-4" />
                  <span className="hidden sm:inline">Áudio</span>
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-background">
            {/* PDF View */}
            <div className="flex-1 border-r border-border/50 h-full">
              {previewMaterial && (
                <iframe
                  src={getEmbedUrl(previewMaterial.link_1)}
                  className="w-full h-full border-none"
                  title="Resumo PDF"
                  allow="autoplay"
                />
              )}
            </div>

            {/* Audio View - Only if present */}
            {previewMaterial?.link_2 && previewMaterial.link_2 !== "SEM AUDIO" && (
              <div className="w-full md:w-80 p-6 bg-card/50 flex flex-col items-center justify-center space-y-6 border-t md:border-t-0 border-border/50">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                  <Headphones className="h-10 w-10 text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <h4 className="font-bold text-lg">Áudio Aula</h4>
                  <p className="text-sm text-muted-foreground">Escute o resumo comentado deste tema.</p>
                </div>
                <div className="w-full space-y-4">
                  <audio 
                    controls 
                    className="w-full"
                    src={getDirectDownloadUrl(previewMaterial.link_2)}
                  >
                    Seu navegador não suporta áudio.
                  </audio>
                  <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">
                    Streaming Exclusivo OQ MED
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

