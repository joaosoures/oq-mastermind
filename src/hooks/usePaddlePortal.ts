import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import { toast } from "sonner";

export function usePaddlePortal() {
  const [loading, setLoading] = useState(false);

  const openPortal = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("payments-portal", {
        body: { environment: getPaddleEnvironment() },
      });
      if (error || !data?.url) {
        throw new Error(data?.error || error?.message || "Falha ao abrir portal");
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error("Não foi possível abrir o portal", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  return { openPortal, loading };
}
