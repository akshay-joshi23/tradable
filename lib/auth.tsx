import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";

import { createSessionFromUrl, maybeCompleteAuthSession } from "./auth-helpers";
import { supabase } from "./supabase";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Complete OAuth session when returning from browser (required for web)
  useEffect(() => {
    maybeCompleteAuthSession();
  }, []);

  // Initial session fetch and auth state subscription
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle deep links (magic link, OAuth redirect)
  const url = Linking.useURL();
  useEffect(() => {
    if (!url) return;
    createSessionFromUrl(url).catch((err) => {
      console.error("Deep link auth error:", err);
    });
  }, [url]);

  // Handle cold start: app opened via deep link
  useEffect(() => {
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        createSessionFromUrl(initialUrl).catch((err) => {
          console.error("Initial URL auth error:", err);
        });
      }
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
