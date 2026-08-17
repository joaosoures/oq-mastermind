import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, FileSpreadsheet, X, Download } from "lucide-react";

export default function AdminGerarSimulado({ onFinished }: { onFinished: () => void }) {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!nome.trim()) {
      toast.error("Informe o nome do simulado.");
      return;
    }
    if (!file) {
      toast.error("Selecione um arquivo Excel/CSV.");
      return;
    }

    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      const ws = wb.worksheets[0];

      const rows: any[] = [];
      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        const values: any[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          const v = cell.value;
          values.push(v && typeof v === "object" && "text" in v ? (v as any).text : v);
        });
        rows.push(values);
      });

      // Create Simulado
      const { data: sim, error: simErr } = await supabase
        .from("simulados")
        .insert({ nome, criado_por: user?.id })
        .select()
        .single();

      if (simErr) throw simErr;

      // Process questions
      const questions = rows.map((r, idx) => {
        const esp = String(r[0] || "").trim();
        const comando = String(r[1] || "").trim();
        const opA = String(r[2] || "").trim();
        const opB = String(r[3] || "").trim();
        const opC = String(r[4] || "").trim();
        const opD = String(r[5] || "").trim();
        const opE = String(r[6] || "").trim();
        const gab = String(r[7] || "").trim().toUpperCase();
        const exp1 = String(r[8] || "").trim();
        const exp2 = String(r[9] || "").trim();
        const exp3 = String(r[10] || "").trim();

        return {
          simulado_id: sim.id,
          especialidade: esp,
          comando,
          opcao_a: opA || null,
          opcao_b: opB || null,
          opcao_c: opC || null,
          opcao_d: opD || null,
          opcao_e: opE || null,
          gabarito: gab,
          explicacao_1: exp1 || null,
          explicacao_2: exp2 || null,
          explicacao_3: exp3 || null,
          ordem: idx
        };
      }).filter(q => q.comando && q.gabarito);

      const { error: qErr } = await supabase.from("simulado_questoes").insert(questions);
      if (qErr) throw qErr;

      toast.success("Simulado criado com sucesso!");
      onFinished();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao processar simulado: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight">Novo Simulado</h2>
        <Button variant="ghost" size="icon" onClick={onFinished}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome do Simulado</Label>
          <Input 
            id="nome" 
            placeholder="Ex: Simulado Geral 2024" 
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Arquivo Excel/CSV</Label>
          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-muted hover:border-accent/50'}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) setFile(f);
            }}
          >
            <input 
              type="file" 
              id="file-upload" 
              className="hidden" 
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
              }}
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
              {file ? (
                <>
                  <FileSpreadsheet className="h-10 w-10 text-emerald-500" />
                  <p className="font-bold text-emerald-700">{file.name}</p>
                  <p className="text-xs text-muted-foreground">Clique para trocar o arquivo</p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="font-bold">Arraste ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground">Suporta .xlsx e .csv</p>
                </>
              )}
            </label>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-2">
            Colunas: Especialidade | comando | resposta 1..5 | gabarito | explicação 1..3
          </p>
        </div>

        <Button 
          className="w-full h-12 rounded-xl font-bold bg-accent text-accent-foreground hover:opacity-90"
          onClick={handleUpload}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : "Criar Simulado"}
        </Button>
      </Card>
    </div>
  );
}
