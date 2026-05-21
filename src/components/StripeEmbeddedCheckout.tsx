import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  priceId: string;
  customerEmail?: string;
  userId?: string;
  returnUrl?: string;
  onUpgraded?: () => void;
}

export function StripeEmbeddedCheckout({ priceId, customerEmail, userId, returnUrl, onUpgraded }: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        priceId,
        customerEmail,
        userId,
        returnUrl: returnUrl ?? `${window.location.origin}/meu-plano?checkout=success`,
        environment: getStripeEnvironment(),
      },
    });
    if (error) throw new Error(error.message || "Falha ao criar sessão de checkout");
    if (data?.upgraded) {
      onUpgraded?.();
      // Sem clientSecret quando é só upgrade — devolve string vazia tratada pelo caller
      throw new Error("__UPGRADED__");
    }
    if (!data?.clientSecret) throw new Error("Resposta inválida do servidor");
    return data.clientSecret;
  };

  return (
    <div id="checkout" className="w-full min-h-[500px] flex flex-col">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout className="w-full flex-1" />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
