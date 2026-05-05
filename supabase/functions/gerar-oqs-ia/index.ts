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
            content: `Você é um especialista em educação médica. Sua tarefa é gerar questões de alta qualidade (OQs) baseadas no texto fornecido para revisão de residência médica.

            REGRAS DE FORMATO:
            - Gere entre 6 e 12 questões.
            - Responda EXCLUSIVAMENTE em formato JSON com a seguinte estrutura:
            {
              "questions": [
                {
                  "pergunta": "Texto da pergunta...",
                  "resposta": "Texto da resposta correta",
                  "modo": "abcde" | "lacuna" | "oq_falta",
                  "opcoes": ["Opção A", "Opção B", "Opção C", "Opção D", "Opção E"] // Obrigatório APENAS se modo for 'abcde'
                }
              ]
            }
            - Se o modo for 'abcde', a 'resposta' deve ser IGUAL a uma das strings dentro de 'opcoes'.
            - Se o modo for 'lacuna', a pergunta deve conter '[___]'.
            - Se o modo for 'oq_falta', a pergunta deve ser um conceito incompleto que requer complementação.`
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