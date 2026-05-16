import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, type PaddleEnv } from '../_shared/paddle.ts';

const PRICE_TO_PLANO: Record<string, { plano: 'ouro' | 'prata'; valor: number }> = {
  plano_ouro_mensal: { plano: 'ouro', valor: 28.5 },
  plano_prata_mensal: { plano: 'prata', valor: 21.5 },
};

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }
  return _supabase;
}

function mapStatus(paddleStatus: string): string {
  switch (paddleStatus) {
    case 'active':
    case 'trialing':
      return 'ativo';
    case 'past_due': return 'inadimplente';
    case 'paused':
    case 'canceled': return 'cancelado';
    default: return paddleStatus;
  }
}

async function findUserId(data: any): Promise<string | null> {
  if (data?.customData?.userId) return data.customData.userId;
  // fallback: lookup by paddle_subscription_id
  if (data?.id) {
    const { data: row } = await getSupabase()
      .from('assinaturas')
      .select('usuario_id')
      .eq('paddle_subscription_id', data.id)
      .maybeSingle();
    return (row as any)?.usuario_id ?? null;
  }
  return null;
}

async function handleSubscriptionCreatedOrUpdated(data: any) {
  const userId = await findUserId(data);
  if (!userId) {
    console.warn('Sub event without resolvable userId', data.id);
    return;
  }

  const item = data.items?.[0];
  const priceId = item?.price?.importMeta?.externalId;
  const mapped = priceId ? PRICE_TO_PLANO[priceId] : null;
  if (!mapped) {
    console.warn('Unknown priceId in webhook', priceId);
    return;
  }

  const status = mapStatus(data.status);
  const cancelEop = data.scheduledChange?.action === 'cancel';
  const periodEnd = data.currentBillingPeriod?.endsAt ?? null;

  const update: Record<string, any> = {
    plano: mapped.plano,
    status,
    valor_mensal: mapped.valor,
    metodo_pagamento: 'paddle',
    paddle_subscription_id: data.id,
    paddle_customer_id: data.customerId,
    cancel_at_period_end: cancelEop,
    data_inicio_plano: data.currentBillingPeriod?.startsAt ?? new Date().toISOString(),
    proxima_renovacao: periodEnd,
    atualizado_em: new Date().toISOString(),
  };

  if (status === 'inadimplente') {
    update.data_inadimplencia = new Date().toISOString();
    update.excluir_dados_em = new Date(Date.now() + 30 * 86400_000).toISOString();
  } else if (status === 'ativo') {
    update.data_inadimplencia = null;
    update.dias_inadimplente = 0;
    update.excluir_dados_em = null;
  }

  await getSupabase().from('assinaturas').update(update).eq('usuario_id', userId);
}

async function handleSubscriptionCanceled(data: any) {
  const userId = await findUserId(data);
  if (!userId) return;
  // Mantém acesso até fim do período já pago (get_user_plan trata isso)
  await getSupabase().from('assinaturas').update({
    status: 'cancelado',
    cancel_at_period_end: true,
    proxima_renovacao: data.currentBillingPeriod?.endsAt ?? data.canceledAt ?? null,
    atualizado_em: new Date().toISOString(),
  }).eq('usuario_id', userId);
}

async function handleTransactionCompleted(data: any) {
  const userId = await findUserId(data);
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

  await getSupabase().from('assinaturas').update({
    status: 'ativo',
    data_ultima_cobranca: new Date().toISOString(),
    data_inadimplencia: null,
    dias_inadimplente: 0,
    excluir_dados_em: null,
    atualizado_em: new Date().toISOString(),
  }).eq('usuario_id', userId);
}

async function handleTransactionFailed(data: any) {
  const userId = await findUserId(data);
  if (!userId) return;

  const item = data.items?.[0];
  const priceId = item?.price?.importMeta?.externalId;
  const mapped = priceId ? PRICE_TO_PLANO[priceId] : null;
  const valor = data.details?.totals?.total
    ? Number(data.details.totals.total) / 100
    : (mapped?.valor ?? 0);

  // Registra tentativa falhada
  await getSupabase().from('pagamentos').insert({
    usuario_id: userId,
    plano: mapped?.plano ?? 'desconhecido',
    valor,
    metodo: 'paddle',
    status: 'falhou',
    data_pagamento: new Date().toISOString(),
  });

  await getSupabase().from('assinaturas').update({
    status: 'inadimplente',
    data_inadimplencia: new Date().toISOString(),
    excluir_dados_em: new Date(Date.now() + 30 * 86400_000).toISOString(),
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
        await handleSubscriptionCreatedOrUpdated(event.data);
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
    // Retorna 200 para evitar retries em loop após processamento parcial
    return new Response(JSON.stringify({ received: false, error: String(e) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
