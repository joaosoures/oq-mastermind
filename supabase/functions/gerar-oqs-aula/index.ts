import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function extractDriveId(url: string): string | null {
  const m1 = url?.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = url?.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  const m3 = url?.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
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
    } catch (e) { console.error("[gerar-oqs-aula] pdf fetch", u, e); }
  }
  return null;
}

async function callAI(apiKey: string, model: string, systemPrompt: string, userParts: any[], json = true) {
  const res = await fetch(LOVABLE_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userParts },
      ],
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI ${model} ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  try { return JSON.parse(content); } catch { return { _raw: content }; }
}

// Validações duras por modo — alinhadas à jogabilidade real de cada modo
function validLacuna(q: any) {
  // O marcador [___] agora é opcional. Se não houver, assume-se que a pergunta termina com ":"
  const perg = String(q?.pergunta || "");
  const hasMarker = perg.includes("[___]") || /_{4,}/.test(perg) || perg.endsWith(":");
  if (!hasMarker && perg.length < 10) return false;
  
  const r = String(q?.resposta || "").trim();
  if (!r || r.length > 60) return false;
  // Resposta PODE ter espaços (multi-palavra), mas não pode ter ";" (separador de variações) nem aspas
  if (/[;"]/.test(r)) return false;
  if (r.split(/\s+/).length > 4) return false;
  return true;
}
function validOQFalta(q: any) {
  // Formato: comando (cabeçalho) + array de 3-5 itens {info, variacoes}
  if (!q?.comando || typeof q.comando !== "string") return false;
  if (q.comando.length > 200) return false;
  if (!Array.isArray(q?.itens)) return false;
  if (q.itens.length < 3 || q.itens.length > 5) return false;
  for (const it of q.itens) {
    const info = String(it?.info || "").trim();
    if (!info || info.length > 60) return false;
    if (info.split(/\s+/).length > 6) return false;
    if (/[;"]/.test(info)) return false;
  }
  return true;
}
function validABCDE(q: any) {
  if (!q?.pergunta || typeof q.pergunta !== "string") return false;
  if (q.pergunta.length < 50) return false; // caso clínico conciso ou detalhado
  if (!q?.resposta) return false;
  const options = Array.isArray(q.opcoes) ? q.opcoes : [];
  if (options.length !== 5) return false;
  // Cada opção precisa ter texto não-vazio
  for (const o of options) {
    const txt = typeof o === "string" ? o : (o?.texto || o?.opcao || "");
    if (!String(txt).trim()) return false;
  }
  const resp = String(q.resposta).trim().toUpperCase();
  // Resposta deve ser letra A-E
  if (/^[A-E]$/.test(resp)) return true;
  // Tolerância: se vier texto, tenta casar com uma opção
  return options.some((o: any) => {
    const optVal = typeof o === "string" ? o : (o?.texto || o?.opcao || "");
    return String(optVal).trim().toLowerCase() === String(q.resposta).trim().toLowerCase();
  });
}

// Normaliza ABCDE: garante que `resposta` seja sempre a LETRA (A-E)
function normalizeABCDE(q: any) {
  const options = Array.isArray(q.opcoes) ? q.opcoes : [];
  // Garante formato {letra, texto}
  const norm = options.map((o: any, i: number) => {
    const letra = ["A", "B", "C", "D", "E"][i];
    if (typeof o === "string") return { letra, texto: o };
    return { letra: (o?.letra || letra).toUpperCase(), texto: o?.texto || o?.opcao || "" };
  });
  let resp = String(q.resposta || "").trim().toUpperCase();
  if (!/^[A-E]$/.test(resp)) {
    const idx = norm.findIndex((o: any) => o.texto.trim().toLowerCase() === String(q.resposta).trim().toLowerCase());
    resp = idx >= 0 ? ["A", "B", "C", "D", "E"][idx] : "A";
  }
  return { ...q, opcoes: norm, resposta: resp };
}

// Anti-fadiga: embaralha evitando 2 do mesmo modo seguidos
function antifadiga(qs: any[]): any[] {
  const out: any[] = [];
  const buckets: Record<string, any[]> = { lacuna: [], oq_falta: [], abcde: [] };
  qs.forEach(q => buckets[q.modo]?.push(q));
  Object.values(buckets).forEach(b => b.sort(() => Math.random() - 0.5));
  let last = "";
  while (buckets.lacuna.length || buckets.oq_falta.length || buckets.abcde.length) {
    const candidates = Object.entries(buckets)
      .filter(([k, v]) => v.length && k !== last)
      .sort((a, b) => b[1].length - a[1].length);
    const pick = candidates[0] || Object.entries(buckets).find(([_, v]) => v.length)!;
    out.push(pick[1].shift());
    last = pick[0];
  }
  return out;
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
    if (!userData?.user) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = userData.user.id;

    const admin = createClient(supaUrl, serviceKey);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Apenas admin." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { triagem_id, modelos_override, prompts_override, rodar_filtro } = body;
    if (!triagem_id) return new Response(JSON.stringify({ error: "triagem_id obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: triagem } = await admin.from("triagens_aula").select("*").eq("id", triagem_id).maybeSingle();
    if (!triagem) return new Response(JSON.stringify({ error: "Triagem não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: material } = await admin.from("materiais").select("*").eq("id", triagem.aula_id).maybeSingle();
    if (!material?.link_1) return new Response(JSON.stringify({ error: "Aula sem PDF" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const pdf = await fetchPdfAsBase64(material.link_1);
    if (!pdf) return new Response(JSON.stringify({ error: "Não baixou PDF" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const pdfPart = { type: "image_url" as const, image_url: { url: `data:${pdf.mime};base64,${pdf.base64}` } };

    // Buscar prompts
    const { data: prompts } = await admin.from("ia_prompts").select("*").in("chave", ["gerar_lacuna", "gerar_oq_falta", "gerar_abcde", "filtro_solubilidade"]);
    const promptMap: Record<string, { prompt: string; modelo: string }> = {};
    (prompts || []).forEach((p: any) => { promptMap[p.chave] = { prompt: p.prompt, modelo: p.modelo_padrao }; });

    const getPromptCfg = (chave: string, defaultModel: string) => ({
      prompt: prompts_override?.[chave] || promptMap[chave]?.prompt || "",
      modelo: modelos_override?.[chave] || promptMap[chave]?.modelo || defaultModel,
    });

    const mapa = triagem.mapa_json as any;
    const pontos: any[] = Array.isArray(mapa?.pontos) ? mapa.pontos : [];
    const pontosLacuna = pontos.filter(p => p.modo_sugerido === "lacuna");
    const pontosFalta = pontos.filter(p => p.modo_sugerido === "oq_falta");
    const pontosABCDE = pontos.filter(p => p.modo_sugerido === "abcde");

    const cfgLac = getPromptCfg("gerar_lacuna", "google/gemini-2.5-flash");
    const cfgFalta = getPromptCfg("gerar_oq_falta", "google/gemini-2.5-flash");
    const cfgABCDE = getPromptCfg("gerar_abcde", "openai/gpt-5");
    const cfgFiltro = getPromptCfg("filtro_solubilidade", "openai/gpt-5");

    // Etapa 2 — 3 chamadas em paralelo
    const taskLac = pontosLacuna.length ? callAI(LOVABLE_API_KEY, cfgLac.modelo, cfgLac.prompt, [
      { type: "text", text: `Gere OQs LACUNA para os pontos abaixo (use o ponto_id de cada um). Pontos: ${JSON.stringify(pontosLacuna)}` },
      pdfPart,
    ]).catch(e => ({ _err: e.message })) : Promise.resolve({ questions: [] });

    const taskFalta = pontosFalta.length ? callAI(LOVABLE_API_KEY, cfgFalta.modelo, cfgFalta.prompt, [
      { type: "text", text: `Gere OQs O QUE FALTA para os pontos abaixo. Pontos: ${JSON.stringify(pontosFalta)}` },
      pdfPart,
    ]).catch(e => ({ _err: e.message })) : Promise.resolve({ questions: [] });

    const taskABCDE = pontosABCDE.length ? callAI(LOVABLE_API_KEY, cfgABCDE.modelo, cfgABCDE.prompt, [
      { type: "text", text: `Gere OQs ABCDE para os pontos abaixo. Pontos: ${JSON.stringify(pontosABCDE)}` },
      pdfPart,
    ]).catch(e => ({ _err: e.message })) : Promise.resolve({ questions: [] });

    const [resLac, resFalta, resABCDE] = await Promise.all([taskLac, taskFalta, taskABCDE]);
    console.log("[gerar-oqs-aula] etapa2", { 
      lac: resLac?.questions?.length, 
      falta: resFalta?.questions?.length, 
      abcde: resABCDE?.questions?.length,
      lac_err: resLac?._err,
      falta_err: resFalta?._err,
      abcde_err: resABCDE?._err
    });

    const errs = [resLac, resFalta, resABCDE].filter((r: any) => r._err).map((r: any) => r._err);
    if (errs.length && errs.length === 3) {
      return new Response(JSON.stringify({ error: "Falha em todas as gerações.", detalhes: errs }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rawLac = (resLac?.questions || [])
      .map((q: any) => ({ ...q, modo: "lacuna", _modelo: cfgLac.modelo }))
      .filter((q: any) => filtroAtivo || validLacuna(q));

    const rawFalta = (resFalta?.questions || [])
      .map((q: any) => ({ ...q, modo: "oq_falta", _modelo: cfgFalta.modelo }))
      .filter((q: any) => filtroAtivo || validOQFalta(q))
      .map((q: any) => ({
        ...q,
        pergunta: q.comando || q.pergunta || "", // comando vai no campo "pergunta" do temp_oqs
        resposta: Array.isArray(q.itens) ? q.itens.map((it: any) => it?.info || it?.info_1 || "").join(" | ") : (q.resposta || ""), 
        variacoes: q.variacoes || null,
        opcoes: q.itens || [],
      }));

    const rawABCDE = (resABCDE?.questions || [])
      .map((q: any) => ({ ...q, modo: "abcde", _modelo: cfgABCDE.modelo }))
      .filter((q: any) => filtroAtivo || validABCDE(q))
      .map(normalizeABCDE);

    let combined = [...rawLac, ...rawFalta, ...rawABCDE];

    // Etapa 3 — Filtro de Solubilidade (opcional)
    const filtroAtivo = rodar_filtro !== false && combined.length > 0;
    const statusMap: Record<number, { status: string; motivo: string; oq_final?: any }> = {};
    if (filtroAtivo) {
      try {
        const lista = combined.map((q, i) => ({ 
          indice: i, 
          modo: q.modo, 
          pergunta: q.pergunta, 
          resposta: q.resposta, 
          opcoes: q.opcoes, 
          variacoes: q.variacoes, 
          explicacao: q.explicacao 
        }));
        
        const filtroRes = await callAI(LOVABLE_API_KEY, cfgFiltro.modelo, cfgFiltro.prompt, [
          { type: "text", text: `Avalie cada OQ contra o PDF. Use EXATAMENTE este formato JSON: {"resultados": [{"indice": 0, "status": "aprovado"|"reescrito"|"descartado", "motivo": "...", "oq_final": {}}]} \n\nLista de OQs:\n${JSON.stringify(lista)}` },
          pdfPart,
        ]);
        
        console.log("[gerar-oqs-aula] filtro bruto", JSON.stringify(filtroRes).slice(0, 500));
        
        const resultados = Array.isArray(filtroRes?.resultados) ? filtroRes.resultados : [];
        resultados.forEach((r: any) => {
          if (typeof r.indice === "number") {
            statusMap[r.indice] = { 
              status: r.status || "aprovado", 
              motivo: r.motivo || "", 
              oq_final: r.oq_final 
            };
          }
        });
      } catch (e) {
        console.error("[gerar-oqs-aula] filtro falhou", e);
      }
    }

    // Aplicar reescrita e filtrar descartados
    const finalQs: any[] = [];
    combined.forEach((q, i) => {
      const s = statusMap[i];
      if (s?.status === "descartado") return;
      
      let currentQ = { ...q };
      if (s?.status === "reescrito" && s.oq_final) {
        // Se foi reescrito, mesclamos o resultado
        currentQ = { ...currentQ, ...s.oq_final, _filtro_status: "reescrito", _filtro_motivo: s.motivo };
        
        // Se for ABCDE, precisamos normalizar novamente (garantir letra na resposta)
        if (currentQ.modo === "abcde") {
          currentQ = normalizeABCDE(currentQ);
        }
        
        // Se for OQ Falta, precisamos garantir que o comando está em pergunta e resposta está atualizada
        if (currentQ.modo === "oq_falta") {
          currentQ.pergunta = currentQ.comando || currentQ.pergunta;
          if (Array.isArray(currentQ.opcoes)) {
             currentQ.resposta = currentQ.opcoes.map((it: any) => it?.info || it?.info_1 || "").join(" | ");
          }
        }
      } else {
        currentQ._filtro_status = s?.status || (filtroAtivo ? "aprovado" : null);
        currentQ._filtro_motivo = s?.motivo || null;
      }
      
      // Validação final antes de adicionar
      if (currentQ.modo === "lacuna" && !validLacuna(currentQ)) return;
      if (currentQ.modo === "oq_falta" && !validOQFalta(currentQ)) return;
      if (currentQ.modo === "abcde" && !validABCDE(currentQ)) return;

      finalQs.push(currentQ);
    });

    // Anti-fadiga
    const ordered = antifadiga(finalQs);

    // Persistir
    const toInsert = ordered.map(q => ({
      user_id: userId,
      pergunta: q.pergunta,
      resposta: q.resposta,
      variacoes: q.variacoes || "",
      modo: q.modo,
      especialidade: material.especialidade,
      opcoes: q.opcoes ?? null,
      explicacao: q.explicacao || "Gerado por IA a partir da aula.",
      contexto_origem: `Aula: ${material.nome}`,
      aula_id: material.id,
      modelo_ia: q._modelo,
      triagem_id: triagem.id,
      etapa_filtro_status: q._filtro_status,
      etapa_filtro_motivo: q._filtro_motivo,
      ponto_id: q.ponto_id || null,
    }));

    if (toInsert.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum OQ válido sobrou após validação/filtro.", code: "AI_NO_VALID_QUESTIONS" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: insErr } = await admin.from("temp_oqs").insert(toInsert);
    if (insErr) {
      console.error("[gerar-oqs-aula] insert", insErr);
      return new Response(JSON.stringify({ error: "Falha ao salvar OQs." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Atualizar status da triagem
    await admin.from("triagens_aula").update({ status: "aprovada", atualizado_em: new Date().toISOString() }).eq("id", triagem.id);

    return new Response(JSON.stringify({
      ok: true,
      total: toInsert.length,
      descartados: combined.length - finalQs.length,
      por_modo: {
        lacuna: rawLac.length,
        oq_falta: rawFalta.length,
        abcde: rawABCDE.length,
      },
      modelos: { lacuna: cfgLac.modelo, oq_falta: cfgFalta.modelo, abcde: cfgABCDE.modelo, filtro: cfgFiltro.modelo },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("[gerar-oqs-aula] erro", e?.message, e?.stack);
    return new Response(JSON.stringify({ error: "Erro interno: " + (e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
