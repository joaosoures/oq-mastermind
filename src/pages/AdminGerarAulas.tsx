import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GraduationCap, Loader2, CheckCircle2, FileSpreadsheet, BarChart3,
  Download, Upload, Flame, Zap, Clock, FileDown, MousePointer2, HelpCircle,
} from "lucide-react";
import { ESPECIALIDADE_LABEL, Especialidade, Modo, MODO_LABEL } from "@/lib/oq";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ExcelJS from "exceljs";
import { TEMPLATE_HEADERS, TEMPLATE_ROWS, TEMPLATE_COLUMNS, addGuideSheet } from "@/lib/oq-template-guide";

type Aula = { id: string; nome: string; especialidade: Especialidade; link_aula: string | null; tier: number; };
type AulaStat = { aula_id: string; nome: string; especialidade: string; total: number; abcde: number; lacuna: number; oq_falta: number; };

export default function AdminGerarAulas() {
  const { user, isAdmin } = useAuth();
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [stats, setStats] = useState<AulaStat[]>([]);
  const [selectedAulaId, setSelectedAulaId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState("aulas");

  useEffect(() => {
    document.title = "Gerar OQs a partir de Aulas";
    loadAulas();
    if (isAdmin) loadStats();
  }, [isAdmin]);

  async function loadAulas() {
    const { data, error } = await supabase
      .from("materiais")
      .select("id, nome, especialidade, link_1, tipo_1, tier")
      .eq("tipo_1", "PDF").not("link_1", "is", null);
    if (error) return toast.error("Erro: " + error.message);
    const getNum = (s: string) => { const m = s.match(/^(\d+)/); return m ? parseInt(m[1], 10) : Infinity; };
    setAulas((data || []).sort((a: any, b: any) => {
      const nA = getNum(a.nome), nB = getNum(b.nome);
      if (nA !== nB) return nA - nB;
      return a.nome.localeCompare(b.nome);
    }).map((m: any) => ({
      id: m.id, nome: m.nome, especialidade: m.especialidade as Especialidade,
      link_aula: m.link_1, tier: m.tier || 3,
    })));
  }

  async function loadStats() {
    const { data } = await supabase.rpc("aulas_stats" as any);
    if (data) setStats(data as any);
  }

  async function downloadTemplate() {
    const headers = [
      "Especialidade", "Modo", "comando",
      "resposta 1", "variações 1",
      "resposta 2", "variações 2",
      "resposta 3", "variações 3",
      "resposta 4", "variações 4",
      "resposta 5", "variações 5",
      "gabarito", "explicação"
    ];
    const rows = [
      [
        "Clínica Médica", "ABCDE",
        "Qual o principal achado eletrocardiográfico na pericardite aguda?",
        "Infradesnivelamento do segmento PR", "",
        "Supradesnivelamento de ST convexo", "",
        "Onda T apiculada", "",
        "Complexo QRS largo", "",
        "Onda U proeminente", "",
        "A",
        "Na pericardite, o infra de PR é altamente específico na fase inicial."
      ],
      [
        "Pediatria", "Lacuna",
        "O principal objetivo da ____ é manter a oxigenação e ventilação do recém-nascido.",
        "Ventilação com Pressão Positiva", "VPP; ventilacao de pressao positiva; ambuzar",
        "", "", "", "", "", "", "", "",
        "",
        "A VPP é a medida mais importante na reanimação neonatal."
      ],
      [
        "Cirurgia Geral", "OQ Falta",
        "Tríade de Charcot:",
        "Febre com calafrios", "febre; calafrios",
        "Dor abdominal em hipocôndrio direito", "dor abdominal; dor HCD",
        "Icterícia", "ictericia; pele amarelada",
        "", "",
        "", "",
        "",
        "A tríade de Charcot (dor, icterícia e febre) indica colangite aguda."
      ]
    ];
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Template OQs");
    ws.addRow(headers);
    rows.forEach(r => ws.addRow(r));
    ws.columns = [
      { width: 22 }, { width: 12 }, { width: 45 },
      { width: 28 }, { width: 24 },
      { width: 28 }, { width: 24 },
      { width: 28 }, { width: 24 },
      { width: 28 }, { width: 24 },
      { width: 28 }, { width: 24 },
      { width: 14 }, { width: 45 },
    ];
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "template_oq_aula.xlsx";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Template baixado.");
  }

  async function handleExcelUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;
    if (!selectedAulaId) {
      toast.error("Selecione uma aula antes de subir a planilha.");
      return;
    }
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      const worksheet = wb.worksheets[0];
      if (!worksheet) throw new Error("Planilha vazia");

      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
        headers[col - 1] = String(cell.value ?? "").trim();
      });

      const json: Record<string, any>[] = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
        if (rowNum === 1) return;
        const obj: Record<string, any> = {};
        row.eachCell({ includeEmpty: true }, (cell, col) => {
          const key = headers[col - 1];
          if (!key) return;
          const v: any = cell.value;
          obj[key] = v && typeof v === "object" && "text" in v ? (v as any).text : v;
        });
        json.push(obj);
      });

      const norm = (v: any) => (v == null ? "" : String(typeof v === "object" && "text" in v ? (v as any).text : v).trim());

      const toInsert = json.map((row: any) => {
        const get = (...keys: string[]) => {
          for (const k of keys) {
            if (row[k] != null && String(row[k]).trim() !== "") return norm(row[k]);
          }
          return "";
        };

        const espLabel = get("Especialidade").toLowerCase();
        const esp = (Object.entries(ESPECIALIDADE_LABEL).find(([_, label]) =>
          label.toLowerCase() === espLabel
        )?.[0] as Especialidade) || "clinica_medica";

        const modoLabel = get("Modo").toLowerCase();
        const modo = (Object.entries(MODO_LABEL).find(([_, label]) =>
          label.toLowerCase() === modoLabel
        )?.[0] as Modo) || "abcde";

        const pergunta = get("comando", "Pergunta");
        const respostas = [1, 2, 3, 4, 5].map(i =>
          get(`resposta ${i}`, i === 1 ? "Gabarito (Resposta Correta)" : `Opção ${["A","B","C","D","E"][i-1]}`)
        );
        const variacoes = [1, 2, 3, 4, 5].map(i =>
          get(`variações ${i}`, `variacoes ${i}`, i === 1 ? "Variações do Gabarito (opcional)" : "")
        );
        const gabarito = get("gabarito");
        const explicacao = get("explicação", "explicacao", "Explicação") || "Importado via planilha.";

        if (!pergunta) return null;

        const isABCDE = modo === "abcde";
        const isOQFalta = modo === "oq_falta";
        const isLacuna = modo === "lacuna";

        // Validações por modo
        if (isABCDE && respostas.filter(Boolean).length < 2) return null;
        if (isLacuna && !respostas[0]) return null;
        if (isOQFalta && respostas.filter(Boolean).length < 2) return null;

        let gabaritoLetra: string | null = null;
        if (isABCDE) {
          const g = (gabarito || respostas[0] || "").trim();
          if (/^[A-Ea-e]$/.test(g)) gabaritoLetra = g.toUpperCase();
          else {
            const idx = respostas.findIndex(o => o && o.toLowerCase() === g.toLowerCase());
            gabaritoLetra = idx >= 0 ? ["A","B","C","D","E"][idx] : "A";
          }
        }

        return {
          modo,
          especialidade: esp,
          comando: pergunta,
          alternativa_correta: isABCDE ? gabaritoLetra : null,
          alternativa_a: isABCDE ? (respostas[0] || null) : null,
          alternativa_b: isABCDE ? (respostas[1] || null) : null,
          alternativa_c: isABCDE ? (respostas[2] || null) : null,
          alternativa_d: isABCDE ? (respostas[3] || null) : null,
          alternativa_e: isABCDE ? (respostas[4] || null) : null,
          info_1: isLacuna ? respostas[0] : (isOQFalta ? (respostas[0] || null) : null),
          var_1: isLacuna ? (variacoes[0] || null) : (isOQFalta ? (variacoes[0] || null) : null),
          info_2: isOQFalta ? (respostas[1] || null) : null,
          var_2:  isOQFalta ? (variacoes[1] || null) : null,
          info_3: isOQFalta ? (respostas[2] || null) : null,
          var_3:  isOQFalta ? (variacoes[2] || null) : null,
          info_4: isOQFalta ? (respostas[3] || null) : null,
          var_4:  isOQFalta ? (variacoes[3] || null) : null,
          info_5: isOQFalta ? (respostas[4] || null) : null,
          var_5:  isOQFalta ? (variacoes[4] || null) : null,
          explicacao,
          verificado: true,
          origem: "admin" as const,
          criado_por_usuario_id: null,
          aula_id: selectedAulaId,
        };
      }).filter(Boolean) as any[];

      if (toInsert.length === 0) {
        toast.error("Nenhuma questão válida. Verifique 'comando' e ao menos 'resposta 1'.");
        return;
      }

      const { error } = await supabase.from("cards").insert(toInsert as any);
      if (error) throw error;

      toast.success(`${toInsert.length} OQs vinculados à aula com sucesso!`);
      if (isAdmin) loadStats();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao processar planilha: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  if (!isAdmin) return <div className="p-12 text-center text-muted-foreground">Acesso restrito.</div>;

  const selectedAula = aulas.find(a => a.id === selectedAulaId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 pb-32 space-y-8">
      <header>
        <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-accent" />
          Gerar OQs a partir de Aulas
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Selecione a aula, suba a planilha Excel com os OQs configurados — eles serão automaticamente vinculados à aula escolhida.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-xl">
          <TabsTrigger value="aulas" className="text-xs font-bold">1. Aula</TabsTrigger>
          <TabsTrigger value="upload" className="text-xs font-bold">2. Upload Excel</TabsTrigger>
          <TabsTrigger value="stats" className="text-xs font-bold">Estatísticas</TabsTrigger>
        </TabsList>

        {/* === AULAS === */}
        <TabsContent value="aulas" className="space-y-4 mt-6">
          {selectedAula && (
            <Card className="p-4 bg-accent/5 border-accent/30 flex items-center justify-between gap-3">
              <div className="text-sm">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Selecionada</span>
                <span className="font-bold">{selectedAula.nome}</span>
              </div>
              <Button size="sm" onClick={() => setTab("upload")} className="font-black gap-2">
                Próximo: Upload <Upload className="h-3.5 w-3.5" />
              </Button>
            </Card>
          )}
          <div className="grid gap-3">
            {aulas.map(a => {
              const stat = stats.find(s => s.aula_id === a.id);
              const tierInfo = (t: number) => t === 1
                ? { l: "Alta", c: "text-red-500", b: "bg-red-500/10", i: <Flame className="h-3 w-3" />, br: "border-red-500/30" }
                : t === 2 ? { l: "Média", c: "text-amber-500", b: "bg-amber-500/10", i: <Zap className="h-3 w-3" />, br: "border-amber-500/20" }
                : { l: "Baixa", c: "text-blue-500", b: "bg-blue-500/10", i: <Clock className="h-3 w-3" />, br: "border-blue-500/10" };
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

        {/* === UPLOAD === */}
        <TabsContent value="upload" className="space-y-6 mt-6">
          <Card className="p-5 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Aula vinculada</span>
            <div className="font-bold text-base">
              {selectedAula ? selectedAula.nome : <span className="text-muted-foreground font-normal">Selecione uma aula na aba anterior.</span>}
            </div>
          </Card>

          <Card className="p-6 space-y-4 bg-accent/5 border-accent/20">
            <div className="flex items-center gap-2 text-accent">
              <Download className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-wider">Passo 1: Template</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Baixe o template oficial. Ele vem com <strong>3 exemplos reais</strong> (um para cada modo).
            </p>
            <Button onClick={downloadTemplate} variant="outline" className="w-full h-10 text-xs font-bold gap-2">
              <Download className="h-3.5 w-3.5" /> Baixar Template com Exemplos
            </Button>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-accent" />
              <span className="text-xs font-black uppercase tracking-wider">Passo 2: Upload da Planilha</span>
            </div>
            <div
              onClick={() => !uploading && selectedAulaId && document.getElementById("excel-upload-aula")?.click()}
              className={cn(
                "h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all",
                !selectedAulaId ? "border-muted opacity-50 cursor-not-allowed" :
                uploading ? "border-accent bg-accent/5 cursor-wait" :
                "border-border/60 hover:border-accent/40 hover:bg-accent/5 cursor-pointer"
              )}
            >
              <input
                id="excel-upload-aula" type="file" className="hidden"
                accept=".xlsx,.xls" onChange={handleExcelUpload} disabled={uploading || !selectedAulaId}
              />
              {uploading ? (
                <>
                  <Loader2 className="h-8 w-8 text-accent animate-spin mb-2" />
                  <p className="text-xs font-bold text-accent">Processando...</p>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-xs font-bold">
                    {selectedAulaId ? "Clique para subir sua planilha" : "Selecione uma aula primeiro"}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Apenas .xlsx ou .xls</p>
                </>
              )}
            </div>
          </Card>

          <Card className="p-5 bg-muted/30 border-border/40 space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
              <HelpCircle className="h-3.5 w-3.5 text-accent" /> Como preencher
            </h4>
            <div className="text-[11px] text-muted-foreground space-y-2 leading-relaxed">
              <p>• <strong>ABCDE:</strong> preencha <code>resposta 1</code> a <code>resposta 5</code> (alternativas A–E) e <code>gabarito</code> (letra ou texto idêntico à correta). Variações não são exigidas.</p>
              <p>• <strong>Lacuna:</strong> use ____ no <code>comando</code>. Preencha apenas <code>resposta 1</code> + <code>variações 1</code>. Deixe gabarito vazio.</p>
              <p>• <strong>OQ Falta:</strong> preencha <code>resposta 1..5</code> com os itens do grupo e <code>variações 1..5</code> com sinônimos de cada um. Deixe gabarito vazio — o app sorteia qual item omitir.</p>
              <p>• OQs aprovados (verificado=true) vão direto para o banco vinculados à aula selecionada.</p>
            </div>
          </Card>
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
    </div>
  );
}
