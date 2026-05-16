import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { priceId, environment } = await req.json();
    if (!priceId) throw new Error('priceId required');
    const env: PaddleEnv = environment === 'live' ? 'live' : 'sandbox';

    const response = await gatewayFetch(env, `/prices?external_id=${encodeURIComponent(priceId)}`);
    const data = await response.json();
    if (!data.data?.length) throw new Error(`Price not found: ${priceId}`);

    return new Response(JSON.stringify({ paddleId: data.data[0].id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('get-paddle-price error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
