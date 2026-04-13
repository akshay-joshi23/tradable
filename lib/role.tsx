import * as SecureStore from "expo-secure-store";
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";

import { getUserRole, setUserRole } from "./api";

export type Role = "customer" | "pro";

type RoleContextValue = {
  role: Role | null;
  loading: boolean;
  setRole: (nextRole: Role) => Promise<void>;
  clearRole: () => Promise<void>;
};

const ROLE_KEY = "tradable.role";

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: PropsWithChildren) {
  const [role, setRoleState] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadRole = async () => {
      // Use SecureStore as a fast cache to avoid a network call on every launch
      const cached = await SecureStore.getItemAsync(ROLE_KEY);
      if (cached && isMounted) {
        setRoleState(cached as Role);
        setLoading(false);
        // Verify against server in the background — silently fix stale cache
        getUserRole().then((serverRole) => {
          if (!isMounted || !serverRole) return;
          if (serverRole !== cached) {
            SecureStore.setItemAsync(ROLE_KEY, serverRole);
            setRoleState(serverRole);
          }
        }).catch(() => {/* network unavailable — cached value is fine */});
        return;
      }

      // No cache — must fetch from server
      try {
        const serverRole = await getUserRole();
        if (isMounted && serverRole) {
          await SecureStore.setItemAsync(ROLE_KEY, serverRole);
          setRoleState(serverRole);
        }
      } catch {
        // No session or server unreachable — user will need to log in
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadRole();
    return () => { isMounted = false; };
  }, []);

  const value = useMemo<RoleContextValue>(
    () => ({
      role,
      loading,
      setRole: async (nextRole) => {
        // Store locally first so login never blocks on the network
        await SecureStore.setItemAsync(ROLE_KEY, nextRole);
        setRoleState(nextRole);
        // Sync to server in background — non-blocking
        setUserRole(nextRole).catch(() => {/* retried on next app load */});
      },
      clearRole: async () => {
        await SecureStore.deleteItemAsync(ROLE_KEY);
        setRoleState(null);
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
