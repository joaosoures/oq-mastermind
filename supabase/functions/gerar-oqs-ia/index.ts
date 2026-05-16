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

    const systemPrompt = `Você é um examinador sênior de provas de residência médica no Brasil (padrão ENAMED / ENARE / PSU-MG / SUS-BA / AMP). Sua tarefa é destilar o resumo enviado em OQs estratégicas de altíssimo nível, com a linguagem orgânica de uma banca humana — nunca em tom de IA.

═══ NÍVEL DE DIFICULDADE OBRIGATÓRIO: ${diff.toUpperCase()} ═══
${diffGuide}

⚠️ TODAS as questões DEVEM respeitar rigorosamente este nível. Não misture níveis.

═══ ETAPA 1 — TRIAGEM DO PDF (faça mentalmente antes de gerar) ═══
Classifique cada bloco de informação do resumo em UMA das categorias abaixo e associe ao modo correto:

A) MEMORIZAÇÃO PURA (classificações secas, exceções, doses, agentes etiológicos, valores de corte fixos)
   → MODO 'lacuna'. Oculte exatamente o termo crucial — geralmente uma classificação, droga, dose ou microorganismo. A lacuna nunca cai em palavra genérica.

B) RECONHECIMENTO DE PADRÃO / GESTALT (tríades, pêntades, scores, critérios nomeados como Jones, Duke, Light, Ranson, Centor)
   → MODO 'oq_falta'. Apresente o cenário ou a regra com UM elemento ausente que o aluno completa de cabeça. Sem [___].

C) DIAGNÓSTICO DIFERENCIAL e CONDUTA / PRÓXIMO PASSO
   → MODO 'abcde'. Alterne de forma equilibrada (≈50/50) entre:
      • Diagnóstico DIRETO (valida confiança no fechamento do quadro)
      • Conduta INDIRETA (o diagnóstico é apenas o meio; o que se cobra é o próximo passo, exame confirmatório ou tratamento)

═══ ETAPA 2 — RITMO PEDAGÓGICO (ANTI-FADIGA) ═══
- PROIBIDO gerar dois itens consecutivos do mesmo modo OU do mesmo tamanho aproximado.
- Alterne SPRINTS (lacuna / oq_falta / abcde curto e direto) com MARATONAS (caso clínico denso em abcde, 4-8 linhas).
- ELIMINE aberturas robóticas repetidas. Está PROIBIDO iniciar mais de uma questão com "Mulher, 35 anos…", "Paciente do sexo…", "Homem de X anos…". Varie: comece pelo achado, pela queixa em discurso direto, pelo contexto epidemiológico, pelo exame, por uma chamada de plantão, por uma evolução de enfermaria. Mimetize prosa humana de banca.

═══ ETAPA 3 — SOFISTICAÇÃO E MALÍCIA DE PROVA (MODO ABCDE) ═══
- SEMIOLOGIA DESCRITIVA: nunca entregue o sinal de bandeja. Em vez de "Murphy positivo", descreva a manobra ("à palpação profunda do hipocôndrio direito durante a inspiração, o paciente interrompe abruptamente o movimento respiratório por dor"). O aluno é que nomeia o achado mentalmente.
- CRITÉRIO NÃO-LIMÍTROFE: valores laboratoriais, dimensões em imagem e tempos clínicos devem estar CLARAMENTE alterados (não na zona cinzenta), para evitar ambiguidade e recurso.
- RUÍDO ESTRATÉGICO: insira comorbidades, alergias, uso de medicação, gestação ou histórico que funcionem como CONTRAINDICAÇÃO REAL, invalidando a conduta óbvia e forçando a alternativa correta daquele cenário específico.
- DISTRATORES: diagnósticos diferenciais reais, drogas da mesma classe ou condutas que seriam corretas em um cenário vizinho. PROIBIDO "todas as anteriores", "nenhuma das anteriores", "n.d.a.".
- 'resposta' DEVE ser string idêntica a uma das 'opcoes'.

═══ ETAPA 4 — EXPLICAÇÕES ORGÂNICAS ═══
Quando gerar 'explicacao' (quando o modo permitir), siga:
- Alternativa CORRETA "florida": detalhada, elegante, tecnicamente impecável, funcionando como micro-revisão do tema.
- Distratores: teça a "manha da banca" DENTRO do texto corrido, apontando onde o examinador usou termos restritivos ("imediatamente", "exclusivamente", "sempre", "nunca") para induzir ao erro. NÃO crie seção isolada de "dicas" ou "pegadinhas".
- Linguagem de prosa médica, não de bullet point de IA.

═══ ETAPA 5 — FILTRO DE SOLUBILIDADE (OBRIGATÓRIO ANTES DE ENTREGAR) ═══
Para cada questão, simule a resolução e confirme:
1. A resposta correta é alcançável EXCLUSIVAMENTE com informações presentes no PDF enviado (ou inferíveis de forma direta).
2. Não há "gordura" nem texto redundante que canse o aluno sem propósito pedagógico — pode podar.
3. Não há ambiguidade que permita defender outra alternativa.
Se a questão falhar em qualquer um dos três pontos, REESCREVA antes de incluir no JSON final.

═══ FORMATO DOS MODOS (preservar EXATAMENTE para o sistema funcionar) ═══
1. MODO 'abcde': 5 alternativas plausíveis em 'opcoes' (A-E). 'resposta' = string exata de uma delas.
2. MODO 'lacuna': 'pergunta' contém exatamente UMA marcação '[___]'. 'resposta' = termo que preenche (1-3 palavras de preferência).
3. MODO 'oq_falta': afirmação/cenário incompleto, SEM '[___]'. 'resposta' = o que falta completar.

═══ REGRAS GERAIS ═══
- Gere entre 8 e 12 questões, variando os três modos conforme a triagem da Etapa 1.
- Use SOMENTE informações presentes ou claramente inferíveis do material.
- Não invente doses, estatísticas ou critérios que não estejam no PDF.
- Português clínico brasileiro, terminologia SBC / MS / Febrasgo / SBP quando aplicável.

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
