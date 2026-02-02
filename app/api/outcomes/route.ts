import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { outcomeSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await requireUser();
  const payload = await request.json();
  const parsed = outcomeSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid outcome payload." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: call } = await supabase
    .from("calls")
    .select("id,pro_id,request_id")
    .eq("id", parsed.data.callId)
    .single();

  if (!call) {
    return NextResponse.json({ error: "Call not found." }, { status: 404 });
  }

  if (call.pro_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const { data: outcome, error } = await supabase
    .from("outcomes")
    .upsert(
      {
        call_id: parsed.data.callId,
        diagnosis_text: parsed.data.diagnosisText,
        next_step_enum: parsed.data.nextStep,
        estimate_low: parsed.data.estimateLow,
        estimate_high: parsed.data.estimateHigh,
        onsite_needed_bool: parsed.data.onsiteNeeded,
      },
      { onConflict: "call_id" }
    )
    .select("id")
    .single();

  if (error || !outcome) {
    return NextResponse.json({ error: "Unable to save outcome." }, { status: 500 });
  }

  await supabase
    .from("requests")
    .update({ status: "completed" })
    .eq("id", call.request_id)
    .in("status", ["matched", "in_call", "completed"]);

  return NextResponse.json({ id: outcome.id });
}
