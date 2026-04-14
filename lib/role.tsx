import { PropsWithChildren, createContext, useContext, useMemo } from "react";

import { supabase } from "./supabase";
import { setUserRole } from "./api";
import { useAuth } from "./auth";

export type Role = "customer" | "pro";

type RoleContextValue = {
  role: Role | null;
  loading: boolean;
  setRole: (nextRole: Role) => Promise<void>;
  clearRole: () => Promise<void>;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: PropsWithChildren) {
  const { session, loading } = useAuth();

  // Role lives in Supabase user metadata — no separate storage, no race conditions.
  // When the session loads or updates (e.g. after OAuth), role is immediately available.
  const role = (session?.user?.user_metadata?.role as Role | undefined) ?? null;

  const value = useMemo<RoleContextValue>(
    () => ({
      role,
      loading,
      setRole: async (nextRole) => {
        // Write role into the session metadata so it's available without a network call.
        await supabase.auth.updateUser({ data: { role: nextRole } });
        // Sync to backend user_profiles table in the background.
        setUserRole(nextRole).catch(() => {});
      },
      clearRole: async () => {
        // Session sign-out already clears the derived role; nothing else needed.
      },
    }),
    [role, loading]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRole must be used within RoleProvider");
  return context;
}
