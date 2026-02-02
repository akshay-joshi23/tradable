"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthButtonProps = {
  isAuthenticated: boolean;
  email?: string | null;
};

export function AuthButton({ isAuthenticated, email }: AuthButtonProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  if (!isAuthenticated) {
    return (
      <Button variant="secondary" onClick={() => router.push("/login")}>
        Sign in
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600">{email ?? "Signed in"}</span>
      <Button variant="ghost" onClick={handleSignOut}>
        Sign out
      </Button>
    </div>
  );
}
