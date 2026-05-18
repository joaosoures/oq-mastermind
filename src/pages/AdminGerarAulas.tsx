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
import { Switch } from "@/components/ui/switch";
import {
  GraduationCap, Sparkles, Save, RotateCcw,
  Loader2, CheckCircle2, FileText, BarChart3, ExternalLink, Pencil, Trash2,
  Flame, Zap, Clock, FileDown, MousePointer2, Map, Filter, ChevronRight, AlertTriangle
} from "lucide-react";
import { ESPECIALIDADE_LABEL, Especialidade, Modo } from "@/lib/oq";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Aula = { id: string; nome: string; especialidade: Especialidade; link_aula: string | null; tier: number; };
type TempOQ = {
  id: string; pergunta: string; resposta: string; variacoes?: string; modo: string;
  especialidade: string; opcoes?: any; explicacao?: string; aula_id?: string | null;
  modelo_ia?: string | null; etapa_filtro_status?: string | null; etapa_filtro_motivo?: string | null;
};
type AulaStat = { aula_id: string; nome: string; especialidade: string; total: number; abcde: number; lacuna: number; oq_falta: number; };

const MODELS = [
  { v: "google/gemini-2.5-pro", l: "Gemini 2.5 Pro (PDF + raciocínio)" },
  { v: "google/gemini-2.5-flash", l: "Gemini 2.5 Flash (rápido)" },
  { v: "google/gemini-2.5-flash-lite", l: "Gemini 2.5 Flash Lite (barato)" },
  { v: "openai/gpt-5", l: "GPT-5 (malícia + explicação)" },
  { v: "openai/gpt-5-mini", l: "GPT-5 Mini" },
  { v: "openai/gpt-5-nano", l: "GPT-5 Nano" },
];

const PROMPT_KEYS = [
  { k: "triagem_aula", label: "1. Triagem (mapa)", defaultModel: "google/gemini-2.5-pro", desc: "Lê o PDF e classifica cada informação cobrável." },
  { k: "gerar_lacuna", label: "2a. Lacuna", defaultModel: "google/gemini-2.5-flash", desc: "Gera questões de termo único." },
  { k: "gerar_oq_falta", label: "2b. OQ Falta", defaultModel: "google/gemini-2.5-flash", desc: "Tríades, scores e padrões." },
  { k: "gerar_abcde", label: "2c. ABCDE", defaultModel: "openai/gpt-5", desc: "Casos com semiologia descritiva e malícia de banca." },
  { k: "filtro_solubilidade", label: "3. Filtro", defaultModel: "openai/gpt-5", desc: "Resolve cada OQ contra o PDF e aprova/poda/descarta." },
];

type PromptCfg = { prompt: string; modelo: string; original_prompt: string; original_modelo: string; };

export default function AdminGerarAulas() {
  const { user, isAdmin } = useAuth();
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [stats, setStats] = useState<AulaStat[]>([]);
  const [tempOQs, setTempOQs] = useState<TempOQ[]>([]);
  const [selectedAulaId, setSelectedAulaId] = useState<string>("");

  const [prompts, setPrompts] = useState<Record<string, PromptCfg>>({});
  const [promptTab, setPromptTab] = useState("triagem_aula");
  const [savingPrompt, setSavingPrompt] = useState(false);

  const [triagemLoading, setTriagemLoading] = useState(false);
  const [mapa, setMapa] = useState<any>(null);
  const [triagemId, setTriagemId] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [rodarFiltro, setRodarFiltro] = useState(true);

  const [editingOQ, setEditingOQ] = useState<TempOQ | null>(null);

  useEffect(() => {
    document.title = "Gerar OQs a partir de Aulas";
    loadAll();
  }, [isAdmin]);

  async function loadAll() {
    const tasks = [loadAulas(), loadPrompts(), loadTemp()];
    if (isAdmin) tasks.push(loadStats());
    await Promise.all(tasks);
  }

  async function loadAulas() {
    const { data, error } = await supabase
      .from("materiais")
      .select("id, nome, especialidade, link_1, tipo_1, tier")
      .eq("tipo_1", "PDF").not("link_1", "is", null);
    if (error) return toast.error("Erro: " + error.message);
    const sortFn = (a: any, b: any) => {
      const getNum = (s: string) => { const m = s.match(/^(\d+)/); return m ? parseInt(m[1], 10) : Infinity; };
      const nA = getNum(a.nome), nB = getNum(b.nome);
      if (nA !== nB) return nA - nB;
      return a.nome.localeCompare(b.nome);
    };
    setAulas((data || []).sort(sortFn).map((m: any) => ({
      id: m.id, nome: m.nome, especialidade: m.especialidade as Especialidade,
      link_aula: m.link_1, tier: m.tier || 3,
    })));
  }

  async function loadPrompts() {
    const { data } = await supabase.from("ia_prompts" as any).select("*").in("chave", PROMPT_KEYS.map(p => p.k));
    const map: Record<string, PromptCfg> = {};
    PROMPT_KEYS.forEach(pk => {
      const row = (data as any[])?.find(r => r.chave === pk.k);
      const p = row?.prompt || "";
      const m = row?.modelo_padrao || pk.defaultModel;
      map[pk.k] = { prompt: p, modelo: m, original_prompt: p, original_modelo: m };
    });
    setPrompts(map);
  }

  async function loadStats() {
    const { data } = await supabase.rpc("aulas_stats" as any);
    if (data) setStats(data as any);
  }

  async function loadTemp() {
    if (!user) return;
    const { data } = await supabase.from("temp_oqs").select("*").eq("user_id", user.id)
      .not("aula_id", "is", null).order("created_at", { ascending: false });
    setTempOQs((data as any) || []);
  }

  async function savePrompt(chave: string) {
    setSavingPrompt(true);
    const p = prompts[chave];
    const { error } = await supabase.from("ia_prompts" as any)
      .update({ prompt: p.prompt, modelo_padrao: p.modelo, atualizado_em: new Date().toISOString(), atualizado_por: user?.id })
      .eq("chave", chave);
    setSavingPrompt(false);
    if (error) return toast.error("Erro: " + error.message);
    setPrompts(prev => ({ ...prev, [chave]: { ...p, original_prompt: p.prompt, original_modelo: p.modelo } }));
    toast.success("Prompt salvo.");
  }

  function updatePrompt(chave: string, patch: Partial<PromptCfg>) {
    setPrompts(prev => ({ ...prev, [chave]: { ...prev[chave], ...patch } }));
  }

  async function fazerTriagem() {
    if (!selectedAulaId) return toast.error("Selecione uma aula.");
    setTriagemLoading(true);
    setMapa(null); setTriagemId(null);
    try {
      const triagemCfg = prompts.triagem_aula;
      const { data, error } = await supabase.functions.invoke("triagem-aula", {
        body: {
          material_id: selectedAulaId,
          modelo_override: triagemCfg.modelo !== triagemCfg.original_modelo ? triagemCfg.modelo : undefined,
          prompt_override: triagemCfg.prompt !== triagemCfg.original_prompt ? triagemCfg.prompt : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const tid = data.triagem_id;
      setTriagemId(tid);
      toast.info("Triagem iniciada — processando PDF…");

      // Polling: a IA roda em background no edge function. Esperamos até 5 min.
      const started = Date.now();
      const maxMs = 5 * 60 * 1000;
      while (Date.now() - started < maxMs) {
        await new Promise(r => setTimeout(r, 3000));
        const { data: row } = await supabase
          .from("triagens_aula" as any)
          .select("mapa_json,status")
          .eq("id", tid)
          .maybeSingle();
        const m: any = (row as any)?.mapa_json;
        if (!m || m.processando) continue;
        if (m.error) throw new Error(m.error);
        if (Array.isArray(m.pontos)) {
          setMapa(m);
          toast.success(`Triagem concluída: ${m.pontos.length} pontos.`);
          return;
        }
      }
      throw new Error("Tempo esgotado aguardando a triagem.");
    } catch (e: any) {
      toast.error("Falha na triagem: " + (e.message || e));
    } finally { setTriagemLoading(false); }
  }

  async function gerarOQs() {
    if (!triagemId) return toast.error("Faça a triagem primeiro.");
    setGerando(true);
    try {
      const overridesP: any = {}, overridesM: any = {};
      ["gerar_lacuna", "gerar_oq_falta", "gerar_abcde", "filtro_solubilidade"].forEach(k => {
        const p = prompts[k];
        if (p.prompt !== p.original_prompt) overridesP[k] = p.prompt;
        if (p.modelo !== p.original_modelo) overridesM[k] = p.modelo;
      });
      const { data, error } = await supabase.functions.invoke("gerar-oqs-aula", {
        body: {
          triagem_id: triagemId,
          rodar_filtro: rodarFiltro,
          prompts_override: Object.keys(overridesP).length ? overridesP : undefined,
          modelos_override: Object.keys(overridesM).length ? overridesM : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${data.total} OQs gerados (${data.descartados} descartados pelo filtro).`);
      setMapa(null); setTriagemId(null);
      loadTemp();
    } catch (e: any) {
      toast.error("Falha: " + (e.message || e));
    } finally { setGerando(false); }
  }

  async function approveOQ(q: TempOQ) {
    try {
      const isOQFalta = q.modo === "oq_falta";
      const isABCDE = q.modo === "abcde";
      const isLacuna = q.modo === "lacuna";

      // ABCDE: opcoes vêm como [{letra, texto}] ou [string]; resposta já normalizada como letra
      const abcdeOpts: string[] = isABCDE && Array.isArray(q.opcoes)
        ? (q.opcoes as any[]).map(o => typeof o === "string" ? o : (o?.texto || o?.opcao || ""))
        : [];
      let gabaritoLetra = String(q.resposta || "").trim().toUpperCase();
      if (isABCDE && !/^[A-E]$/.test(gabaritoLetra)) {
        const idx = abcdeOpts.findIndex(o => o.trim().toLowerCase() === String(q.resposta).trim().toLowerCase());
        gabaritoLetra = idx >= 0 ? ["A","B","C","D","E"][idx] : "A";
      }

      // OQ Falta: opcoes = [{info, variacoes}, ...] → info_1..5 / var_1..5
      const itens: any[] = isOQFalta && Array.isArray(q.opcoes) ? q.opcoes : [];
      const getItem = (i: number) => itens[i] || null;

      const { error } = await supabase.from("cards").insert([{
        modo: q.modo as Modo,
        especialidade: q.especialidade as Especialidade,
        comando: q.pergunta,
        alternativa_correta: isABCDE ? gabaritoLetra : null,
        alternativa_a: isABCDE ? (abcdeOpts[0] || null) : null,
        alternativa_b: isABCDE ? (abcdeOpts[1] || null) : null,
        alternativa_c: isABCDE ? (abcdeOpts[2] || null) : null,
        alternativa_d: isABCDE ? (abcdeOpts[3] || null) : null,
        alternativa_e: isABCDE ? (abcdeOpts[4] || null) : null,
        // Lacuna: info_1 = resposta, var_1 = variações
        // OQ Falta: info_1..5 = lista de itens (runtime sorteia qual omitir)
        info_1: isOQFalta ? (getItem(0)?.info ?? null) : (isLacuna ? q.resposta : null),
        var_1:  isOQFalta ? (getItem(0)?.variacoes ?? null) : (isLacuna ? (q.variacoes ?? null) : null),
        info_2: isOQFalta ? (getItem(1)?.info ?? null) : null,
        var_2:  isOQFalta ? (getItem(1)?.variacoes ?? null) : null,
        info_3: isOQFalta ? (getItem(2)?.info ?? null) : null,
        var_3:  isOQFalta ? (getItem(2)?.variacoes ?? null) : null,
        info_4: isOQFalta ? (getItem(3)?.info ?? null) : null,
        var_4:  isOQFalta ? (getItem(3)?.variacoes ?? null) : null,
        info_5: isOQFalta ? (getItem(4)?.info ?? null) : null,
        var_5:  isOQFalta ? (getItem(4)?.variacoes ?? null) : null,
        explicacao: q.explicacao || "Gerado por IA.",
        verificado: true, origem: "admin", aula_id: q.aula_id,
      } as any]);
      if (error) throw error;
      await supabase.from("temp_oqs").delete().eq("id", q.id);
      setTempOQs(prev => prev.filter(x => x.id !== q.id));
      toast.success("OQ aprovado.");
      loadStats();
    } catch (e: any) { toast.error("Erro: " + e.message); }
  }

  async function discardOQ(id: string) {
    await supabase.from("temp_oqs").delete().eq("id", id);
    setTempOQs(prev => prev.filter(x => x.id !== id));
  }

  async function saveEditOQ() {
    if (!editingOQ) return;
    const { error } = await supabase.from("temp_oqs").update({
      pergunta: editingOQ.pergunta, resposta: editingOQ.resposta, variacoes: editingOQ.variacoes,
      modo: editingOQ.modo, opcoes: editingOQ.opcoes, explicacao: editingOQ.explicacao,
    }).eq("id", editingOQ.id);
    if (error) return toast.error("Erro: " + error.message);
    setTempOQs(prev => prev.map(q => q.id === editingOQ.id ? editingOQ : q));
    setEditingOQ(null);
    toast.success("OQ atualizado.");
  }

  if (!isAdmin) return <div className="p-12 text-center text-muted-foreground">Acesso restrito.</div>;

  const selectedAula = aulas.find(a => a.id === selectedAulaId);
  const currentPrompt = prompts[promptTab];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 pb-32 space-y-8">
      <header>
        <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-accent" />
          Gerar OQs a partir de Aulas
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Pipeline em 3 etapas: <strong>Triagem</strong> (mapa pedagógico) → <strong>Geração</strong> por modo em paralelo → <strong>Filtro</strong> de solubilidade.
        </p>
      </header>

      <Tabs defaultValue="gerar" className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-xl">
          <TabsTrigger value="gerar" className="text-xs font-bold">Gerar</TabsTrigger>
          <TabsTrigger value="aulas" className="text-xs font-bold">Aulas</TabsTrigger>
          <TabsTrigger value="prompt" className="text-xs font-bold">Prompts & Modelos</TabsTrigger>
          <TabsTrigger value="stats" className="text-xs font-bold">Estatísticas</TabsTrigger>
        </TabsList>

        {/* === GERAR === */}
        <TabsContent value="gerar" className="space-y-6 mt-6">
          {/* Card de controle */}
          <Card className="p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Aula selecionada</Label>
                <div className="h-12 rounded-md bg-muted/30 border px-3 flex items-center text-sm font-bold">
                  {selectedAula ? selectedAula.nome : <span className="text-muted-foreground font-normal">Vá na aba "Aulas" e selecione uma.</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border">
                <Switch checked={rodarFiltro} onCheckedChange={setRodarFiltro} />
                <Label className="text-xs font-bold flex items-center gap-1.5"><Filter className="h-3 w-3" /> Filtro de solubilidade</Label>
              </div>
            </div>

            {/* Pipeline */}
            <div className="grid md:grid-cols-2 gap-3">
              <Button onClick={fazerTriagem} disabled={!selectedAulaId || triagemLoading || gerando} className="h-14 font-black tracking-wider" variant={mapa ? "outline" : "default"}>
                {triagemLoading ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> ANALISANDO PDF...</> :
                  <><Map className="h-5 w-5 mr-2" /> 1. FAZER TRIAGEM</>}
              </Button>
              <Button onClick={gerarOQs} disabled={!triagemId || gerando || triagemLoading} className="h-14 font-black tracking-wider bg-accent hover:bg-accent/90">
                {gerando ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> GERANDO (3 IAs EM PARALELO)...</> :
                  <><Sparkles className="h-5 w-5 mr-2" /> 2. GERAR OQS DO MAPA</>}
              </Button>
            </div>
          </Card>

          {/* MAPA PEDAGÓGICO */}
          {mapa && (
            <Card className="p-6 space-y-4 border-accent/30">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg flex items-center gap-2"><Map className="h-5 w-5 text-accent" /> Mapa Pedagógico</h3>
                <Badge className="bg-accent">{mapa.pontos?.length || 0} pontos</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {["lacuna", "oq_falta", "abcde"].map(m => {
                  const c = (mapa.pontos || []).filter((p: any) => p.modo_sugerido === m).length;
                  const colors: any = { lacuna: "bg-orange-500/10 text-orange-600 border-orange-500/30", oq_falta: "bg-rose-500/10 text-rose-600 border-rose-500/30", abcde: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30" };
                  return <div key={m} className={cn("rounded-lg border p-3", colors[m])}>
                    <div className="text-[10px] font-black uppercase tracking-widest">{m === "oq_falta" ? "OQ Falta" : m}</div>
                    <div className="text-2xl font-black">{c}</div>
                  </div>;
                })}
              </div>
              <details className="text-xs">
                <summary className="cursor-pointer font-bold text-muted-foreground hover:text-foreground">Ver JSON do mapa</summary>
                <pre className="mt-2 p-3 bg-muted/30 rounded-lg overflow-x-auto text-[10px] max-h-80">{JSON.stringify(mapa, null, 2)}</pre>
              </details>
              <p className="text-[11px] text-muted-foreground italic">Revise os pontos. Se algo estiver errado, refaça a triagem; senão, clique em "2. Gerar OQs".</p>
            </Card>
          )}

          {/* OQs PARA REVISÃO */}
          <div className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> OQs para Revisão ({tempOQs.length})
            </h2>
            {tempOQs.length === 0 ? (
              <Card className="p-12 border-dashed flex flex-col items-center text-center">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum OQ pendente.</p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {tempOQs.map(q => {
                  const aula = aulas.find(a => a.id === q.aula_id);
                  const fStatus = q.etapa_filtro_status;
                  const filtroBadge = fStatus === "reescrito" ? { c: "bg-amber-500/10 text-amber-600 border-amber-500/30", l: "REESCRITO" } :
                    fStatus === "aprovado" ? { c: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", l: "APROVADO" } :
                    null;
                  return (
                    <Card key={q.id} className="flex items-center gap-4 p-4 group">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 border-accent/20 text-accent">{q.modo}</Badge>
                          {filtroBadge && <Badge variant="outline" className={cn("text-[8px] font-black h-4 px-1.5", filtroBadge.c)}>{filtroBadge.l}</Badge>}
                          <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[200px]">{aula?.nome}</span>
                          {q.modelo_ia && <span className="text-[9px] text-muted-foreground/40 font-mono">{q.modelo_ia.split('/').pop()}</span>}
                        </div>
                        <div className="font-bold text-sm leading-snug">{q.pergunta}</div>
                        {q.modo === "oq_falta" && Array.isArray(q.opcoes) ? (
                          <ul className="text-[11px] text-muted-foreground space-y-0.5 mt-1">
                            {(q.opcoes as any[]).map((it, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-accent">•</span>
                                <span><span className="text-foreground font-semibold">{it?.info}</span>
                                  {it?.variacoes && <span className="text-muted-foreground/60"> — {it.variacoes}</span>}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : q.modo === "abcde" && Array.isArray(q.opcoes) ? (
                          <ul className="text-[11px] space-y-0.5 mt-1">
                            {(q.opcoes as any[]).map((o, i) => {
                              const letra = (typeof o === "object" && o?.letra) || ["A","B","C","D","E"][i];
                              const texto = typeof o === "string" ? o : (o?.texto || o?.opcao || "");
                              const isCorreta = String(q.resposta).trim().toUpperCase() === String(letra).toUpperCase();
                              return (
                                <li key={i} className={cn("flex gap-2", isCorreta && "text-emerald-600 font-semibold")}>
                                  <span className="font-mono w-4">{letra})</span>
                                  <span>{texto}</span>
                                  {isCorreta && <span className="text-[9px]">✓</span>}
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <div className="text-[11px] text-muted-foreground">Gabarito: <span className="text-emerald-500 font-black">{q.resposta}</span></div>
                        )}
                        {q.etapa_filtro_motivo && <div className="text-[10px] text-amber-600 italic">⚠ {q.etapa_filtro_motivo}</div>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditingOQ(q)} className="h-9 w-9"><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => discardOQ(q.id)} className="h-9 w-9 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        <Button size="icon" onClick={() => approveOQ(q)} className="h-9 w-9 bg-emerald-500 hover:bg-emerald-600"><CheckCircle2 className="h-4 w-4" /></Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* === AULAS === */}
        <TabsContent value="aulas" className="space-y-4 mt-6">
          <Card className="p-4 bg-muted/20 border-dashed">
            <p className="text-xs text-muted-foreground">
              Aulas vêm dos <strong>PDFs</strong> de Materiais. Áudios são ignorados.
            </p>
          </Card>
          <div className="grid gap-3">
            {aulas.map(a => {
              const stat = stats.find(s => s.aula_id === a.id);
              const tierInfo = (t: number) => t === 1 ? { l: "Alta", c: "text-red-500", b: "bg-red-500/10", i: <Flame className="h-3 w-3" />, br: "border-red-500/30" } :
                t === 2 ? { l: "Média", c: "text-amber-500", b: "bg-amber-500/10", i: <Zap className="h-3 w-3" />, br: "border-amber-500/20" } :
                { l: "Baixa", c: "text-blue-500", b: "bg-blue-500/10", i: <Clock className="h-3 w-3" />, br: "border-blue-500/10" };
              const t = tierInfo(a.tier);
              return (
                <div key={a.id} className={cn("flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-2xl border transition-all",
                  selectedAulaId === a.id ? "bg-accent/5 border-accent ring-1 ring-accent/20" : "bg-card hover:bg-muted/30", t.br)}>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={cn("text-[9px] uppercase font-black px-1.5 h-5 flex items-center gap-1", t.b, t.c, t.br)}>{t.i} {t.l}</Badge>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{ESPECIALIDADE_LABEL[a.especialidade]}</span>
                    </div>
                    <div className="font-bold text-base">{a.nome}</div>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full text-[10px] font-black border border-emerald-500/20">TOTAL: {stat?.total || 0}</span>
                      <span className="bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full text-[10px] font-black border border-indigo-500/20">ABCDE: {stat?.abcde || 0}</span>
                      <span className="bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full text-[10px] font-black border border-orange-500/20">LACUNA: {stat?.lacuna || 0}</span>
                      <span className="bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full text-[10px] font-black border border-rose-500/20">OQ FALTA: {stat?.oq_falta || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    {a.link_aula && <Button size="sm" variant="outline" asChild className="h-9 gap-2 font-bold text-xs">
                      <a href={a.link_aula} target="_blank" rel="noreferrer"><FileDown className="h-3.5 w-3.5" /> PDF</a>
                    </Button>}
                    <Button size="sm" onClick={() => setSelectedAulaId(a.id)} variant={selectedAulaId === a.id ? "default" : "secondary"} className="h-9 font-black text-xs gap-2 px-4">
                      {selectedAulaId === a.id ? <CheckCircle2 className="h-3.5 w-3.5" /> : <MousePointer2 className="h-3.5 w-3.5" />}
                      {selectedAulaId === a.id ? "Selecionada" : "Selecionar"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* === PROMPTS === */}
        <TabsContent value="prompt" className="mt-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar de etapas */}
            <div className="w-full lg:w-64 shrink-0 space-y-2">
              {PROMPT_KEYS.map(pk => {
                const p = prompts[pk.k];
                const dirty = p && (p.prompt !== p.original_prompt || p.modelo !== p.original_modelo);
                return (
                  <button key={pk.k} onClick={() => setPromptTab(pk.k)}
                    className={cn("w-full text-left p-3 rounded-xl border transition-all", promptTab === pk.k ? "bg-accent/10 border-accent" : "bg-card border-border hover:bg-muted/30")}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs">{pk.label}</span>
                      {dirty && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{pk.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Editor */}
            {currentPrompt && (
              <div className="flex-1 min-w-0 space-y-4">
                <Card className="p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                    <div className="flex-1 space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Modelo de IA</Label>
                      <Select value={currentPrompt.modelo} onValueChange={v => updatePrompt(promptTab, { modelo: v })}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>{MODELS.map(m => <SelectItem key={m.v} value={m.v} className="text-xs">{m.l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => updatePrompt(promptTab, { prompt: currentPrompt.original_prompt, modelo: currentPrompt.original_modelo })}
                        className="h-10 gap-1.5 text-xs font-bold"><RotateCcw className="h-3.5 w-3.5" /> Reverter</Button>
                      <Button onClick={() => savePrompt(promptTab)} disabled={savingPrompt} className="h-10 gap-1.5 text-xs font-black bg-accent">
                        {savingPrompt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Salvar
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card className="overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 border-b flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">System Prompt — {PROMPT_KEYS.find(p => p.k === promptTab)?.label}</span>
                    <Badge variant="secondary" className="text-[9px] font-mono">{currentPrompt.prompt.length} chars</Badge>
                  </div>
                  <Textarea value={currentPrompt.prompt} onChange={e => updatePrompt(promptTab, { prompt: e.target.value })}
                    className="min-h-[500px] resize-none border-0 focus-visible:ring-0 rounded-none font-mono text-xs leading-relaxed p-5" />
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        {/* === STATS === */}
        <TabsContent value="stats" className="space-y-4 mt-6">
          <Card className="p-6">
            <h2 className="font-bold flex items-center gap-2 mb-4"><BarChart3 className="h-4 w-4" /> OQs por aula</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground border-b">
                  <tr><th className="text-left py-2">Aula</th><th className="text-left py-2">Especialidade</th>
                    <th className="text-right py-2">Total</th><th className="text-right py-2">ABCDE</th>
                    <th className="text-right py-2">Lacuna</th><th className="text-right py-2">OQ Falta</th></tr>
                </thead>
                <tbody className="divide-y divide-border/40">
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

      {/* Dialog Edit */}
      <Dialog open={!!editingOQ} onOpenChange={o => !o && setEditingOQ(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b"><DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4 text-accent" /> Editar OQ</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {editingOQ && (<>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Pergunta</Label>
                <Textarea value={editingOQ.pergunta} onChange={e => setEditingOQ({ ...editingOQ, pergunta: e.target.value })} className="min-h-[120px] text-sm" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Gabarito</Label>
                  <Input value={editingOQ.resposta} onChange={e => setEditingOQ({ ...editingOQ, resposta: e.target.value })} className="bg-accent/5 font-bold" />
                </div>
                {editingOQ.modo !== "abcde" && (
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Variações</Label>
                    <Input value={editingOQ.variacoes || ""} onChange={e => setEditingOQ({ ...editingOQ, variacoes: e.target.value })} placeholder="sep. por ;" />
                  </div>
                )}
              </div>
              {editingOQ.modo === "abcde" && (
                <div className="space-y-3 bg-muted/30 p-4 rounded-xl border">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Alternativas</Label>
                  {["A", "B", "C", "D", "E"].map((L, i) => {
                    const arr: any[] = Array.isArray(editingOQ.opcoes) ? editingOQ.opcoes : [];
                    const cur = arr[i];
                    const texto = typeof cur === "string" ? cur : (cur?.texto || cur?.opcao || "");
                    return (
                      <div key={L} className="flex gap-3 items-center">
                        <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border",
                          editingOQ.resposta.toUpperCase() === L ? "bg-emerald-500 text-white" : "bg-background")}>{L}</span>
                        <Input value={texto}
                          onChange={e => {
                            const next = [...arr];
                            while (next.length < 5) next.push({ letra: ["A","B","C","D","E"][next.length], texto: "" });
                            if (typeof next[i] === "string") next[i] = e.target.value;
                            else next[i] = { letra: L, texto: e.target.value };
                            setEditingOQ({ ...editingOQ, opcoes: next });
                          }}
                          className="h-9 text-xs" />
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Explicação</Label>
                <Textarea value={editingOQ.explicacao || ""} onChange={e => setEditingOQ({ ...editingOQ, explicacao: e.target.value })} className="min-h-[140px] text-sm" />
              </div>
            </>)}
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted/20 gap-3">
            <Button variant="ghost" onClick={() => setEditingOQ(null)}>Cancelar</Button>
            <Button onClick={saveEditOQ} className="bg-accent hover:bg-accent/90 px-8 font-black">SALVAR</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
