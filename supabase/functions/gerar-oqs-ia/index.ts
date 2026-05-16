import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DIFFICULTY_GUIDE: Record<string, string> = {
  facil:
    "Foco em DEFINIÇÕES FUNDAMENTAIS, sintomas cardinais patognomônicos, achados clássicos e condutas de primeira linha óbvias. Linguagem direta, sem pegadinhas. Ideal para fixação inicial.",
  medio:
    "Foco em RACIOCÍNIO CLÍNICO, critérios diagnósticos completos (ex.: Jones, Duke, Light, CURB-65), diagnósticos diferenciais comuns, efeitos colaterais frequentes e segunda linha de tratamento. Exige integração de 2-3 conceitos.",
  dificil:
    "Foco em MINÚCIAS DE PROVA: exceções a regras, fisiopatologia profunda, condutas em falha terapêutica, interações medicamentosas, achados raros, casos atípicos e armadilhas clássicas. Exige domínio fino do tema. Sem perguntas óbvias.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();

  try {
    const { text, fileName, specialty, difficulty = "medio" } = await req.json();

    if (!text || text.length < 50) {
      return new Response(
        JSON.stringify({ error: "O conteúdo enviado é muito curto para gerar boas questões. Envie um material com pelo menos algumas frases.", code: "CONTENT_TOO_SHORT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    console.log("[gerar-oqs-ia] env check", {
      hasLovableKey: !!LOVABLE_API_KEY,
      lovableKeyLen: LOVABLE_API_KEY?.length ?? 0,
      specialty,
      difficulty,
      textLen: text.length,
      fileName,
    });

    if (!LOVABLE_API_KEY) {
      console.error("[gerar-oqs-ia] LOVABLE_API_KEY ausente no ambiente da Edge Function");
      return new Response(
        JSON.stringify({
          error: "O serviço de IA está temporariamente indisponível. A equipe já foi avisada — tente novamente em alguns minutos.",
          code: "AI_KEY_MISSING",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const diff = (difficulty as string).toLowerCase();
    const diffGuide = DIFFICULTY_GUIDE[diff] ?? DIFFICULTY_GUIDE.medio;

    const systemPrompt = `Você é um professor especialista em educação médica para residência (R1/R3) no Brasil. Sua tarefa é gerar questões de revisão (OQs) baseadas no texto fornecido, otimizadas para memória de longo prazo via spaced repetition.

═══ NÍVEL DE DIFICULDADE OBRIGATÓRIO: ${diff.toUpperCase()} ═══
${diffGuide}

⚠️ TODAS as questões geradas DEVEM respeitar rigorosamente este nível. Não misture níveis.

═══ MODOS DE QUESTÃO ═══
1. MODO 'abcde' (Múltipla Escolha):
   - Exatamente 5 alternativas plausíveis (A-E).
   - Distratores devem ser realistas (diagnósticos diferenciais, drogas da mesma classe, etc.).
   - PROIBIDO: "todas as anteriores", "nenhuma das anteriores", "n.d.a.".
   - 'resposta' DEVE ser idêntica (string exata) a uma das 'opcoes'.

2. MODO 'lacuna' (Flashcard de Preenchimento):
   - 'pergunta' DEVE conter exatamente UMA marcação '[___]'.
   - 'resposta' = termo exato que preenche (preferencialmente 1-3 palavras).
   - Ex.: "O agente etiológico mais comum da pneumonia típica é o [___]." → "Streptococcus pneumoniae".

3. MODO 'oq_falta' (Complementação de Conceito):
   - Afirmação ou cenário incompleto. SEM '[___]'.
   - Ex.: "Ao identificar supra de ST em parede anterior, a conduta imediata é..." → "Angioplastia primária de urgência".

═══ REGRAS DE QUALIDADE ═══
- Gere entre 8 e 12 questões, VARIANDO os três modos.
- Use SOMENTE informações presentes ou claramente inferíveis do texto fornecido.
- Não invente dados, doses ou estatísticas que não estejam no material.
- Português clínico brasileiro, terminologia da SBC/MS quando aplicável.

═══ FORMATO DE RESPOSTA (JSON ESTRITO) ═══
{
  "questions": [
    {
      "pergunta": "...",
      "resposta": "...",
      "modo": "abcde" | "lacuna" | "oq_falta",
      "opcoes": ["A","B","C","D","E"]  // APENAS quando modo = "abcde"
    }
  ]
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Especialidade: ${specialty}\nDificuldade alvo: ${diff.toUpperCase()}\nOrigem: ${fileName}\n\nConteúdo base:\n${text}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.text();
      console.error("[gerar-oqs-ia] AI Gateway falhou", { status: aiRes.status, body: errBody.slice(0, 500) });

      if (aiRes.status === 401 || aiRes.status === 403) {
        return new Response(
          JSON.stringify({
            error: "Não conseguimos acessar o serviço de IA agora. Tente novamente em instantes.",
            code: "AI_KEY_INVALID",
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Muitos alunos estão gerando OQs agora. Aguarde um minuto e tente de novo.",
            code: "AI_RATE_LIMIT",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Os créditos de IA do mês acabaram. Avisamos a equipe para repor o quanto antes.",
            code: "AI_CREDITS_EXHAUSTED",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "A IA não conseguiu responder agora. Tente novamente em alguns instantes.", code: "AI_UPSTREAM_ERROR" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await aiRes.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    let result: any;
    try {
      result = JSON.parse(content);
    } catch {
      console.error("[gerar-oqs-ia] resposta da IA não é JSON válido", content.slice(0, 400));
      return new Response(
        JSON.stringify({ error: "A IA retornou em um formato inesperado. Tente novamente.", code: "AI_BAD_JSON" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const raw = result.questions || result.oqs || (Array.isArray(result) ? result : []);
    const validated = (Array.isArray(raw) ? raw : []).filter((q: any) => {
      if (!q?.pergunta || !q?.resposta || !q?.modo) return false;
      if (q.modo === "abcde") {
        return Array.isArray(q.opcoes) && q.opcoes.length >= 4 && q.opcoes.includes(q.resposta);
      }
      if (q.modo === "lacuna") return String(q.pergunta).includes("[___]");
      return true;
    });

    if (validated.length === 0) {
      console.error("[gerar-oqs-ia] nenhuma questão passou na validação", { raw: raw?.slice?.(0, 2) });
      return new Response(
        JSON.stringify({ error: "Nenhuma questão válida foi gerada desta vez. Tente outro trecho do material.", code: "AI_NO_VALID_QUESTIONS" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[gerar-oqs-ia] sucesso", {
      generated: validated.length,
      durationMs: Date.now() - startedAt,
      difficulty: diff,
    });

    return new Response(JSON.stringify({ questions: validated, difficulty: diff }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[gerar-oqs-ia] erro inesperado", error?.message, error?.stack);
    return new Response(
      JSON.stringify({ error: "Algo deu errado ao gerar suas OQs. Tente novamente em alguns instantes.", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
