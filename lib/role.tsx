import * as SecureStore from "expo-secure-store";
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";

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
      const stored = await SecureStore.getItemAsync(ROLE_KEY);
      if (isMounted) {
        setRoleState(stored as Role | null);
        setLoading(false);
      }
    };
    loadRole();
    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<RoleContextValue>(
    () => ({
      role,
      loading,
      setRole: async (nextRole) => {
        await SecureStore.setItemAsync(ROLE_KEY, nextRole);
        setRoleState(nextRole);
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
  if (!context) {
    throw new Error("useRole must be used within RoleProvider");
  }
  return context;
}
