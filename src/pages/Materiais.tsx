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
  Clock,
  ArrowUp,
  X,
  ListFilter
} from "lucide-react";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";

const MATERIAL_ESPECIALIDADE_LABEL: Record<string, string> = {
  ...ESPECIALIDADE_LABEL,
  saude_mental: "Saúde Mental",
};
const labelEsp = (k: string) => MATERIAL_ESPECIALIDADE_LABEL[k] || k;
import { toast } from "sonner";
import { useUserPlan } from "@/hooks/useUserPlan";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";


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
  const [visibleCount, setVisibleCount] = useState(20);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    document.title = "Materiais — OQ Falta?";
    fetchMaterials();

    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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
      setMats((data as Material[]) || []);
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

  const displayedMats = useMemo(() => {
    return filteredMats.slice(0, visibleCount);
  }, [filteredMats, visibleCount]);

  const loadMore = () => {
    setVisibleCount(prev => prev + 40);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const suggestions = [
    "Trombólise", "AVC", "IAM", "TEP", "Insuficiência Cardíaca", 
    "Diabetes", "Hipertensão", "Sepse", "Antibióticos", "Eletrocardiograma"
  ];

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
    <div className="min-h-full px-4 md:px-8 py-8 md:py-12 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-[hsl(var(--accent))] font-black mb-2">Plano Ouro</p>
        <h1 className="font-display text-4xl md:text-5xl font-black tracking-tighter text-[hsl(var(--foreground))]">
          Materiais de Estudo
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-2xl">
          Resumos em PDF e audio aulas exclusivas. Conteúdo otimizado para sua aprovação com foco em incidência.
        </p>
      </header>

      {!isOuro && !isAdmin && (
        <div className="paper-card p-6 flex flex-col sm:flex-row items-center gap-6 border-amber-500/20">
          <div className="shrink-0 grid place-items-center rounded-2xl w-[52px] h-[52px] bg-[hsl(var(--background))] shadow-neu-out-sm">
            <Crown className="h-6 w-6 text-amber-500" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-display font-bold text-lg text-[hsl(var(--foreground))]">Acesso Restrito</h3>
            <p className="text-sm text-muted-foreground">Os materiais são exclusivos para assinantes do plano Estudante de Ouro.</p>
          </div>
          <Button asChild className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold hover:opacity-90 px-8 rounded-xl h-12 shadow-lg">
            <Link to="/meu-plano">Upgrade para Ouro</Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-2 rounded-3xl bg-card/30 backdrop-blur-sm border border-white/5">
        <div className="relative md:col-span-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar tema ou palavra-chave..." 
            className="pl-11 h-12 bg-[hsl(var(--background))] border-none shadow-neu-in rounded-2xl font-medium focus-visible:ring-accent/30"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          />
          
          {isSearchFocused && (
            <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-[hsl(var(--background))] rounded-2xl shadow-2xl border border-white/5 z-50 animate-in fade-in slide-in-from-top-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-3 py-2">Sugestões</p>
              <div className="grid grid-cols-2 gap-1">
                {suggestions.map(s => (
                  <button
                    key={s}
                    className="text-left px-3 py-2 text-xs font-bold rounded-xl hover:bg-accent/10 hover:text-accent transition-colors"
                    onClick={() => setSearchTerm(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-12 md:col-span-2 bg-[hsl(var(--background))] border-none shadow-neu-out-sm rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {(selectedSpecialty !== "all" || selectedTier !== "all") && (
                <Badge className="ml-2 bg-accent text-accent-foreground rounded-full px-1.5 h-4 min-w-[1rem] flex items-center justify-center text-[10px]">
                  { (selectedSpecialty !== "all" ? 1 : 0) + (selectedTier !== "all" ? 1 : 0) }
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 rounded-[2rem] border-none shadow-2xl p-6 bg-card/95 backdrop-blur-xl space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Especialidade</label>
              <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                <SelectTrigger className="bg-[hsl(var(--background))] border-none shadow-neu-in rounded-xl font-bold text-[10px] uppercase tracking-wider h-10">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all">Todas</SelectItem>
                  {specialties.map(s => (
                    <SelectItem key={s} value={s} className="font-bold text-[10px] uppercase">{labelEsp(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Incidência</label>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger className="bg-[hsl(var(--background))] border-none shadow-neu-in rounded-xl font-bold text-[10px] uppercase tracking-wider h-10">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="1">Alta Incidência</SelectItem>
                  <SelectItem value="2">Média Incidência</SelectItem>
                  <SelectItem value="3">Baixa Incidência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              variant="ghost" 
              className="w-full text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-red-500"
              onClick={() => {setSelectedSpecialty("all"); setSelectedTier("all");}}
            >
              Limpar Filtros
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 rounded-3xl bg-card/50 animate-pulse border border-white/5" />
          ))}
        </div>
      ) : filteredMats.length === 0 ? (
        <div className="paper-card p-20 text-center flex flex-col items-center gap-4">
          <div className="bg-[hsl(var(--background))] p-6 rounded-3xl shadow-neu-out-sm">
            <Search className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-2xl font-bold">Nada por aqui</h3>
            <p className="text-muted-foreground">Tente outros termos ou filtros.</p>
          </div>
          <Button 
            variant="outline" 
            className="mt-4 rounded-xl font-bold border-none shadow-neu-out-sm hover:shadow-neu-in transition-all bg-[hsl(var(--background))]"
            onClick={() => {setSearchTerm(""); setSelectedSpecialty("all"); setSelectedTier("all");}}
          >
            Limpar Filtros
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedMats.map((m) => {
              const tierInfo = getTierInfo(m.tier);
              const hasAudio = m.link_2 && m.link_2 !== "SEM AUDIO";
              
              return (
                <div 
                  key={m.id} 
                  onClick={() => handleOpenPreview(m)}
                  className={`paper-card group relative p-5 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col gap-3 border-l-4 ${m.tier === 1 ? 'border-l-red-500' : m.tier === 2 ? 'border-l-amber-500' : 'border-l-blue-500'} ${(!isOuro && !isAdmin) ? 'opacity-80' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 ${tierInfo.color}`}>
                        {tierInfo.icon}
                        {tierInfo.label}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                        {labelEsp(m.especialidade)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {(!isOuro && !isAdmin) && (
                        <div className="bg-amber-500/10 p-1.5 rounded-xl">
                          <Lock className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="font-display font-bold text-base leading-[1.2] group-hover:text-primary transition-colors pr-2">
                    {m.nome}
                  </h3>

                  <div className="mt-auto pt-2 flex items-center justify-between">
                    <div className="flex items-center text-[10px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                      Estudar agora
                      <ChevronRight className="h-3 w-3 ml-0.5" />
                    </div>
                    {m.tier === 1 && (
                      <Flame className="h-4 w-4 text-red-500 animate-pulse ml-auto" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredMats.length > visibleCount && (
            <div className="flex justify-center pt-4 pb-12">
              <Button 
                onClick={loadMore}
                variant="outline"
                className="h-14 px-10 rounded-2xl bg-card border-none shadow-neu-out-sm hover:shadow-neu-in transition-all font-black text-xs uppercase tracking-[0.2em] gap-3 group"
              >
                <ListFilter className="h-4 w-4 text-accent group-hover:rotate-180 transition-transform duration-500" />
                Carregar mais conteúdo
              </Button>
            </div>
          )}
        </div>
      )}

      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 h-12 w-12 rounded-2xl bg-accent text-accent-foreground shadow-2xl hover:scale-110 transition-all z-40 p-0 animate-in fade-in slide-in-from-bottom-4"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}

      {/* Visualizador Dual */}
      <Dialog open={!!previewMaterial} onOpenChange={(open) => !open && setPreviewMaterial(null)}>
        <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] flex flex-col p-0 overflow-hidden border-none rounded-[2.5rem] bg-[hsl(var(--background))] shadow-2xl">
          <DialogHeader className="p-6 md:px-10 border-b border-white/5 flex flex-row items-center justify-between bg-card/40 backdrop-blur-xl sticky top-0 z-10">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-black uppercase tracking-[0.25em] ${previewMaterial ? getTierInfo(previewMaterial.tier).color : ""}`}>
                   {previewMaterial && getTierInfo(previewMaterial.tier).label}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {previewMaterial?.especialidade && labelEsp(previewMaterial.especialidade)}
                </span>
              </div>
              <DialogTitle className="text-xl md:text-2xl font-display font-black tracking-tight leading-tight">
                {previewMaterial?.nome}
              </DialogTitle>
            </div>
            
            <div className="flex items-center gap-3 mr-8">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-10 rounded-2xl gap-2 bg-[hsl(var(--background))] border-none shadow-neu-out-sm hover:shadow-neu-in transition-all px-5 font-bold text-xs uppercase tracking-wider"
                onClick={() => previewMaterial && window.open(previewMaterial.link_1, '_blank')}
              >
                <Download className="h-4 w-4 text-accent" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
              {previewMaterial?.link_2 && previewMaterial.link_2 !== "SEM AUDIO" && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-10 rounded-2xl gap-2 bg-[hsl(var(--background))] border-none shadow-neu-out-sm hover:shadow-neu-in transition-all px-5 font-bold text-xs uppercase tracking-wider"
                  onClick={() => previewMaterial && window.open(previewMaterial.link_2, '_blank')}
                >
                  <Headphones className="h-4 w-4 text-accent" />
                  <span className="hidden sm:inline">Áudio</span>
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* PDF View */}
            <div className="flex-1 h-full bg-white/5">
              {previewMaterial && (
                <iframe
                  src={getEmbedUrl(previewMaterial.link_1)}
                  className="w-full h-full border-none"
                  title="Resumo PDF"
                  allow="autoplay"
                />
              )}
            </div>

            {/* Audio Controller - Modern & Minimal */}
            {previewMaterial?.link_2 && previewMaterial.link_2 !== "SEM AUDIO" && (
              <div className="h-24 md:h-auto md:w-20 bg-card/60 backdrop-blur-md border-t md:border-t-0 md:border-l border-white/5 flex flex-row md:flex-col items-center justify-center gap-6 p-4">
                 <div className="p-4 rounded-2xl bg-[hsl(var(--background))] shadow-neu-out-sm group">
                    <Headphones className="h-6 w-6 text-accent group-hover:scale-110 transition-transform" />
                 </div>
                 <div className="flex-1 md:hidden">
                    <audio 
                      controls 
                      className="w-full h-8 scale-90"
                      src={getDirectDownloadUrl(previewMaterial.link_2)}
                    />
                 </div>
                 <div className="hidden md:block vertical-audio-container">
                    {/* For desktop, we keep it simple or hide standard player for custom UI later if needed, but for now just show it */}
                    <audio 
                      controls 
                      className="w-48 -rotate-90 origin-center translate-y-20 scale-75"
                      src={getDirectDownloadUrl(previewMaterial.link_2)}
                    />
                 </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

