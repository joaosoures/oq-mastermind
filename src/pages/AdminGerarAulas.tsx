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
} from "lucide-react";
import { ESPECIALIDADE_LABEL, Especialidade, Modo } from "@/lib/oq";

type Aula = {
  id: string;
  nome: string;
  especialidade: Especialidade;
  link_aula: string | null;
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
      .select("id, nome, especialidade, link_1, tipo_1")
      .eq("tipo_1", "PDF")
      .not("link_1", "is", null)
      .order("nome");
    if (error) return toast.error("Erro ao carregar aulas: " + error.message);
    const list: Aula[] = (data || []).map((m: any) => ({
      id: m.id,
      nome: m.nome,
      especialidade: m.especialidade as Especialidade,
      link_aula: m.link_1,
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

  async function saveAula() {
    if (!editingAula) return;
    if (!editingAula.nome.trim()) return toast.error("Nome obrigatório.");
    setLoading(true);
    const payload = {
      nome: editingAula.nome,
      especialidade: editingAula.especialidade,
      conteudo: editingAula.conteudo,
      link_aula: editingAula.link_aula,
      descricao: editingAula.descricao,
    };
    const op = editingAula.id
      ? supabase.from("aulas" as any).update(payload).eq("id", editingAula.id)
      : supabase.from("aulas" as any).insert(payload);
    const { error } = await op;
    setLoading(false);
    if (error) return toast.error("Erro: " + error.message);
    toast.success("Aula salva.");
    setEditingAula(null);
    loadAulas();
    loadStats();
  }

  async function deleteAula(id: string) {
    if (!confirm("Excluir esta aula? Os OQs já criados a partir dela permanecem, mas perderão o vínculo.")) return;
    const { error } = await supabase.from("aulas" as any).delete().eq("id", id);
    if (error) return toast.error("Erro: " + error.message);
    toast.success("Aula excluída.");
    loadAulas();
    loadStats();
  }

  async function gerar() {
    if (!selectedAulaId) return toast.error("Selecione uma aula.");
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-oqs-aula", {
        body: {
          aula_id: selectedAulaId,
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
          <div className="flex justify-end">
            <Button onClick={() => setEditingAula({ id: "", nome: "", especialidade: "clinica_medica", conteudo: "", link_aula: "", descricao: "" })}>
              <Plus className="h-4 w-4 mr-2" /> Nova aula
            </Button>
          </div>
          <Card className="divide-y divide-border/40">
            {aulas.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma aula cadastrada.</p>}
            {aulas.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="font-bold">{a.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {ESPECIALIDADE_LABEL[a.especialidade]} • {a.conteudo.length} caracteres
                    {a.link_aula ? " • " : ""}{a.link_aula && <a href={a.link_aula} target="_blank" rel="noreferrer" className="text-accent underline">link</a>}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setEditingAula(a)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => deleteAula(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </Card>
        </TabsContent>

        {/* === PROMPT === */}
        <TabsContent value="prompt" className="space-y-4 mt-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Prompt do sistema (gerar_oqs_aula)</h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPrompt(promptOriginal)}>
                  <RotateCcw className="h-3 w-3 mr-1" /> Reverter
                </Button>
                <Button size="sm" onClick={savePrompt} disabled={loading}>
                  <Save className="h-3 w-3 mr-1" /> Salvar
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Modelo padrão</Label>
              <Select value={modelo} onValueChange={setModelo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODELS.map(m => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              className="min-h-[500px] font-mono text-xs"
              placeholder="System prompt..."
            />
          </Card>
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

      {/* Dialog Aula */}
      <Dialog open={!!editingAula} onOpenChange={(o) => !o && setEditingAula(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingAula?.id ? "Editar aula" : "Nova aula"}</DialogTitle></DialogHeader>
          {editingAula && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input value={editingAula.nome} onChange={e => setEditingAula({ ...editingAula, nome: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Especialidade</Label>
                  <Select value={editingAula.especialidade} onValueChange={(v) => setEditingAula({ ...editingAula, especialidade: v as Especialidade })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ESPECIALIDADE_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Link da aula (opcional)</Label>
                  <Input value={editingAula.link_aula || ""} onChange={e => setEditingAula({ ...editingAula, link_aula: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Descrição (opcional)</Label>
                <Input value={editingAula.descricao || ""} onChange={e => setEditingAula({ ...editingAula, descricao: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Conteúdo / transcrição</Label>
                <Textarea
                  value={editingAula.conteudo}
                  onChange={e => setEditingAula({ ...editingAula, conteudo: e.target.value })}
                  className="min-h-[300px] text-xs"
                  placeholder="Cole aqui a transcrição ou resumo da aula. Esse texto alimenta a IA."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingAula(null)}>Cancelar</Button>
            <Button onClick={saveAula} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog OQ */}
      <Dialog open={!!editingOQ} onOpenChange={(o) => !o && setEditingOQ(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Editar OQ</DialogTitle></DialogHeader>
          {editingOQ && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Pergunta</Label>
                <Textarea value={editingOQ.pergunta} onChange={e => setEditingOQ({ ...editingOQ, pergunta: e.target.value })} className="min-h-[100px]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Resposta</Label>
                  <Input value={editingOQ.resposta} onChange={e => setEditingOQ({ ...editingOQ, resposta: e.target.value })} />
                </div>
                {editingOQ.modo !== "abcde" && (
                  <div className="space-y-1">
                    <Label>Variações</Label>
                    <Input value={editingOQ.variacoes || ""} onChange={e => setEditingOQ({ ...editingOQ, variacoes: e.target.value })} />
                  </div>
                )}
              </div>
              {editingOQ.modo === "abcde" && (
                <div className="space-y-2">
                  <Label>Alternativas</Label>
                  {["A", "B", "C", "D", "E"].map((L, i) => (
                    <div key={L} className="flex gap-2 items-center">
                      <span className="w-6 font-bold">{L}</span>
                      <Input
                        value={Array.isArray(editingOQ.opcoes) ? editingOQ.opcoes[i] || "" : ""}
                        onChange={e => {
                          const arr = Array.isArray(editingOQ.opcoes) ? [...editingOQ.opcoes] : ["", "", "", "", ""];
                          arr[i] = e.target.value;
                          setEditingOQ({ ...editingOQ, opcoes: arr });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-1">
                <Label>Explicação</Label>
                <Textarea value={editingOQ.explicacao || ""} onChange={e => setEditingOQ({ ...editingOQ, explicacao: e.target.value })} className="min-h-[120px]" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingOQ(null)}>Cancelar</Button>
            <Button onClick={saveEditOQ}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
