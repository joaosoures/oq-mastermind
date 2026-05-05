import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Sparkles, Upload, FileText, CheckCircle2, Loader2, AlertCircle, Trash2, AlertTriangle, FileSpreadsheet, Download, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import TactileButton from "@/components/console/TactileButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ESPECIALIDADE_LABEL, Especialidade, Modo, MODO_LABEL } from "@/lib/oq";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TempOQ {
  id: string;
  pergunta: string;
  resposta: string;
  modo: string;
  especialidade: string;
  opcoes?: any;
}

export default function GerarOQs() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [specialty, setSpecialty] = useState<Especialidade>("clinica_medica");
  const [difficulty, setDifficulty] = useState<"facil" | "medio" | "dificil">("medio");
  const [tempOQs, setTempOQs] = useState<TempOQ[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Gerar OQs — OQ MED";
    loadTempOQs();
  }, [user]);

  async function loadTempOQs() {
    if (!user) return;
    const { data, error } = await supabase
      .from("temp_oqs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (error) console.error("Erro ao carregar OQs temporários:", error);
    else setTempOQs(data || []);
  }

  async function handleGenerate() {
    if (!file || !user) {
      toast.error("Selecione um arquivo primeiro");
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    setStatus("Lendo arquivo...");
    try {
      let text = "";
      if (file.type === "application/pdf") {
        setStatus("Processando PDF...");
        // Em uma implementação de produção, usaríamos uma biblioteca como pdf.js aqui
        text = await file.text();
      } else {
        text = await file.text();
      }

      setStatus("Enviando para IA...");
      const { data, error } = await supabase.functions.invoke("gerar-oqs-ia", {
        body: { 
          text: text.slice(0, 12000), 
          fileName: file.name,
          specialty,
          difficulty 
        },
        signal: controller.signal
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.questions) throw new Error("IA não retornou questões");

      setStatus(`Salvando ${data.questions.length} questões...`);
      
      const toInsert = data.questions.map((q: any) => ({
        user_id: user.id,
        pergunta: q.pergunta,
        resposta: q.resposta,
        modo: q.modo,
        opcoes: q.opcoes,
        especialidade: specialty,
        contexto_origem: file.name
      }));

      const { error: insError } = await supabase.from("temp_oqs").insert(toInsert);
      if (insError) throw insError;

      toast.success(`${data.questions.length} questões geradas com sucesso!`);
      setFile(null);
      loadTempOQs();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        toast.info("Geração cancelada pelo usuário");
      } else {
        console.error(err);
        toast.error(err.message || "Erro ao gerar questões");
      }
    } finally {
      setLoading(false);
      setStatus("");
      abortControllerRef.current = null;
    }
  }

  function handleCancel() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }

  async function approveOQ(q: TempOQ) {
    try {
      // Mapear temp_oq para estrutura final de cards
      const { error } = await supabase.from("cards").insert([{
        modo: q.modo as Modo,
        especialidade: q.especialidade as Especialidade,
        comando: q.pergunta,
        alternativa_correta: q.modo === "abcde" ? q.resposta : null,
        alternativa_a: Array.isArray(q.opcoes) ? q.opcoes[0] || null : null,
        alternativa_b: Array.isArray(q.opcoes) ? q.opcoes[1] || null : null,
        alternativa_c: Array.isArray(q.opcoes) ? q.opcoes[2] || null : null,
        alternativa_d: Array.isArray(q.opcoes) ? q.opcoes[3] || null : null,
        alternativa_e: Array.isArray(q.opcoes) ? q.opcoes[4] || null : null,
        info_1: q.modo !== "abcde" ? q.resposta : null,
        explicacao: "Gerado automaticamente por IA.",
        verificado: false,
        criado_por_usuario_id: user?.id,
        origem: "usuario"
      }]);

      if (error) throw error;
      
      // Deletar do temp
      await supabase.from("temp_oqs").delete().eq("id", q.id);
      setTempOQs(prev => prev.filter(item => item.id !== q.id));
      toast.success("OQ aprovado e adicionado ao seu banco!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao aprovar OQ: " + err.message);
    }
  }

  async function deleteTemp(id: string) {
    await supabase.from("temp_oqs").delete().eq("id", id);
    setTempOQs(prev => prev.filter(item => item.id !== id));
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 pb-32">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[hsl(var(--accent))]" />
            Gerar OQs por IA
          </h1>
          <p className="text-muted-foreground mt-2">
            Transforme seus PDFs ou anotações em questões de estudo inteligentes.
          </p>
        </div>
      </header>

      <div className="grid md:grid-cols-[1fr_320px] gap-8 items-start">
        <div className="space-y-6">
          {tempOQs.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-1">
                Aguardando Aprovação ({tempOQs.length})
              </h2>
              {tempOQs.map((q) => (
                <Card key={q.id} className="paper-card p-5 space-y-4 animate-fade-up">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                          {q.modo}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {ESPECIALIDADE_LABEL[q.especialidade as Especialidade]}
                        </span>
                      </div>
                      <p className="font-medium text-foreground">{q.pergunta}</p>
                      <p className="text-sm text-emerald-600 font-bold">Resposta: {q.resposta}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => approveOQ(q)}
                        className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                        title="Aprovar e adicionar ao banco"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => deleteTemp(q.id)}
                        className="p-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                        title="Descartar"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 border-dashed border-2 flex flex-col items-center text-center space-y-4 bg-muted/5">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
              <div>
                <h3 className="font-bold">Nenhum OQ pendente</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Envie um material ao lado para começar a gerar questões personalizadas.
                </p>
              </div>
            </Card>
          )}
        </div>

        <aside className="space-y-6 sticky top-24">
          <Card className="paper-card p-6 space-y-6">
            <h3 className="font-bold flex items-center gap-2">
              <Upload className="h-4 w-4" /> Novo Material
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Especialidade</label>
                <Select value={specialty} onValueChange={(v) => setSpecialty(v as Especialidade)}>
                  <SelectTrigger className="rounded-xl border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {Object.entries(ESPECIALIDADE_LABEL).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dificuldade</label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-muted/30 rounded-xl border border-border/40">
                  {(["facil", "medio", "dificil"] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={cn(
                        "py-1.5 px-2 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all",
                        difficulty === level 
                          ? "bg-white text-[hsl(var(--accent))] shadow-sm" 
                          : "text-muted-foreground hover:bg-white/50"
                      )}
                    >
                      {level === "facil" ? "Fácil" : level === "medio" ? "Médio" : "Difícil"}
                    </button>
                  ))}
                </div>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`
                  h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all
                  ${file ? "border-accent bg-accent/5" : "border-border/60 hover:border-accent/40 hover:bg-muted/5"}
                `}
              >
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef}
                  accept=".txt,.csv,.md,.pdf" // Adicionado suporte a PDF
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file ? (
                  <div className="text-center px-4">
                    <FileText className="h-8 w-8 mx-auto text-accent mb-2" />
                    <p className="text-xs font-bold truncate max-w-[200px]">{file.name}</p>
                    <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-[10px] text-destructive font-bold mt-1">remover</button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                    <p className="text-xs font-medium text-muted-foreground">Clique para enviar</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">PDF (até 25 pág.), TXT, CSV ou MD</p>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <TactileButton 
                  variant="primary" 
                  className="w-full" 
                  disabled={!file || loading}
                  onClick={handleGenerate}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {loading ? (status || "Gerando...") : "Gerar OQs"}
                </TactileButton>

                {loading && (
                  <button 
                    onClick={handleCancel}
                    className="w-full text-xs font-bold text-destructive hover:underline py-1 transition-all"
                  >
                    Cancelar processo
                  </button>
                )}
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
              <p className="text-[10px] text-blue-700 leading-relaxed">
                <strong>PDFs Suportados:</strong> O sistema processa até 25 páginas. Para arquivos maiores, sugerimos dividir o documento para manter a qualidade das questões.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                <strong>Atenção:</strong> Em caso de inadimplência, as questões geradas e materiais salvos serão excluídos definitivamente após 15 dias.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
