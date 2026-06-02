import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verifica autenticação
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica se é admin
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ ok: false, error: "Acesso negado" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { keyId } = await req.json();

    // Service-role client para ler key_value
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let provider: string;
    let apiKey: string;
    let label: string;

    if (keyId === "default_lovable") {
      apiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";
      provider = "lovable_gateway";
      label = "Padrão Lovable";
      if (!apiKey) {
        return new Response(JSON.stringify({ ok: false, error: "LOVABLE_API_KEY não configurada" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { data: keyRow, error: keyErr } = await admin
        .from("api_keys_pool")
        .select("provider, key_value, label")
        .eq("id", keyId)
        .maybeSingle();

      if (keyErr || !keyRow) {
        return new Response(JSON.stringify({ ok: false, error: "Chave não encontrada" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      provider = keyRow.provider;
      apiKey = keyRow.key_value;
      label = keyRow.label;
    }

    // Endpoint e modelo de teste
    let endpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
    let model = "google/gemini-2.5-flash";

    if (provider === "openai") {
      endpoint = "https://api.openai.com/v1/chat/completions";
      model = "gpt-4o-mini";
    }

    const started = Date.now();
    const testRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "Responda apenas com a palavra OK." },
          { role: "user", content: "Teste de chave. Diga OK." },
        ],
        max_tokens: 5,
      }),
    });

    const elapsed = Date.now() - started;

    if (!testRes.ok) {
      const errText = await testRes.text();
      // Registra erro no banco (se não for default)
      if (keyId !== "default_lovable") {
        await admin.from("api_keys_pool").update({
          last_error: `Teste falhou: HTTP ${testRes.status} - ${errText.slice(0, 120)}`,
          updated_at: new Date().toISOString(),
        }).eq("id", keyId);
      }
      return new Response(JSON.stringify({
        ok: false,
        status: testRes.status,
        error: testRes.status === 401 ? "Chave inválida ou expirada" :
               testRes.status === 429 ? "Sem créditos / limite atingido" :
               testRes.status === 402 ? "Pagamento necessário (sem créditos)" :
               `HTTP ${testRes.status}`,
        details: errText.slice(0, 200),
        elapsedMs: elapsed,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Sucesso - limpa contador de erros
    if (keyId !== "default_lovable") {
      await admin.from("api_keys_pool").update({
        error_count: 0,
        last_error: null,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", keyId);
    }

    return new Response(JSON.stringify({
      ok: true,
      provider,
      label,
      elapsedMs: elapsed,
      message: "Chave funcional e pronta para gerar OQs",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
