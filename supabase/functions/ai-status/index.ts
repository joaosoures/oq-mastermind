import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({
        ok: false,
        status: "offline",
        message: "O serviço de IA está temporariamente fora do ar.",
        details: { keyConfigured: false },
        checkedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const ping = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
    });

    const latencyMs = Date.now() - startedAt;
    const headers: Record<string, string> = {};
    ping.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

    // Best-effort credit headers (gateway pode expor)
    const creditsRemaining = headers["x-ratelimit-remaining-credits"] || headers["x-credits-remaining"] || null;
    const creditsLimit = headers["x-ratelimit-limit-credits"] || headers["x-credits-limit"] || null;

    let status: "online" | "lento" | "limitado" | "sem_creditos" | "offline" = "online";
    let message = "Tudo funcionando normalmente.";

    if (ping.status === 402) {
      status = "sem_creditos";
      message = "Os créditos de IA do mês acabaram. Os professores já foram avisados.";
    } else if (ping.status === 429) {
      status = "limitado";
      message = "Muitos alunos usando agora. Pode haver pequena demora.";
    } else if (!ping.ok) {
      status = "offline";
      message = "O serviço de IA está instável no momento.";
    } else if (latencyMs > 4000) {
      status = "lento";
      message = "A IA está respondendo mais devagar que o normal.";
    }

    await ping.body?.cancel();

    return new Response(
      JSON.stringify({
        ok: ping.ok,
        status,
        message,
        latencyMs,
        credits: creditsRemaining ? { remaining: creditsRemaining, limit: creditsLimit } : null,
        details: { keyConfigured: true, httpStatus: ping.status },
        checkedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[ai-status] erro", err?.message);
    return new Response(
      JSON.stringify({
        ok: false,
        status: "offline",
        message: "Não conseguimos verificar o serviço de IA agora.",
        details: { keyConfigured: true, error: err?.message },
        checkedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
