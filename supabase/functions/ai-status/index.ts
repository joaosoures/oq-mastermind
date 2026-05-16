import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");

  const authHeader = req.headers.get('Authorization');
  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  
  let userPlan = "gratis";
  let userId = null;

  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      userId = user.id;
      const { data: plan } = await supabase.rpc("get_user_plan", { _user_id: user.id });
      userPlan = plan || "gratis";
    }
  }

  // Limites pré-estabelecidos
  const PLAN_LIMITS: Record<string, number> = {
    ouro: 30,
    trial: 10,
    prata: 0,
    gratis: 0,
    gratis_expirado: 0
  };

  const limit = PLAN_LIMITS[userPlan] || 0;

  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({
        ok: false,
        status: "offline",
        message: "O serviço de IA está temporariamente fora do ar.",
        credits: { remaining: 0, limit: limit },
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
    
    // Simulação de consumo real baseado no banco se necessário, 
    // por enquanto vamos focar nos limites informados.
    // Em um cenário real, consultaríamos as gerações já feitas pelo usuário no mês.
    let remaining = 0;
    if (userId && limit > 0) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);

      const { count } = await supabase
        .from("temp_oqs") // Ou uma tabela de logs de geração se existisse
        .select("*", { count: 'exact', head: true })
        .eq("user_id", userId)
        .eq("contexto_origem", "Geração por IA") // Filtro hipotético ou real se marcado
        .gte("created_at", startOfMonth.toISOString());
      
      // Como não temos uma tabela de log de consumo dedicada ainda, 
      // vamos usar o limite como base informativa.
      remaining = Math.max(0, limit - (count || 0));
    }

    let status: "online" | "lento" | "limitado" | "sem_creditos" | "offline" = "online";
    let message = "Tudo funcionando normalmente.";

    if (ping.status === 402 || (limit > 0 && remaining <= 0)) {
      status = "sem_creditos";
      message = "Seus créditos de IA acabaram para este período.";
    } else if (!ping.ok) {
      status = "offline";
      message = "O serviço de IA está instável.";
    }

    await ping.body?.cancel();

    return new Response(
      JSON.stringify({
        ok: ping.ok,
        status,
        message,
        latencyMs,
        credits: { remaining: remaining, limit: limit },
        checkedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        status: "offline",
        message: "Erro na verificação.",
        credits: { remaining: 0, limit: limit },
        checkedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
