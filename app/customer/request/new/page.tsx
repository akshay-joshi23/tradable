"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { tradeOptions } from "@/lib/validation";

export default function NewRequestPage() {
  const router = useRouter();
  const [trade, setTrade] = useState(tradeOptions[0]);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trade, description }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload?.error ?? "Unable to create request.");
      setLoading(false);
      return;
    }

    router.push(`/customer/request/${payload.id}`);
  };

  return (
    <Card className="max-w-2xl">
      <h1 className="text-xl font-semibold">Create a repair request</h1>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="trade">
            Trade
          </label>
          <Select
            id="trade"
            value={trade}
            onChange={(event) => setTrade(event.target.value as typeof trade)}
          >
            {tradeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="description">
            Describe the issue
          </label>
          <Textarea
            id="description"
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit request"}
        </Button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </Card>
  );
}
