import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface ApiKey {
  id: string;
  provider: string;
  key_value: string;
  label: string;
}

type AiCallResult =
  | { ok: true; content: string }
  | { ok: false; status: number; body: string };

function normalizeProvider(provider: string) {
  return (provider || "lovable_gateway").toLowerCase();
}

async function requestQuestions(
  keyInfo: ApiKey,
  systemPrompt: string,
  userPrompt: string,
): Promise<AiCallResult> {
  const provider = normalizeProvider(keyInfo.provider);
  const apiKey = keyInfo.key_value.trim();

  if (provider === "google") {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
      }),
    });

    const body = await res.text();
    if (!res.ok) return { ok: false, status: res.status, body };

    const data = JSON.parse(body);
    const content = data?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text ?? "")
      .join("") ?? "";
    return { ok: true, content };
  }

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const body = await res.text();
    if (!res.ok) return { ok: false, status: res.status, body };

    const data = JSON.parse(body);
    const content = data?.content
      ?.map((part: any) => part?.type === "text" ? part?.text ?? "" : "")
      .join("") ?? "";
    return { ok: true, content };
  }

  let endpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
  let model = "google/gemini-2.0-flash";

  if (provider === "openai") {
    endpoint = "https://api.openai.com/v1/chat/completions";
    model = "gpt-4o-mini";
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  const body = await res.text();
  if (!res.ok) return { ok: false, status: res.status, body };

  const data = JSON.parse(body);
  return { ok: true, content: data.choices?.[0]?.message?.content ?? "" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();

  try {
    const { text, fileName, specialty, difficulty = "medio" } = await req.json();

    if (!text || text.length < 50) {
      return new Response(
        JSON.stringify({ error: "O conteúdo enviado é muito curto para gerar boas questões.", code: "CONTENT_TOO_SHORT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Inicializa Supabase para buscar chaves reservas
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Lista de chaves a tentar
    const keysToTry: ApiKey[] = [];

    // 1. Tenta a chave padrão Lovable
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      keysToTry.push({
        id: "default_lovable",
        provider: "lovable_gateway",
        key_value: LOVABLE_API_KEY,
        label: "Padrão Lovable"
      });
    }

    // 2. Busca chaves reservas do banco
    const { data: dbKeys } = await supabase
      .from("api_keys_pool")
      .select("id, provider, key_value, label")
      .eq("is_active", true)
      .order("priority", { ascending: true });

    if (dbKeys) {
      keysToTry.push(...dbKeys);
    }

    if (keysToTry.length === 0) {
      return new Response(
        JSON.stringify({
          error: "O serviço de IA está temporariamente indisponível (sem chaves configuradas).",
          code: "AI_KEY_MISSING",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const diff = (difficulty as string).toLowerCase();
    const diffGuide = DIFFICULTY_GUIDE[diff] ?? DIFFICULTY_GUIDE.medio;

    const systemPrompt = `Você é um examinador sênior de provas de residência médica no Brasil... (instruções omitidas para brevidade na edição, mas mantidas no código real)`;
    // Nota: Vou manter o prompt completo no arquivo final, mas aqui uso uma versão resumida para o pensamento
    
    // Re-inserindo o prompt completo para garantir integridade
    const fullSystemPrompt = `Você é um examinador sênior de provas de residência médica no Brasil (padrão ENAMED / ENARE / PSU-MG / SUS-BA / AMP). Sua tarefa é destilar o resumo enviado em OQs estratégicas de altíssimo nível, com a linguagem orgânica de uma banca humana — nunca em tom de IA.

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

═══ ETAPA 4 — EXPLICAÇÕES ORGÂNICAS E VARIAÇÕES ═══
Quando gerar 'explicacao', siga:
- Alternativa CORRETA "florida": detalhada, elegante, tecnicamente impecável, funcionando como micro-revisão do tema.
- Distratores: teça a "manha da banca" DENTRO do texto corrido, apontando onde o examinador usou termos restritivos ("imediatamente", "exclusivamente", "sempre", "nunca") para induzir ao erro. NÃO crie seção isolada de "dicas" ou "pegadinhas".
- Linguagem de prosa médica, não de bullet point de IA.

═══ ETAPA 5 — VARIAÇÕES DE RESPOSTA (OBRIGATÓRIO PARA 'lacuna' e 'oq_falta') ═══
- Para modos 'lacuna' e 'oq_falta', forneça o campo 'variacoes' com sinônimos médicos, abreviações comuns ou termos equivalentes aceitáveis (ex: "ICC; insuficiência cardíaca; insuficiencia cardiaca congestiva").
- A 'resposta' principal deve ser DIRETA (1-3 palavras), nunca frases completas. O aluno precisa digitar exatamente ou um sinônimo.

═══ ETAPA 6 — FILTRO DE SOLUBILIDADE (OBRIGATÓRIO ANTES DE ENTREGAR) ═══
Para cada questão, simule a resolução e confirme:
1. A resposta correta é alcançável EXCLUSIVAMENTE com informações presentes no PDF enviado (ou inferíveis de forma direta).
2. Não há "gordura" nem texto redundante que canse o aluno sem propósito pedagógico — pode podar.
3. Não há ambiguidade que permita defender outra alternativa.
Se a questão falhar em qualquer um dos três pontos, REESCREVA antes de incluir no JSON final.

═══ FORMATO DOS MODOS (preservar EXATAMENTE para o sistema funcionar) ═══
1. MODO 'abcde': 5 alternativas plausíveis em 'opcoes' (A-E). 'resposta' = string exata de uma delas.
2. MODO 'lacuna': 'pergunta' contém exatamente UMA marcação '[___]'. 'resposta' = termo que preenche (1-3 palavras). 'variacoes' = sinônimos.
3. MODO 'oq_falta': afirmação/cenário incompleto, SEM '[___]'. 'resposta' = o que falta completar (1-3 palavras). 'variacoes' = sinônimos.

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
      "variacoes": "...",
      "modo": "abcde" | "lacuna" | "oq_falta",
      "opcoes": ["A","B","C","D","E"],
      "explicacao": "..."
    }
  ]
}`;

    let lastError = null;

    // Loop de tentativas
    for (const keyInfo of keysToTry) {
      console.log(`[gerar-oqs-ia] tentando chave: ${keyInfo.label} (${keyInfo.provider})`);
      
      try {
        const aiRes = await requestQuestions(
          keyInfo,
          fullSystemPrompt,
          `Gere de 8 a 12 OQs de nível ${diff.toUpperCase()} com base no texto abaixo.\n\nEspecialidade: ${specialty}\nOrigem: ${fileName}\n\nConteúdo:\n${text}`,
        );

        if (aiRes.ok) {
          const content = aiRes.content;
          
          let result: any;
          try {
            result = JSON.parse(content);
          } catch {
            console.error(`[gerar-oqs-ia] chave ${keyInfo.label} retornou JSON inválido`);
            continue; // Tenta próxima chave
          }

          const raw = result.questions || result.oqs || (Array.isArray(result) ? result : []);
          const validated = (Array.isArray(raw) ? raw : []).filter((q: any) => {
            if (!q?.pergunta || !q?.resposta || !q?.modo) return false;
            return true;
          }).map((q: any) => ({
            ...q,
            explicacao: q.explicacao || "Gerado por IA com base no material enviado.",
            variacoes: q.variacoes || ""
          }));

          if (validated.length > 0) {
            // Sucesso! Atualiza metadados
            await supabase.from("api_keys_pool").update({ 
              last_used_at: new Date().toISOString(),
              error_count: 0 
            }).eq("id", keyInfo.id);

            return new Response(JSON.stringify({ questions: validated, difficulty: diff }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          const errBody = aiRes.body;
          console.error(`[gerar-oqs-ia] chave ${keyInfo.label} falhou: ${aiRes.status}`, errBody.slice(0, 200));
          
          // Registra erro no banco se não for a chave padrão
          if (keyInfo.id !== "default_lovable") {
            await supabase.rpc("increment_key_error", { _id: keyInfo.id, _error: `HTTP ${aiRes.status}: ${errBody.slice(0, 100)}` });
          }
          
          lastError = { status: aiRes.status, body: errBody };
        }
      } catch (e: any) {
        console.error(`[gerar-oqs-ia] erro fatal na chave ${keyInfo.label}:`, e.message);
        lastError = { status: 500, body: e.message };
      }
    }

    // Se chegou aqui, todas as chaves falharam
    return new Response(
      JSON.stringify({ 
        error: "Todas as tentativas de geração falharam. Por favor, tente novamente em alguns instantes.", 
        code: "ALL_KEYS_FAILED",
        details: lastError 
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[gerar-oqs-ia] erro crítico:", error?.message);
    return new Response(
      JSON.stringify({ error: "Erro interno no servidor.", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});