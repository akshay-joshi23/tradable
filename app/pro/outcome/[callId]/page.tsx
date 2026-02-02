"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

const nextStepOptions = [
  { value: "onsite_visit", label: "Onsite visit" },
  { value: "virtual_followup", label: "Virtual follow-up" },
  { value: "customer_fix", label: "Customer can fix" },
  { value: "quote_provided", label: "Quote provided" },
] as const;

type PageProps = {
  params: { callId: string };
};

export default function OutcomeFormPage({ params }: PageProps) {
  const router = useRouter();
  const [diagnosisText, setDiagnosisText] = useState("");
  const [nextStep, setNextStep] = useState(nextStepOptions[0].value);
  const [estimateLow, setEstimateLow] = useState("");
  const [estimateHigh, setEstimateHigh] = useState("");
  const [onsiteNeeded, setOnsiteNeeded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/outcomes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callId: params.callId,
        diagnosisText,
        nextStep,
        estimateLow: estimateLow ? Number(estimateLow) : null,
        estimateHigh: estimateHigh ? Number(estimateHigh) : null,
        onsiteNeeded,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload?.error ?? "Unable to submit outcome.");
      setLoading(false);
      return;
    }

    router.push("/pro/dashboard");
  };

  return (
    <Card className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Submit diagnosis</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="diagnosis">
            Diagnosis summary
          </label>
          <Textarea
            id="diagnosis"
            required
            value={diagnosisText}
            onChange={(event) => setDiagnosisText(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="nextStep">
            Next step
          </label>
          <Select
            id="nextStep"
            value={nextStep}
            onChange={(event) => setNextStep(event.target.value)}
          >
            {nextStepOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="estimateLow">
              Estimate low ($)
            </label>
            <Input
              id="estimateLow"
              type="number"
              min="0"
              value={estimateLow}
              onChange={(event) => setEstimateLow(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="estimateHigh">
              Estimate high ($)
            </label>
            <Input
              id="estimateHigh"
              type="number"
              min="0"
              value={estimateHigh}
              onChange={(event) => setEstimateHigh(event.target.value)}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={onsiteNeeded}
            onChange={(event) => setOnsiteNeeded(event.target.checked)}
          />
          Onsite visit needed
        </label>
        <Button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit outcome"}
        </Button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </Card>
  );
}
