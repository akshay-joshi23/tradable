import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(_: Request, context: { params: { id: string } }) {
  const user = await requireUser();
  const callId = context.params.id;
  const supabase = getSupabaseAdminClient();

  const { data: call } = await supabase
    .from("calls")
    .select("id,request_id,pro_id,ended_at")
    .eq("id", callId)
    .single();

  if (!call) {
    return NextResponse.json({ error: "Call not found." }, { status: 404 });
  }

  const { data: requestRow } = await supabase
    .from("requests")
    .select("id,customer_id,status")
    .eq("id", call.request_id)
    .single();

  if (!requestRow) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  const isCustomer = requestRow.customer_id === user.id;
  const isPro = call.pro_id === user.id;

  if (!isCustomer && !isPro) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  if (!call.ended_at) {
    await supabase.from("calls").update({ ended_at: new Date().toISOString() }).eq("id", callId);
  }

  if (requestRow.status !== "completed") {
    await supabase
      .from("requests")
      .update({ status: "completed" })
      .eq("id", call.request_id)
      .in("status", ["matched", "in_call", "completed"]);
  }

  return NextResponse.json({ status: "completed" });
}
