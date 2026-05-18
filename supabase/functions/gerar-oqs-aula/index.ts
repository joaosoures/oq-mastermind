import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL_WHITELIST = new Set([
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
]);

function extractDriveId(url: string): string | null {
  if (!url) return null;
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  const m3 = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (m3) return m3[1];
  return null;
}

async function fetchPdfAsBase64(link: string): Promise<{ base64: string; mime: string } | null> {
  const driveId = extractDriveId(link);
  const urls = driveId ? [
    `https://drive.google.com/uc?export=download&id=${driveId}`,
    `https://docs.google.com/uc?export=download&id=${driveId}`,
    `https://docs.google.com/document/d/${driveId}/export?format=pdf`,
  ] : [link];

  for (const u of urls) {
    try {
      const r = await fetch(u, { redirect: "follow" });
      if (!r.ok) continue;
      const ct = r.headers.get("content-type") || "application/pdf";
      if (ct.includes("text/html")) continue; // Drive quota / login page
      const buf = new Uint8Array(await r.arrayBuffer());
      if (buf.byteLength < 1000) continue;
      // base64 encode
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      const base64 = btoa(bin);
      return { base64, mime: ct.split(";")[0] || "application/pdf" };
    } catch (e) {
      console.error("[gerar-oqs-aula] fetch pdf falhou", u, e);
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI indisponível.", code: "AI_KEY_MISSING" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(supaUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    const admin = createClient(supaUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Acesso restrito a administradores" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const materialId = body.material_id || body.aula_id;
    const { modelo, prompt_override } = body;
    if (!materialId) {
      return new Response(JSON.stringify({ error: "material_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: material, error: matErr } = await admin
      .from("materiais").select("*").eq("id", materialId).maybeSingle();
    if (matErr || !material) {
      return new Response(JSON.stringify({ error: "Material não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!material.link_1 || material.tipo_1 !== "PDF") {
      return new Response(JSON.stringify({ error: "Material sem resumo em PDF (link_1)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const pdf = await fetchPdfAsBase64(material.link_1);
    if (!pdf) {
      return new Response(JSON.stringify({ error: "Não foi possível baixar o PDF da aula." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: promptRow } = await admin
      .from("ia_prompts").select("*").eq("chave", "gerar_oqs_aula").maybeSingle();

    const systemPrompt = (prompt_override && String(prompt_override).trim().length > 50)
      ? String(prompt_override)
      : (promptRow?.prompt ?? "");

    const chosenModel = MODEL_WHITELIST.has(modelo) ? modelo : (promptRow?.modelo_padrao || "google/gemini-2.5-flash");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: chosenModel,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Gere de 8 a 12 OQs a partir do resumo (PDF) da aula abaixo.\n\nAula: ${material.nome}\nEspecialidade: ${material.especialidade}`,
              },
              {
                type: "image_url",
                image_url: { url: `data:${pdf.mime};base64,${pdf.base64}` },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.text();
      console.error("[gerar-oqs-aula] AI gateway falhou", aiRes.status, errBody.slice(0, 300));
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições. Tente em instantes.", code: "AI_RATE_LIMIT" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados.", code: "AI_CREDITS_EXHAUSTED" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "Falha no provedor de IA.", code: "AI_UPSTREAM_ERROR" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiRes.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    let result: any;
    try { result = JSON.parse(content); } catch {
      return new Response(JSON.stringify({ error: "Resposta da IA em formato inesperado." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const raw = result.questions || result.oqs || (Array.isArray(result) ? result : []);
    const validated = (Array.isArray(raw) ? raw : []).filter((q: any) => {
      if (!q?.pergunta || !q?.resposta || !q?.modo) return false;
      if (q.modo === "abcde") return Array.isArray(q.opcoes) && q.opcoes.length >= 4 && q.opcoes.includes(q.resposta);
      if (q.modo === "lacuna") return String(q.pergunta).includes("[___]");
      return true;
    }).map((q: any) => ({
      ...q,
      explicacao: q.explicacao || "Gerado por IA a partir da aula.",
      variacoes: q.variacoes || "",
    }));

    if (validated.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma questão válida gerada.", code: "AI_NO_VALID_QUESTIONS" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const toInsert = validated.map((q: any) => ({
      user_id: userId,
      pergunta: q.pergunta,
      resposta: q.resposta,
      variacoes: q.variacoes,
      modo: q.modo,
      especialidade: material.especialidade,
      opcoes: q.opcoes ?? null,
      explicacao: q.explicacao,
      contexto_origem: `Aula: ${material.nome}`,
      aula_id: material.id,
      modelo_ia: chosenModel,
    }));
    const { error: insErr } = await admin.from("temp_oqs").insert(toInsert);
    if (insErr) {
      console.error("[gerar-oqs-aula] insert temp_oqs falhou", insErr);
      return new Response(JSON.stringify({ error: "Falha ao salvar OQs gerados." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ questions: validated, modelo: chosenModel }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[gerar-oqs-aula] erro", error?.message);
    return new Response(JSON.stringify({ error: "Erro interno." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
