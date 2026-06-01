import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

async function ensureRefCoupon(stripe: ReturnType<typeof createStripeClient>) {
  try {
    return await stripe.coupons.retrieve('REF10');
  } catch {
    return await stripe.coupons.create({
      id: 'REF10',
      percent_off: 10,
      duration: 'once',
      name: 'Indicação - 10% off',
    });
  }
}


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  try {
    const { priceId, customerEmail, userId, returnUrl, environment } = await req.json();
    if (!priceId || !/^[a-zA-Z0-9_-]+$/.test(priceId)) throw new Error("Invalid priceId");
    if (!returnUrl) throw new Error("returnUrl is required");
    const env: StripeEnv = environment === 'live' ? 'live' : 'sandbox';

    const stripe = createStripeClient(env);

    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) throw new Error(`Price not found: ${priceId}`);
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    const customerId = (customerEmail || userId)
      ? await resolveOrCreateCustomer(stripe, { email: customerEmail, userId })
      : undefined;

    // Detecta se é upgrade (usuário já tem subscription ativa) para aplicar prorate
    let existingSubscriptionId: string | null = null;
    if (customerId && isRecurring) {
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
      });
      if (subs.data.length) existingSubscriptionId = subs.data[0].id;
    }

    // Upgrade ou Downgrade direto: atualiza a subscription existente
    if (existingSubscriptionId) {
      const existing = await stripe.subscriptions.retrieve(existingSubscriptionId);
      const currentPriceId = existing.items.data[0].price.id;
      const targetPriceId = stripePrice.id;

      // Busca os detalhes dos preços para comparar valores
      const [currentPrice, targetPrice] = await Promise.all([
        stripe.prices.retrieve(currentPriceId),
        stripe.prices.retrieve(targetPriceId)
      ]);

      const isDowngrade = (targetPrice.unit_amount || 0) < (currentPrice.unit_amount || 0);

      if (isDowngrade) {
        // Para downgrade: muda sem cobrar proporcional, e agenda para o próximo ciclo
        // se o usuário quiser manter os benefícios atuais até o fim do mês.
        // Como o Stripe Embedded Checkout não suporta agendamento fácil via session update direto,
        // vamos atualizar a assinatura com proration_behavior: 'none'.
        // Se quisermos que os benefícios mudem só no fim do mês, teríamos que usar Subscription Schedules.
        // Por enquanto, seguimos o pedido de mensagem clara e proration_behavior: 'none'.
        await stripe.subscriptions.update(existingSubscriptionId, {
          items: [{ id: existing.items.data[0].id, price: targetPriceId }],
          proration_behavior: 'none',
          ...(userId && { metadata: { userId } }),
        });
      } else {
        // Para upgrade: cobra o proporcional imediatamente
        await stripe.subscriptions.update(existingSubscriptionId, {
          items: [{ id: existing.items.data[0].id, price: targetPriceId }],
          proration_behavior: 'create_prorations',
          ...(userId && { metadata: { userId } }),
        });
      }

      return new Response(JSON.stringify({ upgraded: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verifica indicação pendente para aplicar cupom REF10
    let applyReferralCoupon = false;
    if (userId) {
      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const { data: ind } = await admin
        .from('indicacoes')
        .select('id, cupom_aplicado, status')
        .eq('convidado_id', userId)
        .maybeSingle();
      if (ind && !(ind as any).cupom_aplicado && (ind as any).status === 'pendente') {
        applyReferralCoupon = true;
        await ensureRefCoupon(stripe);
        await admin.from('indicacoes').update({ cupom_aplicado: true }).eq('id', (ind as any).id);
      }
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded",
      return_url: returnUrl,
      ...(customerId && { customer: customerId }),
      ...(applyReferralCoupon && { discounts: [{ coupon: 'REF10' }] }),
      ...(userId && {
        metadata: { userId },
        ...(isRecurring && { subscription_data: { metadata: { userId } } }),
      }),
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('create-checkout error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

