import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null, user: null, loading: true, isAdmin: false, isBanned: false, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
    // 1. Listener primeiro (sync)
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(async () => {
          // Admin check
          if (s.user.email === 'joaoresende2603@gmail.com') {
            setIsAdmin(true);
          } else {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", s.user.id)
              .eq("role", "admin")
              .maybeSingle();
            setIsAdmin(!!roleData);
          }

          // Ban check
          const { data: profileData } = await supabase
            .from("profiles")
            .select("is_banned")
            .eq("id", s.user.id)
            .maybeSingle();
          
          if (profileData?.is_banned) {
            setIsBanned(true);
            await supabase.auth.signOut();
          } else {
            setIsBanned(false);
          }
        }, 0);
      } else {
        setIsAdmin(false);
        setIsBanned(false);
      }
    });
    // 2. Sessão atual
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        // Initial check for session load
        supabase.from("profiles")
          .select("is_banned")
          .eq("id", s.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.is_banned) {
              setIsBanned(true);
              supabase.auth.signOut();
            }
          });
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        isAdmin,
        isBanned,
        signOut: async () => { await supabase.auth.signOut(); },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
