import { requireUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";

type PageProps = {
  params: { id: string };
};

export default async function OutcomePage({ params }: PageProps) {
  await requireUser();
  const supabase = getSupabaseServerClient();

  const { data: call } = await supabase
    .from("calls")
    .select("*")
    .eq("request_id", params.id)
    .maybeSingle();

  const { data: outcome } = call
    ? await supabase.from("outcomes").select("*").eq("call_id", call.id).maybeSingle()
    : { data: null };

  if (!outcome) {
    return <p>Outcome not available yet.</p>;
  }

  return (
    <Card className="space-y-3">
      <h1 className="text-xl font-semibold">Diagnosis summary</h1>
      <p className="text-sm text-slate-700">{outcome.diagnosis_text}</p>
      <div className="text-sm text-slate-600">
        <p>Next step: {outcome.next_step_enum}</p>
        <p>
          Estimate:{" "}
          {outcome.estimate_low !== null && outcome.estimate_high !== null
            ? `$${outcome.estimate_low} - $${outcome.estimate_high}`
            : "Not provided"}
        </p>
        <p>Onsite needed: {outcome.onsite_needed_bool ? "Yes" : "No"}</p>
      </div>
    </Card>
  );
}
