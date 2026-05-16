import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPaddleClient, type PaddleEnv } from '../_shared/paddle.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing auth');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { environment } = await req.json().catch(() => ({}));
    const env: PaddleEnv = environment === 'live' ? 'live' : 'sandbox';

    // Buscar assinatura
    const { data: ass } = await supabase
      .from('assinaturas')
      .select('paddle_customer_id, paddle_subscription_id')
      .eq('usuario_id', user.id)
      .maybeSingle();

    if (!ass?.paddle_customer_id) {
      throw new Error('Nenhuma assinatura paga encontrada. Faça um upgrade primeiro.');
    }

    const paddle = getPaddleClient(env);
    const subs = ass.paddle_subscription_id ? [ass.paddle_subscription_id] : [];
    const session = await paddle.customerPortalSessions.create(ass.paddle_customer_id, subs);

    return new Response(JSON.stringify({ url: session.urls.general.overview }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('payments-portal error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
