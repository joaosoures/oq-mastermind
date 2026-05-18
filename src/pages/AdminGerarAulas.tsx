import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GraduationCap, Sparkles, Save, RotateCcw,
  Loader2, CheckCircle2, FileText, BarChart3, ExternalLink, Pencil, Trash2,
  Flame, Zap, Clock, FileDown, MousePointer2
} from "lucide-react";
import { ESPECIALIDADE_LABEL, Especialidade, Modo } from "@/lib/oq";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Aula = {
  id: string;
  nome: string;
  especialidade: Especialidade;
  link_aula: string | null;
  tier: number;
};

type TempOQ = {
  id: string;
  pergunta: string;
  resposta: string;
  variacoes?: string;
  modo: string;
  especialidade: string;
  opcoes?: any;
  explicacao?: string;
  aula_id?: string | null;
  modelo_ia?: string | null;
};

type AulaStat = {
  aula_id: string;
  nome: string;
  especialidade: string;
  total: number;
  abcde: number;
  lacuna: number;
  oq_falta: number;
};

const MODELS = [
  { v: "google/gemini-2.5-flash", l: "Gemini 2.5 Flash (padrão, rápido)" },
  { v: "google/gemini-2.5-pro", l: "Gemini 2.5 Pro (mais preciso)" },
  { v: "google/gemini-2.5-flash-lite", l: "Gemini 2.5 Flash Lite (barato)" },
  { v: "openai/gpt-5", l: "GPT-5 (top reasoning)" },
  { v: "openai/gpt-5-mini", l: "GPT-5 Mini" },
  { v: "openai/gpt-5-nano", l: "GPT-5 Nano" },
];

export default function AdminGerarAulas() {
  const { user, isAdmin } = useAuth();
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [stats, setStats] = useState<AulaStat[]>([]);
  const [tempOQs, setTempOQs] = useState<TempOQ[]>([]);
  const [selectedAulaId, setSelectedAulaId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [promptOriginal, setPromptOriginal] = useState("");
  const [modelo, setModelo] = useState("google/gemini-2.5-flash");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingOQ, setEditingOQ] = useState<TempOQ | null>(null);

  useEffect(() => {
    document.title = "Gerar OQs a partir de Aulas — Admin";
    if (isAdmin) loadAll();
  }, [isAdmin]);

  async function loadAll() {
    await Promise.all([loadAulas(), loadPrompt(), loadStats(), loadTemp()]);
  }

  async function loadAulas() {
    // Aulas = materiais com resumo em PDF (link_1). Áudios (link_2) são ignorados.
    const { data, error } = await supabase
      .from("materiais")
      .select("id, nome, especialidade, link_1, tipo_1, tier")
      .eq("tipo_1", "PDF")
      .not("link_1", "is", null);

    if (error) return toast.error("Erro ao carregar aulas: " + error.message);

    const sortingFn = (a: any, b: any) => {
      const getNum = (s: string) => {
        const match = s.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : Infinity;
      };
      
      const numA = getNum(a.nome);
      const numB = getNum(b.nome);
      
      if (numA !== numB) return numA - numB;
      return a.nome.localeCompare(b.nome);
    };

    const list: Aula[] = (data || []).sort(sortingFn).map((m: any) => ({
      id: m.id,
      nome: m.nome,
      especialidade: m.especialidade as Especialidade,
      link_aula: m.link_1,
      tier: m.tier || 3,
    }));
    setAulas(list);
  }

  async function loadPrompt() {
    const { data } = await supabase
      .from("ia_prompts" as any).select("*").eq("chave", "gerar_oqs_aula").maybeSingle();
    if (data) {
      setPrompt((data as any).prompt);
      setPromptOriginal((data as any).prompt);
      setModelo((data as any).modelo_padrao || "google/gemini-2.5-flash");
    }
  }

  async function loadStats() {
    const { data, error } = await supabase.rpc("aulas_stats" as any);
    if (!error) setStats((data as any) || []);
  }

  async function loadTemp() {
    if (!user) return;
    const { data } = await supabase
      .from("temp_oqs").select("*").eq("user_id", user.id)
      .not("aula_id", "is", null)
      .order("created_at", { ascending: false });
    setTempOQs((data as any) || []);
  }

  async function savePrompt() {
    setLoading(true);
    const { error } = await supabase
      .from("ia_prompts" as any)
      .update({ prompt, modelo_padrao: modelo, atualizado_em: new Date().toISOString(), atualizado_por: user?.id })
      .eq("chave", "gerar_oqs_aula");
    setLoading(false);
    if (error) return toast.error("Erro ao salvar prompt: " + error.message);
    setPromptOriginal(prompt);
    toast.success("Prompt e modelo salvos.");
  }

  async function gerar() {
    if (!selectedAulaId) return toast.error("Selecione uma aula.");
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-oqs-aula", {
        body: {
          material_id: selectedAulaId,
          modelo,
          prompt_override: prompt !== promptOriginal ? prompt : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${data.questions?.length || 0} OQs gerados! Revise abaixo.`);
      loadTemp();
    } catch (e: any) {
      toast.error("Falha ao gerar: " + (e.message || e));
    } finally {
      setGenerating(false);
    }
  }

  async function approveOQ(q: TempOQ) {
    try {
      const isOQFalta = q.modo === "oq_falta";
      const isABCDE = q.modo === "abcde";
      let gabarito = q.resposta;
      if (isABCDE) {
        const opts = Array.isArray(q.opcoes) ? q.opcoes : [];
        const idx = opts.findIndex(o => String(o).trim().toLowerCase() === String(q.resposta).trim().toLowerCase());
        gabarito = idx !== -1 ? ["A", "B", "C", "D", "E"][idx] : String(q.resposta || "A").trim().toUpperCase().slice(0, 1);
      }
      const { error } = await supabase.from("cards").insert([{
        modo: q.modo as Modo,
        especialidade: q.especialidade as Especialidade,
        comando: q.pergunta,
        alternativa_correta: isABCDE ? gabarito : null,
        alternativa_a: Array.isArray(q.opcoes) ? q.opcoes[0] || null : null,
        alternativa_b: Array.isArray(q.opcoes) ? q.opcoes[1] || null : null,
        alternativa_c: Array.isArray(q.opcoes) ? q.opcoes[2] || null : null,
        alternativa_d: Array.isArray(q.opcoes) ? q.opcoes[3] || null : null,
        alternativa_e: Array.isArray(q.opcoes) ? q.opcoes[4] || null : null,
        info_1: !isABCDE ? q.resposta : null,
        var_1: !isABCDE ? q.variacoes : null,
        info_2: isOQFalta && Array.isArray(q.opcoes) ? q.opcoes[0] || null : null,
        info_3: isOQFalta && Array.isArray(q.opcoes) ? q.opcoes[1] || null : null,
        info_4: isOQFalta && Array.isArray(q.opcoes) ? q.opcoes[2] || null : null,
        info_5: isOQFalta && Array.isArray(q.opcoes) ? q.opcoes[3] || null : null,
        explicacao: q.explicacao || "Gerado por IA a partir de aula.",
        verificado: true,
        origem: "admin",
        aula_id: q.aula_id,
      } as any]);
      if (error) throw error;
      await supabase.from("temp_oqs").delete().eq("id", q.id);
      setTempOQs(prev => prev.filter(x => x.id !== q.id));
      toast.success("OQ aprovado e vinculado à aula.");
      loadStats();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  }

  async function discardOQ(id: string) {
    await supabase.from("temp_oqs").delete().eq("id", id);
    setTempOQs(prev => prev.filter(x => x.id !== id));
  }

  async function saveEditOQ() {
    if (!editingOQ) return;
    const { error } = await supabase.from("temp_oqs")
      .update({
        pergunta: editingOQ.pergunta,
        resposta: editingOQ.resposta,
        variacoes: editingOQ.variacoes,
        modo: editingOQ.modo,
        opcoes: editingOQ.opcoes,
        explicacao: editingOQ.explicacao,
      })
      .eq("id", editingOQ.id);
    if (error) return toast.error("Erro: " + error.message);
    setTempOQs(prev => prev.map(q => q.id === editingOQ.id ? editingOQ : q));
    setEditingOQ(null);
    toast.success("OQ atualizado.");
  }

  if (!isAdmin) {
    return <div className="p-12 text-center text-muted-foreground">Acesso restrito.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 pb-32 space-y-8">
      <header>
        <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-accent" />
          Gerar OQs a partir de Aulas
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Painel exclusivo de administrador. Cada OQ aprovado fica vinculado à aula que o originou.
        </p>
      </header>

      <Tabs defaultValue="gerar" className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-xl">
          <TabsTrigger value="gerar" className="text-xs font-bold">Gerar</TabsTrigger>
          <TabsTrigger value="aulas" className="text-xs font-bold">Aulas</TabsTrigger>
          <TabsTrigger value="prompt" className="text-xs font-bold">Prompt & Modelo</TabsTrigger>
          <TabsTrigger value="stats" className="text-xs font-bold">Estatísticas</TabsTrigger>
        </TabsList>

        {/* === GERAR === */}
        <TabsContent value="gerar" className="space-y-6 mt-6">
          <Card className="p-6 space-y-4">
            <h2 className="font-bold flex items-center gap-2"><Sparkles className="h-4 w-4" /> Geração</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Aula</Label>
                <Select value={selectedAulaId} onValueChange={setSelectedAulaId}>
                  <SelectTrigger><SelectValue placeholder="Escolha uma aula" /></SelectTrigger>
                  <SelectContent>
                    {aulas.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.nome} — {ESPECIALIDADE_LABEL[a.especialidade]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Modelo de IA</Label>
                <Select value={modelo} onValueChange={setModelo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODELS.map(m => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={gerar} disabled={generating || !selectedAulaId} className="w-full h-12 font-black tracking-wide">
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {generating ? "Gerando..." : "Gerar OQs"}
            </Button>
          </Card>

          <Card className="p-6 space-y-3">
            <h2 className="font-bold flex items-center gap-2">
              <FileText className="h-4 w-4" /> Revisão ({tempOQs.length})
            </h2>
            {tempOQs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum OQ pendente vinculado a aulas.</p>
            ) : tempOQs.map(q => {
              const aula = aulas.find(a => a.id === q.aula_id);
              return (
                <div key={q.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-black uppercase tracking-widest text-accent">
                      {q.modo} • {aula?.nome || "Aula"}{q.modelo_ia ? ` • ${q.modelo_ia}` : ""}
                    </div>
                    <div className="font-bold text-sm truncate">{q.pergunta}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      Gabarito: <span className="text-emerald-500 font-bold">{q.resposta}</span>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setEditingOQ(q)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => discardOQ(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  <Button size="icon" onClick={() => approveOQ(q)}><CheckCircle2 className="h-4 w-4" /></Button>
                </div>
              );
            })}
          </Card>
        </TabsContent>

        {/* === AULAS === */}
        <TabsContent value="aulas" className="space-y-4 mt-6">
          <Card className="p-4 bg-muted/20 border-dashed">
            <p className="text-xs text-muted-foreground">
              As aulas vêm automaticamente dos <strong>resumos em PDF</strong> cadastrados em Materiais.
              Áudio-aulas são ignoradas. Para adicionar/editar, vá em Materiais.
            </p>
          </Card>

          <div className="grid gap-3">
            {aulas.length === 0 && <p className="p-12 text-center text-sm text-muted-foreground bg-muted/10 rounded-xl">Nenhuma aula com PDF disponível.</p>}
            {aulas.map(a => {
              const stat = stats.find(s => s.aula_id === a.id);
              
              const tierInfo = (t: number) => {
                switch (t) {
                  case 1: return { label: "Alta Incidência", color: "text-red-500", bg: "bg-red-500/10", icon: <Flame className="h-3 w-3" />, border: "border-red-500/30" };
                  case 2: return { label: "Média", color: "text-amber-500", bg: "bg-amber-500/10", icon: <Zap className="h-3 w-3" />, border: "border-amber-500/20" };
                  default: return { label: "Baixa", color: "text-blue-500", bg: "bg-blue-500/10", icon: <Clock className="h-3 w-3" />, border: "border-blue-500/10" };
                }
              };
              const t = tierInfo(a.tier);

              return (
                <div 
                  key={a.id} 
                  className={cn(
                    "group flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-2xl border transition-all duration-300",
                    selectedAulaId === a.id ? "bg-accent/5 border-accent ring-1 ring-accent/20" : "bg-card hover:bg-muted/30 border-border/40",
                    t.border
                  )}
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={cn("text-[9px] uppercase font-black px-1.5 h-5 flex items-center gap-1", t.bg, t.color, t.border)}>
                        {t.icon} {t.label}
                      </Badge>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {ESPECIALIDADE_LABEL[a.especialidade]}
                      </span>
                    </div>
                    
                    <div className="font-bold text-base tracking-tight leading-tight">{a.nome}</div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full text-[10px] font-black border border-emerald-500/20">
                        TOTAL: {stat?.total || 0}
                      </div>
                      <div className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full text-[10px] font-black border border-indigo-500/20">
                        ABCDE: {stat?.abcde || 0}
                      </div>
                      <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full text-[10px] font-black border border-orange-500/20">
                        LACUNA: {stat?.lacuna || 0}
                      </div>
                      <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full text-[10px] font-black border border-rose-500/20">
                        OQ FALTA: {stat?.oq_falta || 0}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-border/40">
                    {a.link_aula && (
                      <Button size="sm" variant="outline" asChild className="h-9 gap-2 font-bold text-xs flex-1 md:flex-none">
                        <a href={a.link_aula} target="_blank" rel="noreferrer">
                          <FileDown className="h-3.5 w-3.5" /> PDF
                        </a>
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      onClick={() => setSelectedAulaId(a.id)} 
                      variant={selectedAulaId === a.id ? "default" : "secondary"}
                      className={cn("h-9 font-black text-xs gap-2 flex-1 md:flex-none px-4", selectedAulaId === a.id ? "bg-accent text-white" : "")}
                    >
                      {selectedAulaId === a.id ? <CheckCircle2 className="h-3.5 w-3.5" /> : <MousePointer2 className="h-3.5 w-3.5" />}
                      {selectedAulaId === a.id ? "Selecionada" : "Selecionar"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* === PROMPT === */}
        <TabsContent value="prompt" className="mt-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Configurações Sidebar */}
            <div className="w-full lg:w-72 space-y-6 shrink-0">
              <Card className="p-6 space-y-6">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-accent" /> Configurações da IA
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Modelo de IA Padrão</Label>
                      <Select value={modelo} onValueChange={setModelo}>
                        <SelectTrigger className="h-10 bg-muted/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODELS.map(m => (
                            <SelectItem key={m.v} value={m.v} className="text-xs">{m.l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground leading-tight italic">
                        Este modelo será o selecionado por padrão na aba de geração.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border/60 space-y-3">
                  <Button 
                    onClick={savePrompt} 
                    disabled={loading || prompt === promptOriginal && modelo === promptOriginal} 
                    className="w-full h-11 font-black bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20 gap-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    SALVAR ALTERAÇÕES
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPrompt(promptOriginal)} 
                    className="w-full h-9 text-[10px] font-bold border-dashed hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30 gap-2"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> REVERTER ALTERAÇÕES
                  </Button>
                </div>
              </Card>

              <div className="p-5 rounded-2xl bg-accent/5 border border-accent/10 space-y-3">
                <h4 className="text-[10px] font-black uppercase text-accent tracking-widest flex items-center gap-2">
                  <Sparkles className="h-3 w-3" /> Instruções
                </h4>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  O **System Prompt** define o comportamento da IA. Ele instrui o modelo sobre como ler o PDF da aula e formatar os OQs (ABCDE, Lacuna ou OQ Falta).
                </p>
                <div className="text-[10px] bg-white/50 dark:bg-black/20 p-2 rounded-lg font-mono text-accent">
                  Chave: gerar_oqs_aula
                </div>
              </div>
            </div>

            {/* Editor de Prompt Main */}
            <div className="flex-1 min-w-0">
              <Card className="overflow-hidden border-accent/20 flex flex-col h-full min-h-[600px] shadow-xl shadow-black/5">
                <div className="bg-muted/50 dark:bg-muted/20 px-5 py-3 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Editor de Prompt do Sistema</span>
                  </div>
                  <Badge variant="secondary" className="text-[9px] font-mono px-2 py-0">
                    MODO: {modelo.includes('flash') ? 'FAST' : 'PRO'}
                  </Badge>
                </div>
                <div className="relative flex-1 group">
                  <Textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    className="absolute inset-0 w-full h-full resize-none border-0 focus-visible:ring-0 rounded-none font-mono text-sm leading-relaxed p-8 bg-transparent scrollbar-thin"
                    placeholder="Digite as instruções da IA aqui..."
                  />
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* === STATS === */}
        <TabsContent value="stats" className="space-y-4 mt-6">
          <Card className="p-6">
            <h2 className="font-bold flex items-center gap-2 mb-4"><BarChart3 className="h-4 w-4" /> OQs por aula</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2">Aula</th>
                    <th className="text-left py-2">Especialidade</th>
                    <th className="text-right py-2">Total</th>
                    <th className="text-right py-2">ABCDE</th>
                    <th className="text-right py-2">Lacuna</th>
                    <th className="text-right py-2">OQ Falta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {stats.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Sem dados.</td></tr>}
                  {stats.map(s => (
                    <tr key={s.aula_id}>
                      <td className="py-3 font-bold">{s.nome}</td>
                      <td className="py-3 text-muted-foreground">{ESPECIALIDADE_LABEL[s.especialidade as Especialidade]}</td>
                      <td className="py-3 text-right font-bold">{s.total}</td>
                      <td className="py-3 text-right">{s.abcde}</td>
                      <td className="py-3 text-right">{s.lacuna}</td>
                      <td className="py-3 text-right">{s.oq_falta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>



      {/* Dialog OQ */}
      <Dialog open={!!editingOQ} onOpenChange={(o) => !o && setEditingOQ(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-accent" />
              Editar OQ Gerado
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {editingOQ && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Pergunta / Comando</Label>
                  <Textarea 
                    value={editingOQ.pergunta} 
                    onChange={e => setEditingOQ({ ...editingOQ, pergunta: e.target.value })} 
                    className="min-h-[120px] text-sm leading-relaxed" 
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Gabarito / Resposta Correta</Label>
                    <Input 
                      value={editingOQ.resposta} 
                      onChange={e => setEditingOQ({ ...editingOQ, resposta: e.target.value })} 
                      className="bg-accent/5 border-accent/20 font-bold"
                    />
                  </div>
                  {editingOQ.modo !== "abcde" && (
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Variações Aceitas</Label>
                      <Input 
                        value={editingOQ.variacoes || ""} 
                        onChange={e => setEditingOQ({ ...editingOQ, variacoes: e.target.value })} 
                        placeholder="separadas por vírgula"
                      />
                    </div>
                  )}
                </div>

                {editingOQ.modo === "abcde" && (
                  <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/40">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Alternativas (Distratores)</Label>
                    <div className="space-y-2">
                      {["A", "B", "C", "D", "E"].map((L, i) => (
                        <div key={L} className="flex gap-3 items-center">
                          <span className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border",
                            editingOQ.resposta.toUpperCase() === L || (i === ["A", "B", "C", "D", "E"].indexOf(editingOQ.resposta.toUpperCase()))
                              ? "bg-emerald-500 text-white border-emerald-600"
                              : "bg-background border-border"
                          )}>
                            {L}
                          </span>
                          <Input
                            value={Array.isArray(editingOQ.opcoes) ? editingOQ.opcoes[i] || "" : ""}
                            onChange={e => {
                              const arr = Array.isArray(editingOQ.opcoes) ? [...editingOQ.opcoes] : ["", "", "", "", ""];
                              arr[i] = e.target.value;
                              setEditingOQ({ ...editingOQ, opcoes: arr });
                            }}
                            className="h-9 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Explicação Detalhada</Label>
                  <Textarea 
                    value={editingOQ.explicacao || ""} 
                    onChange={e => setEditingOQ({ ...editingOQ, explicacao: e.target.value })} 
                    className="min-h-[140px] text-sm leading-relaxed" 
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/20 gap-3">
            <Button variant="ghost" onClick={() => setEditingOQ(null)} className="font-bold">Cancelar</Button>
            <Button onClick={saveEditOQ} className="bg-accent hover:bg-accent/90 px-8 font-black">SALVAR ALTERAÇÕES</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
