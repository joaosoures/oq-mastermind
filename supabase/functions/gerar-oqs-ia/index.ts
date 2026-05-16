import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Configuração da API ausente.");

    const systemPrompt = `Você é um especialista em educação médica de alto nível. Sua tarefa é gerar questões de revisão (OQs) baseadas no texto fornecido, otimizadas para memória de longo prazo e residência médica.

NÍVEL DE DIFICULDADE ALVO: ${difficulty.toUpperCase()}
- FACIL: Foco em definições fundamentais, sintomas cardinais patognomônicos e condutas de primeira linha óbvias.
- MEDIO: Foco em raciocínio clínico, critérios diagnósticos completos (ex: Jones, Duke), e efeitos colaterais comuns.
- DIFICIL: Foco em minúcias, exceções a regras gerais, fisiopatologia profunda e condutas em casos de falha terapêutica.

INSTRUÇÕES ESPECÍFICAS POR MODO:
1. MODO 'abcde' (Múltipla Escolha): 5 alternativas plausíveis. Sem "todas/nenhuma das anteriores". A 'resposta' deve ser idêntica a uma das 'opcoes'.
2. MODO 'lacuna': 'pergunta' DEVE conter exatamente uma marcação '[___]'. 'resposta' = termo exato (1-3 palavras).
3. MODO 'oq_falta': Afirmação incompleta SEM '[___]'. Resposta complementa o conceito.

Gere entre 8 e 12 questões variando os modos. Responda EXCLUSIVAMENTE em JSON:
{ "questions": [ { "pergunta": "...", "resposta": "...", "modo": "abcde|lacuna|oq_falta", "opcoes": ["..."] } ] }`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Especialidade: ${specialty}\nOrigem: ${fileName}\nConteúdo:\n${text}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI Gateway Error:", response.status, errText);
      if (response.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em instantes.");
      if (response.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
      throw new Error("Falha na comunicação com a IA.");
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("A IA retornou um formato inválido.");
    }

    const rawQuestions = result.questions || result.oqs || (Array.isArray(result) ? result : []);
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      throw new Error("Nenhuma questão válida foi gerada pela IA.");
    }

    const validatedQuestions = rawQuestions.filter((q: any) => {
      if (!q.pergunta || !q.resposta || !q.modo) return false;
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
  } catch (error: any) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
