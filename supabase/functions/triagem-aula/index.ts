import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      if (ct.includes("text/html")) continue;
      const buf = new Uint8Array(await r.arrayBuffer());
      if (buf.byteLength < 1000) continue;
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      return { base64: btoa(bin), mime: ct.split(";")[0] || "application/pdf" };
    } catch (e) {
      console.error("[triagem-aula] fetch pdf falhou", u, e);
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

    const userClient = createClient(supaUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    const admin = createClient(supaUrl, serviceKey);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Apenas administradores" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { material_id, modelo_override, prompt_override } = body;
    if (!material_id) {
      return new Response(JSON.stringify({ error: "material_id obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: material } = await admin.from("materiais").select("*").eq("id", material_id).maybeSingle();
    if (!material || !material.link_1 || material.tipo_1 !== "PDF") {
      return new Response(JSON.stringify({ error: "Aula sem PDF disponível." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const pdf = await fetchPdfAsBase64(material.link_1);
    if (!pdf) {
      return new Response(JSON.stringify({ error: "Não foi possível baixar o PDF." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: promptRow } = await admin.from("ia_prompts").select("*").eq("chave", "triagem_aula").maybeSingle();
    const systemPrompt = (prompt_override && String(prompt_override).trim().length > 50)
      ? String(prompt_override)
      : (promptRow?.prompt ?? "");
    const modelo = modelo_override || promptRow?.modelo_padrao || "google/gemini-2.5-pro";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: [
            { type: "text", text: `Faça a triagem pedagógica do PDF da aula "${material.nome}" (${material.especialidade}). Retorne o mapa em JSON.` },
            { type: "image_url", image_url: { url: `data:${pdf.mime};base64,${pdf.base64}` } },
          ]},
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.text();
      console.error("[triagem-aula] AI falhou", aiRes.status, errBody.slice(0, 300));
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições.", code: "AI_RATE_LIMIT" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados.", code: "AI_CREDITS_EXHAUSTED" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Falha na IA.", code: "AI_UPSTREAM_ERROR" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiRes.json();
    let mapa: any;
    try { mapa = JSON.parse(data.choices?.[0]?.message?.content ?? "{}"); }
    catch {
      return new Response(JSON.stringify({ error: "Mapa em formato inválido." }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!Array.isArray(mapa?.pontos) || mapa.pontos.length === 0) {
      return new Response(JSON.stringify({ error: "IA não devolveu pontos." }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Garantir IDs únicos
    mapa.pontos = mapa.pontos.map((p: any, i: number) => ({ ...p, id: p.id || `p${i + 1}` }));

    const { data: triagem, error: insErr } = await admin.from("triagens_aula").insert({
      aula_id: material.id,
      mapa_json: mapa,
      modelo_usado: modelo,
      criado_por: userId,
      status: "pendente",
    }).select().single();

    if (insErr) {
      console.error("[triagem-aula] insert falhou", insErr);
      return new Response(JSON.stringify({ error: "Falha ao salvar triagem." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ triagem_id: triagem.id, mapa, modelo }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[triagem-aula] erro", e?.message);
    return new Response(JSON.stringify({ error: "Erro interno." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
