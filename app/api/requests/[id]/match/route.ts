import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(_: Request, context: { params: { id: string } }) {
  const user = await requireUser();
  const requestId = context.params.id;
  const supabase = getSupabaseAdminClient();

  const { data: profile } = await supabase
    .from("pro_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Pro profile required." }, { status: 403 });
  }

  const { data: requestRow } = await supabase
    .from("requests")
    .select("id,status")
    .eq("id", requestId)
    .single();

  if (!requestRow) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  const { data: existingCall } = await supabase
    .from("calls")
    .select("id,pro_id")
    .eq("request_id", requestId)
    .maybeSingle();

  if (existingCall && existingCall.pro_id !== user.id) {
    return NextResponse.json({ error: "Request already claimed." }, { status: 409 });
  }

  if (requestRow.status !== "open" && existingCall?.pro_id === user.id) {
    return NextResponse.json({ id: existingCall.id, status: requestRow.status });
  }

  const { data: updated } = await supabase
    .from("requests")
    .update({ status: "matched" })
    .eq("id", requestId)
    .eq("status", "open")
    .select("id")
    .maybeSingle();

  if (!updated && existingCall?.pro_id === user.id) {
    return NextResponse.json({ id: existingCall.id, status: requestRow.status });
  }

  const { data: call, error: callError } = await supabase
    .from("calls")
    .upsert(
      {
        request_id: requestId,
        pro_id: user.id,
        room_name: requestId,
      },
      { onConflict: "request_id" }
    )
    .select("id")
    .single();

  if (callError || !call) {
    return NextResponse.json({ error: "Unable to create call." }, { status: 500 });
  }

  return NextResponse.json({ id: call.id, status: "matched" });
}
