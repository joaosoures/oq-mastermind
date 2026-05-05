import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { text, fileName, specialty, difficulty = "medio" } = await req.json();

    if (!text || text.length < 50) {
      throw new Error("O conteúdo fornecido é insuficiente para gerar questões de qualidade.");
    }

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) throw new Error("Configuração da API ausente.");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em educação médica de alto nível. Sua tarefa é gerar questões de revisão (OQs) baseadas no texto fornecido, otimizadas para memória de longo prazo e residência médica.

            NÍVEL DE DIFICULDADE ALVO: ${difficulty.toUpperCase()}
            - FACIL: Foco em definições fundamentais, sintomas cardinais patognomônicos e condutas de primeira linha óbvias.
            - MEDIO: Foco em raciocínio clínico, critérios diagnósticos completos (ex: Jones, Duke), e efeitos colaterais comuns.
            - DIFICIL: Foco em minúcias, exceções a regras gerais, fisiopatologia profunda e condutas em casos de falha terapêutica.

            INSTRUÇÕES ESPECÍFICAS POR MODO:
            1. MODO 'abcde' (Múltipla Escolha):
               - Crie 5 alternativas plausíveis (A a E).
               - Evite alternativas como "todas as anteriores" ou "nenhuma das anteriores".
               - A 'resposta' deve ser exatamente igual a uma das 'opcoes'.

            2. MODO 'lacuna' (Flashcard de Preenchimento):
               - A 'pergunta' DEVE conter exatamente uma marcação '[___]' onde a informação crucial foi omitida.
               - A 'resposta' deve ser o termo exato que preenche a lacuna (preferencialmente 1 a 3 palavras).
               - Exemplo: "O agente etiológico mais comum da pneumonia típica é o [___]." | Resposta: "Streptococcus pneumoniae".

            3. MODO 'oq_falta' (Complementação de Conceito):
               - A 'pergunta' deve ser uma afirmação incompleta ou um cenário que exige uma conclusão lógica.
               - NÃO use '[___]' aqui. Use uma frase que instigue o complemento.
               - Exemplo: "Ao identificar um paciente com supra de ST em parede anterior no ECG, a conduta imediata deve ser..." | Resposta: "Cineangiocoronariografia de urgência (Angioplastia)".

            REGRAS DE FORMATO JSON:
            - Gere entre 8 e 12 questões variando os modos.
            - Responda EXCLUSIVAMENTE em formato JSON com a seguinte estrutura:
            {
              "questions": [
                {
                  "pergunta": "...",
                  "resposta": "...",
                  "modo": "abcde" | "lacuna" | "oq_falta",
                  "opcoes": ["...", "...", "...", "...", "..."] // Obrigatório APENAS se modo for 'abcde'
                }
              ]
            }`
          },
          {
            role: "user",
            content: `Especialidade: ${specialty}\nOrigem: ${fileName}\nConteúdo para basear as questões:\n${text}`
          }
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI Error:", errorData);
      throw new Error("Falha na comunicação com a IA.");
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    let result;
    
    try {
      result = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("A IA retornou um formato inválido.");
    }
    
    const rawQuestions = result.questions || result.oqs || (Array.isArray(result) ? result : []);
    
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      throw new Error("Nenhuma questão válida foi gerada pela IA.");
    }

    const validatedQuestions = rawQuestions.filter(q => {
      const hasBasicFields = q.pergunta && q.resposta && q.modo;
      if (!hasBasicFields) return false;
      
      if (q.modo === "abcde") {
        return Array.isArray(q.opcoes) && q.opcoes.length >= 4 && q.opcoes.includes(q.resposta);
      }
      
      return true;
    });

    if (validatedQuestions.length === 0) {
      throw new Error("As questões geradas não passaram na validação de formato.");
    }

    return new Response(JSON.stringify({ questions: validatedQuestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});