"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type ClaimButtonProps = {
  requestId: string;
};

export function ClaimButton({ requestId }: ClaimButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClaim = async () => {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/requests/${requestId}/match`, {
      method: "POST",
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload?.error ?? "Unable to claim request.");
      setLoading(false);
      return;
    }

    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleClaim} disabled={loading}>
        {loading ? "Claiming..." : "Claim"}
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
