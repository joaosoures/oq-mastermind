import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useOnboarding() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(true);
  const [skipped, setSkipped] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed, onboarding_skipped")
      .eq("id", user.id)
      .maybeSingle();
    const d = data as { onboarding_completed?: boolean; onboarding_skipped?: boolean } | null;
    setCompleted(!!d?.onboarding_completed);
    setSkipped(!!d?.onboarding_skipped);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  const shouldShow = !loading && !!user && !completed && !skipped;

  return {
    loading,
    completed,
    skipped,
    shouldShow,
    markCompleted: () => setCompleted(true),
    markSkipped: () => setSkipped(true),
    refresh: load,
  };
}
