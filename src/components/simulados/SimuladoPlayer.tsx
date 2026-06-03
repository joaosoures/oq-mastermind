import { useState, useEffect } from "react";
import { motion } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, ChevronLeft, ChevronRight, CheckCircle2, 
  XCircle, BarChart3, ChevronDown, ChevronUp, Info 
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Question {
  id: string;
  comando: string;
  opcao_a: string;
  opcao_b: string;
  opcao_c: string;
  opcao_d: string;
  opcao_e: string;
  gabarito: string;
  explicacao_1: string;
  explicacao_2: string;
  explicacao_3: string;
}

export default function SimuladoPlayer({ 
  simuladoId, 
  onClose 
}: { 
  simuladoId: string; 
  onClose: () => void 
}) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    tentativaId: string;
    acertos: number;
    total: number;
    respostas: any[];
  } | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, [simuladoId]);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from("simulado_questoes")
        .select("*")
        .eq("simulado_id", simuladoId)
        .order("ordem", { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar questões do simulado.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      let acertos = 0;
      const results = questions.map(q => {
        const resp = answers[q.id];
        const acertou = resp === q.gabarito;
        if (acertou) acertos++;
        return { questao_id: q.id, resposta_marcada: resp, acertou };
      });

      // Save attempt
      const { data: tentativa, error: tErr } = await supabase
        .from("simulado_tentativas")
        .insert({
          simulado_id: simuladoId,
          usuario_id: user.id,
          acertos,
          erros: questions.length - acertos,
          total_questoes: questions.length
        })
        .select()
        .single();

      if (tErr) throw tErr;

      // Save individual answers
      const answersToInsert = results.map(r => ({
        tentativa_id: tentativa.id,
        ...r
      }));

      const { error: rErr } = await supabase.from("simulado_respostas_aluno").insert(answersToInsert);
      if (rErr) throw rErr;

      setResult({
        tentativaId: tentativa.id,
        acertos,
        total: questions.length,
        respostas: results
      });
      toast.success("Simulado finalizado!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar resultado: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
      <p className="text-sm font-bold animate-pulse">CARREGANDO SIMULADO...</p>
    </div>
  );

  if (result) {
    const percent = Math.round((result.acertos / result.total) * 100);
    return (
      <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 max-w-4xl mx-auto pb-20">
        <div className="text-center space-y-4">
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-4 py-1">Simulado Concluído</Badge>
          <h2 className="text-4xl font-black tracking-tighter">Seu Desempenho</h2>
        </div>

        <Card className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-around gap-8 text-center">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest font-black opacity-60">Acertos</p>
              <p className="text-5xl font-black text-emerald-400">{result.acertos}</p>
            </div>
            <div className="w-32 h-32 rounded-full border-4 border-white/10 flex items-center justify-center relative">
              <span className="text-3xl font-black">{percent}%</span>
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="64" cy="64" r="60"
                  fill="none" stroke="currentColor" strokeWidth="8"
                  strokeDasharray={`${(percent / 100) * 377} 377`}
                  className="text-emerald-500 transition-all duration-1000 ease-out"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest font-black opacity-60">Erros</p>
              <p className="text-5xl font-black text-rose-400">{result.total - result.acertos}</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <BarChart3 className="w-32 h-32" />
          </div>
        </Card>

        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Info className="h-5 w-5 text-accent" />
            Revisão das Questões
          </h3>
          <Accordion type="single" collapsible className="space-y-3">
            {questions.map((q, i) => {
              const res = result.respostas.find(r => r.questao_id === q.id);
              const acertou = res?.acertou;
              return (
                <AccordionItem 
                  key={q.id} 
                  value={q.id} 
                  className={cn(
                    "border rounded-2xl overflow-hidden transition-all duration-300 px-4",
                    acertou ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"
                  )}
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-4 text-left">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                        acertou ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                      )}>
                        {acertou ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Questão {i + 1}</p>
                        <p className="font-bold line-clamp-1 text-sm md:text-base leading-snug">
                          {q.comando}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 pt-2 space-y-6">
                    <div className="space-y-3">
                      {['a', 'b', 'c', 'd', 'e'].map((l) => {
                        const letter = l.toUpperCase();
                        const text = (q as any)[`opcao_${l}`];
                        if (!text) return null;
                        
                        const isCorrect = letter === q.gabarito;
                        const isSelected = letter === res?.resposta_marcada;

                        return (
                          <div 
                            key={l}
                            className={cn(
                              "p-4 rounded-xl border-2 text-sm font-medium transition-all flex items-start gap-3",
                              isCorrect ? "bg-emerald-500/10 border-emerald-500 text-emerald-900" : 
                              isSelected ? "bg-rose-500/10 border-rose-500 text-rose-900" : 
                              "bg-white border-slate-100 text-slate-600"
                            )}
                          >
                            <span className="font-black opacity-50">{letter}.</span>
                            <span className="flex-1">{text}</span>
                            {isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />}
                            {!isCorrect && isSelected && <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid gap-3 pt-4">
                      {q.explicacao_1 && (
                        <div className="p-4 bg-blue-500/10 border-l-4 border-blue-500 rounded-r-xl">
                          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Explicação 1</p>
                          <p className="text-sm font-medium leading-relaxed">{q.explicacao_1}</p>
                        </div>
                      )}
                      {q.explicacao_2 && (
                        <div className="p-4 bg-indigo-500/10 border-l-4 border-indigo-500 rounded-r-xl">
                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">Explicação 2</p>
                          <p className="text-sm font-medium leading-relaxed">{q.explicacao_2}</p>
                        </div>
                      )}
                      {q.explicacao_3 && (
                        <div className="p-4 bg-violet-500/10 border-l-4 border-violet-500 rounded-r-xl">
                          <p className="text-[10px] font-black uppercase tracking-widest text-violet-600 mb-1">Explicação 3</p>
                          <p className="text-sm font-medium leading-relaxed">{q.explicacao_3}</p>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        <Button 
          onClick={onClose}
          className="w-full h-14 rounded-2xl font-black text-lg bg-slate-900 text-white hover:bg-slate-800 shadow-xl"
        >
          Voltar aos Materiais
        </Button>
      </div>
    );
  }

  const currentQ = questions[idx];
  const total = questions.length;
  const progress = ((idx + 1) / total) * 100;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="shrink-0 space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-accent bg-accent/10 px-3 py-1 rounded-full">SIMULADO</span>
            <span className="text-xs font-mono font-bold opacity-40">{idx + 1} / {total}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">Sair</Button>
        </div>
        <Progress value={progress} className="h-2 rounded-full" />
      </div>

      {/* Question Card */}
      <Card className="flex-1 overflow-hidden flex flex-col shadow-2xl rounded-[2rem] border-white/5 bg-card/50 backdrop-blur-sm relative">
        <div className="flex-1 overflow-y-auto px-6 py-8 md:px-10 md:py-12 space-y-8 minimal-scroll">
          <h2 className="text-xl md:text-2xl font-bold leading-tight">
            {currentQ?.comando}
          </h2>

          <div className="space-y-4">
            {['a', 'b', 'c', 'd', 'e'].map((l) => {
              const letter = l.toUpperCase();
              const text = (currentQ as any)[`opcao_${l}`];
              if (!text) return null;
              
              const isSelected = answers[currentQ.id] === letter;

              return (
                <button
                  key={l}
                  onClick={() => setAnswers(prev => ({ ...prev, [currentQ.id]: letter }))}
                  className={cn(
                    "w-full p-5 md:p-6 rounded-2xl text-left transition-all duration-300 flex items-start gap-4 border-2 group relative overflow-hidden",
                    isSelected 
                      ? "bg-accent text-accent-foreground border-accent shadow-lg scale-[1.02]" 
                      : "bg-white/50 border-border hover:border-accent/40 hover:bg-accent/5"
                  )}
                >
                  <span className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0",
                    isSelected ? "bg-white/20" : "bg-muted text-muted-foreground group-hover:bg-accent/10"
                  )}>
                    {letter}
                  </span>
                  <span className="flex-1 font-medium leading-snug">{text}</span>
                  {isSelected && (
                    <motion.div 
                      layoutId="check"
                      className="shrink-0 mt-1"
                    >
                      <CheckCircle2 className="h-6 w-6" />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 p-6 md:p-8 bg-slate-50 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button 
              disabled={true} 
              variant="outline" 
              className="opacity-50 h-12 rounded-xl border-dashed border-2 px-6"
            >
              💡 Dicas Bloqueadas
            </Button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="secondary"
              className="h-12 rounded-xl flex-1 sm:flex-none px-6"
              disabled={idx === 0}
              onClick={() => setIdx(idx - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
            </Button>

            {idx + 1 === total ? (
              <Button
                className="h-12 rounded-xl flex-1 sm:flex-none px-10 font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                onClick={handleFinish}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Finalizar Prova"}
              </Button>
            ) : (
              <Button
                className="h-12 rounded-xl flex-1 sm:flex-none px-10 font-black bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => setIdx(idx + 1)}
              >
                Próxima <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
