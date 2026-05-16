import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, type PaddleEnv } from '../_shared/paddle.ts';

// Map Paddle price_id → plano OQMED
const PRICE_TO_PLANO: Record<string, { plano: 'ouro' | 'prata'; valor: number }> = {
  plano_ouro_mensal: { plano: 'ouro', valor: 28.5 },
  plano_prata_mensal: { plano: 'prata', valor: 21.5 },
};

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }
  return _supabase;
}

async function handleSubscriptionActive(data: any, _env: PaddleEnv) {
  const { items, status, currentBillingPeriod, customData } = data;
  const userId = customData?.userId;
  if (!userId) {
    console.warn('Sub event without userId in customData', data.id);
    return;
  }
  const priceId = items?.[0]?.price?.importMeta?.externalId;
  const mapped = priceId ? PRICE_TO_PLANO[priceId] : null;
  if (!mapped) {
    console.warn('Unknown priceId in webhook', priceId);
    return;
  }

  await getSupabase().from('assinaturas').update({
    plano: mapped.plano,
    status: status === 'active' || status === 'trialing' ? 'ativo' : status === 'past_due' ? 'inadimplente' : 'cancelado',
    valor_mensal: mapped.valor,
    metodo_pagamento: 'paddle',
    data_inicio_plano: currentBillingPeriod?.startsAt ?? new Date().toISOString(),
    proxima_renovacao: currentBillingPeriod?.endsAt ?? null,
    data_inadimplencia: status === 'past_due' ? new Date().toISOString() : null,
    atualizado_em: new Date().toISOString(),
  }).eq('usuario_id', userId);
}

async function handleSubscriptionCanceled(data: any) {
  const userId = data?.customData?.userId;
  if (!userId) return;
  await getSupabase().from('assinaturas').update({
    status: 'cancelado',
    atualizado_em: new Date().toISOString(),
  }).eq('usuario_id', userId);
}

async function handleTransactionCompleted(data: any) {
  const userId = data?.customData?.userId;
  if (!userId) return;
  const item = data.items?.[0];
  const priceId = item?.price?.importMeta?.externalId;
  const mapped = priceId ? PRICE_TO_PLANO[priceId] : null;
  if (!mapped) return;

  const valor = data.details?.totals?.total
    ? Number(data.details.totals.total) / 100
    : mapped.valor;

  await getSupabase().from('pagamentos').insert({
    usuario_id: userId,
    plano: mapped.plano,
    valor,
    metodo: 'paddle',
    status: 'pago',
    data_pagamento: data.billedAt ?? new Date().toISOString(),
  });

  // garantir status ativo após cobrança bem-sucedida
  await getSupabase().from('assinaturas').update({
    status: 'ativo',
    data_ultima_cobranca: new Date().toISOString(),
    data_inadimplencia: null,
    dias_inadimplente: 0,
    atualizado_em: new Date().toISOString(),
  }).eq('usuario_id', userId);
}

async function handleTransactionFailed(data: any) {
  const userId = data?.customData?.userId;
  if (!userId) return;
  await getSupabase().from('assinaturas').update({
    status: 'inadimplente',
    data_inadimplencia: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  }).eq('usuario_id', userId);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const url = new URL(req.url);
  const env: PaddleEnv = (url.searchParams.get('env') === 'live' ? 'live' : 'sandbox');

  try {
    const event = await verifyWebhook(req, env);
    console.log('Paddle event:', event.eventType, env);

    switch (event.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
        await handleSubscriptionActive(event.data, env);
        break;
      case EventName.SubscriptionCanceled:
        await handleSubscriptionCanceled(event.data);
        break;
      case EventName.TransactionCompleted:
        await handleTransactionCompleted(event.data);
        break;
      case EventName.TransactionPaymentFailed:
        await handleTransactionFailed(event.data);
        break;
      default:
        console.log('Unhandled event:', event.eventType);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('Webhook error', { status: 400 });
  }
});
