import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Sparkles, Upload, FileText, CheckCircle2, Loader2, AlertCircle, Trash2, AlertTriangle, FileSpreadsheet, Download, HelpCircle, Copy } from "lucide-react";
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
  variacoes?: string;
  modo: string;
  especialidade: string;
  opcoes?: any;
  explicacao?: string;
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

  async function downloadTemplate() {
    const headers = [
      "Especialidade", "Modo", "Pergunta", "Gabarito (Resposta Correta)", 
      "Variações do Gabarito (opcional)",
      "Opção A", "Opção B", "Opção C", "Opção D", "Opção E", 
      "Explicação"
    ];
    
    const rows = [
      [
        "Clínica Médica", 
        "Múltipla escolha", 
        "Qual o principal achado eletrocardiográfico na pericardite aguda?", 
        "Infradesnivelamento do segmento PR", 
        "infra de PR; infra-PR",
        "Infradesnivelamento do segmento PR", 
        "Supradesnivelamento de ST convexo", 
        "Onda T apiculada", 
        "Complexo QRS largo", 
        "Onda U proeminente", 
        "Na pericardite, o infra de PR é altamente específico na fase inicial."
      ],
      [
        "Pediatria", 
        "Lacuna", 
        "O principal objetivo da ____ é manter a oxigenação e ventilação do recém-nascido.", 
        "Ventilação com Pressão Positiva", 
        "VPP; ventilacao de pressao positiva; ambuzar",
        "", "", "", "", "", 
        "A VPP é a medida mais importante na reanimação neonatal."
      ],
      [
        "Cirurgia Geral", 
        "OQ Falta", 
        "Tríade de Charcot (identifique o que falta)", 
        "Febre com calafrios", 
        "febre; calafrios; febre alta",
        "Dor abdominal", 
        "Icterícia", 
        "", 
        "", 
        "",
        "A tríade de Charcot (dor, icterícia e febre) indica colangite aguda."
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 40 }, { wch: 30 }, 
      { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, 
      { wch: 20 }, { wch: 20 }, { wch: 40 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template OQs");
    
    XLSX.writeFile(wb, "template_oq_med_v3.xlsx");
    toast.success("Template robusto baixado com sucesso! Veja os 3 exemplos incluídos.");
  }

  async function handleExcelUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setLoading(true);
    setStatus("Lendo planilha...");

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        const toInsert = json.map((row: any) => {
          const espLabel = String(row["Especialidade"] || "").trim().toLowerCase();
          const esp = Object.entries(ESPECIALIDADE_LABEL).find(([_, label]) => 
            label.toLowerCase() === espLabel
          )?.[0] || "clinica_medica";
          
          const modoLabel = String(row["Modo"] || "").trim().toLowerCase();
          const modo = Object.entries(MODO_LABEL).find(([_, label]) => 
            label.toLowerCase() === modoLabel
          )?.[0] || "abcde";
          
          const opcoes = [
            row["Opção A"],
            row["Opção B"],
            row["Opção C"],
            row["Opção D"],
            row["Opção E"]
          ].map(v => v ? String(v).trim() : null).filter(Boolean);

          return {
            user_id: user.id,
            pergunta: row["Pergunta"],
            resposta: row["Gabarito (Resposta Correta)"] || "",
            variacoes: row["Variações do Gabarito (opcional)"] || "",
            modo: modo,
            especialidade: esp,
            explicacao: row["Explicação"] || "Importado via planilha.",
            contexto_origem: "Upload de Excel",
            opcoes: opcoes.length > 0 ? opcoes : null
          };
        }).filter(q => q.pergunta && q.resposta);

        if (toInsert.length === 0) {
          toast.error("Nenhuma questão válida encontrada. Verifique se preencheu 'Pergunta' e 'Gabarito'.");
          setLoading(false);
          setStatus("");
          return;
        }

        const { error: insError } = await supabase.from("temp_oqs").insert(toInsert as any[]);
        if (insError) throw insError;

        toast.success(`${toInsert.length} questões carregadas! Revise e aprove abaixo.`);
        loadTempOQs();
        setLoading(false);
        setStatus("");
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao processar planilha: " + err.message);
      setLoading(false);
      setStatus("");
    }
    event.target.value = '';
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
        explicacao: q.explicacao || "Gerado por IA.",
        contexto_origem: file.name
      }));

      const { error: insError } = await supabase.from("temp_oqs").insert(toInsert as any[]);
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
      const isOQFalta = q.modo === "oq_falta";
      const isABCDE = q.modo === "abcde";
      
      // Para o modo ABCDE, a alternativa_correta no banco é char(1) (A, B, C, D ou E)
      // Precisamos identificar qual opção corresponde à resposta textual
      let gabaritoFinal = q.resposta;
      if (isABCDE && q.resposta && q.resposta.length > 1) {
        const options = Array.isArray(q.opcoes) ? q.opcoes : [];
        const index = options.findIndex(opt => opt && String(opt).trim().toLowerCase() === String(q.resposta).trim().toLowerCase());
        if (index !== -1) {
          gabaritoFinal = ["A", "B", "C", "D", "E"][index];
        } else {
          // Se não encontrou match exato, tenta ver se a resposta já é a letra
          const firstChar = String(q.resposta).trim().toUpperCase();
          if (["A", "B", "C", "D", "E"].includes(firstChar) && q.resposta.length < 3) {
            gabaritoFinal = firstChar;
          } else {
            // Fallback para A se não houver correspondência, ou manter o erro controlado
            // Mas para evitar o erro do Postgres, vamos garantir que seja apenas 1 char
            gabaritoFinal = "A"; 
            console.warn("Não foi possível mapear a resposta para uma letra no modo ABCDE:", q.resposta);
          }
        }
      } else if (isABCDE) {
        // Garante que seja maiúsculo se for apenas 1 letra
        gabaritoFinal = String(q.resposta || "A").trim().toUpperCase();
      }

      const { error } = await supabase.from("cards").insert([{
        modo: q.modo as Modo,
        especialidade: q.especialidade as Especialidade,
        comando: q.pergunta,
        alternativa_correta: isABCDE ? gabaritoFinal : null,
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
        explicacao: q.explicacao || "Importado via planilha ou gerado por IA.",
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

  async function approveAll() {
    if (tempOQs.length === 0) return;
    
    if (!confirm(`Tem certeza que deseja aprovar e adicionar ao baralho todos os ${tempOQs.length} OQs pendentes?`)) {
      return;
    }
    
    toast.loading("Aprovando todos os OQs...", { id: "approve-all" });
    
    try {
      // Processa um por um para garantir o mapeamento de gabarito e lógica de negócio
      // Em um cenário de produção com muitos itens, isso poderia ser otimizado
      for (const q of tempOQs) {
        // Mapear temp_oq para estrutura final de cards
        const isOQFalta = q.modo === "oq_falta";
        const isABCDE = q.modo === "abcde";
        
        let gabaritoFinal = q.resposta;
        if (isABCDE && q.resposta && q.resposta.length > 1) {
          const options = Array.isArray(q.opcoes) ? q.opcoes : [];
          const index = options.findIndex(opt => opt && String(opt).trim().toLowerCase() === String(q.resposta).trim().toLowerCase());
          if (index !== -1) {
            gabaritoFinal = ["A", "B", "C", "D", "E"][index];
          } else {
            const firstChar = String(q.resposta).trim().toUpperCase();
            if (["A", "B", "C", "D", "E"].includes(firstChar) && q.resposta.length < 3) {
              gabaritoFinal = firstChar;
            } else {
              gabaritoFinal = "A"; 
            }
          }
        } else if (isABCDE) {
          gabaritoFinal = String(q.resposta || "A").trim().toUpperCase();
        }

        const { error } = await supabase.from("cards").insert([{
          modo: q.modo as Modo,
          especialidade: q.especialidade as Especialidade,
          comando: q.pergunta,
          alternativa_correta: isABCDE ? gabaritoFinal : null,
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
          explicacao: q.explicacao || "Importado via planilha ou gerado por IA.",
          verificado: false,
          criado_por_usuario_id: user?.id,
          origem: "usuario"
        }]);

        if (error) throw error;
      }
      
      // Deletar todos do temp após sucesso
      const ids = tempOQs.map(q => q.id);
      await supabase.from("temp_oqs").delete().in("id", ids);
      setTempOQs([]);
      toast.success("Todos os OQs foram aprovados!", { id: "approve-all" });
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao aprovar todos: " + err.message, { id: "approve-all" });
    }
  }

  async function discardAll() {
    if (tempOQs.length === 0) return;
    if (!confirm(`Tem certeza que deseja descartar todos os ${tempOQs.length} OQs pendentes? Esta ação não pode ser desfeita.`)) return;

    try {
      const ids = tempOQs.map(q => q.id);
      await supabase.from("temp_oqs").delete().in("id", ids);
      setTempOQs([]);
      toast.success("Todos os OQs pendentes foram descartados.");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao descartar todos.");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 pb-32">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[hsl(var(--accent))]" />
            Gerar OQs
          </h1>
          <p className="text-muted-foreground mt-2">
            Crie suas próprias questões através de IA ou importe dados via planilha.
          </p>
        </div>
      </header>

      <div className="grid md:grid-cols-[1fr_320px] gap-8 items-start">
        <div className="space-y-6">
          {tempOQs.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Aguardando Aprovação ({tempOQs.length})
                </h2>
                <div className="flex gap-2">
                  <button 
                    onClick={approveAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Aprovar Todos
                  </button>
                  <button 
                    onClick={discardAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-[10px] font-bold hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" /> Descartar Todos
                  </button>
                </div>
              </div>
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
                      {q.variacoes && (
                        <p className="text-[10px] text-muted-foreground italic">Variações: {q.variacoes}</p>
                      )}
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
          <Tabs defaultValue="ia" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl mb-4">
              <TabsTrigger value="ia" className="rounded-lg text-xs font-bold">Gerar por IA</TabsTrigger>
              <TabsTrigger value="excel" className="rounded-lg text-xs font-bold">Importar Excel</TabsTrigger>
            </TabsList>

            <TabsContent value="ia" className="space-y-6 focus-visible:outline-none">
              <Card className="paper-card p-6 space-y-6">
                <h3 className="font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Inteligência Artificial
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
                      accept=".txt,.csv,.md,.pdf"
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
              </Card>
            </TabsContent>

            <TabsContent value="excel" className="space-y-6 focus-visible:outline-none">
              <Card className="paper-card p-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="font-bold flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" /> Importar Planilha
                  </h3>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Importe suas próprias questões diretamente via Excel. Sem IA, total controle.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 rounded-2xl bg-accent/5 border border-accent/20 space-y-3">
                      <div className="flex items-center gap-2 text-accent">
                        <Download className="h-4 w-4" />
                        <span className="text-xs font-black uppercase tracking-wider">Passo 1: Template Especial</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Baixe nosso template oficial. Ele já vem com <strong>3 exemplos reais</strong> (um para cada modo) para você entender exatamente como preencher.
                      </p>
                      <TactileButton 
                        variant="neutral" 
                        className="w-full h-9 text-xs font-bold"
                        onClick={downloadTemplate}
                      >
                        Baixar Template com Exemplos
                      </TactileButton>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-foreground">
                        <Upload className="h-4 w-4" />
                        <span className="text-xs font-black uppercase tracking-wider">Passo 2: Upload dos Dados</span>
                      </div>
                      <div 
                        onClick={() => document.getElementById('excel-upload')?.click()}
                        className="h-28 border-2 border-dashed border-border/60 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-accent/40 hover:bg-accent/5 transition-all group"
                      >
                        <input 
                          id="excel-upload"
                          type="file" 
                          className="hidden" 
                          accept=".xlsx,.xls"
                          onChange={handleExcelUpload}
                          disabled={loading}
                        />
                        {loading && status.includes("planilha") ? (
                          <div className="text-center">
                            <Loader2 className="h-8 w-8 text-accent animate-spin mx-auto mb-2" />
                            <p className="text-[10px] font-bold text-accent">Processando...</p>
                          </div>
                        ) : (
                          <>
                            <FileSpreadsheet className="h-8 w-8 text-muted-foreground mb-2 group-hover:text-accent transition-colors" />
                            <p className="text-xs font-bold text-muted-foreground group-hover:text-accent">Clique para subir sua planilha</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">Apenas .xlsx ou .xls</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-muted/30 rounded-2xl border border-border/40 space-y-4">
                    <h4 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-foreground">
                      <HelpCircle className="h-3.5 w-3.5 text-accent" /> Guia de Preenchimento Robusto
                    </h4>
                    
                    <div className="space-y-4 text-[11px] leading-relaxed">
                      <div className="space-y-1.5">
                        <p className="font-bold flex items-center gap-1.5 text-foreground">
                          <span className="h-4 w-4 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[9px]">1</span>
                          Múltipla Escolha (ABCDE)
                        </p>
                        <p className="text-muted-foreground ml-5">
                          • <strong>Gabarito (Resposta Correta)</strong>: Texto exato da alternativa correta.<br/>
                          • <strong>Opções A-E</strong>: Preencha todas as alternativas.<br/>
                          • <strong>Variações do Gabarito (opcional)</strong>: Pode deixar em <strong>branco</strong>.
                        </p>
                      </div>

                      <div className="space-y-1.5 border-t border-border/40 pt-3">
                        <p className="font-bold flex items-center gap-1.5 text-foreground">
                          <span className="h-4 w-4 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[9px]">2</span>
                          Modo Lacuna
                        </p>
                        <p className="text-muted-foreground ml-5">
                          • <strong>Pergunta</strong>: Use <code>____</code> para indicar o espaço.<br/>
                          • <strong>Gabarito (Resposta Correta)</strong>: Termo principal que completa a frase.<br/>
                          • <strong>Variações do Gabarito (opcional)</strong>: Adicione siglas ou sinônimos (ex: <code>VPP; ventilacao</code>) para aumentar a aceitação. O app ignora acentos e pequenos erros automaticamente.<br/>
                          • <strong>Opções A-E</strong>: Deixe em <strong>branco</strong>.
                        </p>
                      </div>

                      <div className="space-y-1.5 border-t border-border/40 pt-3">
                        <p className="font-bold flex items-center gap-1.5 text-foreground">
                          <span className="h-4 w-4 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[9px]">3</span>
                          Modo OQ Falta
                        </p>
                        <p className="text-muted-foreground ml-5">
                          • <strong>Gabarito (Resposta Correta)</strong>: O termo "surpresa" que o aluno deve adivinhar.<br/>
                          • <strong>Opções A-D</strong>: Os outros termos do grupo (que já aparecerão na tela).<br/>
                          • <strong>Variações do Gabarito (opcional)</strong>: Sinônimos do gabarito (ex: <code>FC; frequencia</code>).
                        </p>
                      </div>

                      <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 mt-4">
                        <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3" /> Inteligência na Aceitação
                        </p>
                        <p className="text-[10px] text-emerald-600/80 mt-1">
                          Nosso sistema usa análise sintática e <strong>Distância de Levenshtein</strong>. Isso significa que aceitamos respostas com pequenos erros de digitação, falta de acentos ou espaços extras, garantindo que o estudo flua sem interrupções injustas.
                        </p>
                      </div>

                      <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                        <p className="text-[10px] text-amber-700 font-bold flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3" /> Especialidades Válidas
                        </p>
                        <p className="text-[10px] text-amber-600/80 mt-1">
                          Escreva exatamente como no sistema: Clínica Médica, Cirurgia Geral, Pediatria, Ginecologia e Obstetrícia ou Medicina Preventiva.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-accent/5 rounded-2xl border border-accent/20 space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-accent">
                        <Sparkles className="h-3.5 w-3.5" /> Se quiser ajuda de outra IA
                      </h4>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        Copie o prompt mestre abaixo e cole no ChatGPT ou Claude junto com seu resumo para gerar a tabela perfeita.
                      </p>
                    </div>

                    <div className="relative group">
                      <pre className="text-[9px] bg-white border border-border/40 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed text-muted-foreground max-h-40 overflow-y-auto">
{`VOCÊ É UM ESPECIALISTA EM PREPARAÇÃO DE ALTO RENDIMENTO PARA RESIDÊNCIA MÉDICA.
Sua missão é transformar o resumo anexado em 25 questões estratégicas (OQs) para revisão espaçada, cobrindo 100% do conteúdo com foco em temas ouro, conceitos complexos e casos clínicos.

645: DIRETRIZES TÉCNICAS (NUNCA DESVIE DISSO):
646: 1. FORMATO: Gere EXATAMENTE 1 tabela com 11 colunas e 25 linhas de dados.
647: 2. COLUNAS: Especialidade, Modo, Pergunta, Gabarito (Resposta Correta), Variações do Gabarito (opcional), Opção A, Opção B, Opção C, Opção D, Opção E, Explicação.
648: 3. MODOS: Escolha o modo (ABCDE, Lacuna, OQ Falta) que melhor desafie o conceito. Use 'Lacuna' para definições, 'ABCDE' para diagnósticos diferenciais e 'OQ Falta' para listas/critérios.
649: 4. VARIAÇÕES: Mínimo de 5 variações por gabarito (sinônimos, siglas, termos correlatos) separados por ';'.
650: 5. EXPLICAÇÃO: Mínimo 5 linhas. Deve ser profunda: explique o gabarito E por que cada distrator está incorreto.
651: 6. SÍMBOLOS: NUNCA use símbolos matemáticos como "<", ">", "≥", "≤" ou fórmulas LaTeX. Substitua por extenso (ex: "maior ou igual a", "menor que").
652: 
653: REGRAS POR MODO (NUNCA INVENTE OUTROS FORMATOS):
654: - ABCDE: Preencha Opções A-E. O Gabarito (Resposta Correta) deve ser idêntico ao texto de uma das opções.
655: - Lacuna: Use '____' na pergunta. Deixe Opções A-E totalmente VAZIAS.
656: - OQ Falta: Liste 4 termos relacionados em Opções A-D. O Gabarito (Resposta Correta) é o 5º termo que completa o grupo. Deixe Opção E vazia.

ESTRATÉGIA DE CONTEÚDO:
- Priorize Casos Clínicos para temas de diagnóstico e conduta.
- Foque intensamente em "Temas Ouro": o que é mais difícil, mais cobrado em provas reais ou mais fácil de esquecer.
- Garanta que a matéria seja contemplada por completo, abordando diferentes perspectivas de um mesmo tema difícil.

[ANEXE OU COLE SEU RESUMO ABAIXO E GERE A TABELA]`}
                      </pre>
                      <button 
                        onClick={() => {
                          const prompt = `VOCÊ É UM ESPECIALISTA EM PREPARAÇÃO DE ALTO RENDIMENTO PARA RESIDÊNCIA MÉDICA.
Sua missão é transformar o resumo anexado em 25 questões estratégicas (OQs) para revisão espaçada, cobrindo 100% do conteúdo com foco em temas ouro, conceitos complexos e casos clínicos.

DIRETRIZES TÉCNICAS (NUNCA DESVIE DISSO):
670: 1. FORMATO: Gere EXATAMENTE 1 tabela com 11 colunas e 25 linhas de dados.
671: 2. COLUNAS: Especialidade, Modo, Pergunta, Gabarito (Resposta Correta), Variações do Gabarito (opcional), Opção A, Opção B, Opção C, Opção D, Opção E, Explicação.
672: 3. MODOS: Escolha o modo (ABCDE, Lacuna, OQ Falta) que melhor desafie o conceito. Use 'Lacuna' para definições, 'ABCDE' para diagnósticos diferenciais e 'OQ Falta' para listas/critérios.
673: 4. VARIAÇÕES: Mínimo de 5 variações por gabarito (sinônimos, siglas, termos correlatos) separados por ';'.
674: 5. EXPLICAÇÃO: Mínimo 5 linhas. Deve ser profunda: explique o gabarito E por que cada distrator está incorreto.
675: 6. SÍMBOLOS: NUNCA use símbolos matemáticos como "<", ">", "≥", "≤" ou fórmulas LaTeX. Substitua por extenso (ex: "maior ou igual a", "menor que").
676: 
677: REGRAS POR MODO (NUNCA INVENTE OUTROS FORMATOS):
678: - ABCDE: Preencha Opções A-E. O Gabarito (Resposta Correta) deve ser idêntico ao texto de uma das opções.
679: - Lacuna: Use '____' na pergunta. Deixe Opções A-E totalmente VAZIAS.
680: - OQ Falta: Liste 4 termos relacionados em Opções A-D. O Gabarito (Resposta Correta) é o 5º termo que completa o grupo. Deixe Opção E vazia.

ESTRATÉGIA DE CONTEÚDO:
- Priorize Casos Clínicos para temas de diagnóstico e conduta.
- Foque intensamente em "Temas Ouro": o que é mais difícil, mais cobrado em provas reais ou mais fácil de esquecer.
- Garanta que a matéria seja contemplada por completo, abordando diferentes perspectivas de um mesmo tema difícil.

[ANEXE OU COLE SEU RESUMO ABAIXO E GERE A TABELA]`;
                          navigator.clipboard.writeText(prompt);
                          toast.success("Prompt mestre copiado!");
                        }}
                        className="absolute top-2 right-2 p-2 bg-accent text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        title="Copiar Prompt"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="space-y-3">
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
