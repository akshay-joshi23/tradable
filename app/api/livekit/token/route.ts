import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { requireUser } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const user = await requireUser();
  const { requestId } = (await request.json()) as { requestId?: string };

  if (!requestId) {
    return NextResponse.json({ error: "Request id required." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: requestRow } = await supabase
    .from("requests")
    .select("id,customer_id")
    .eq("id", requestId)
    .single();

  if (!requestRow) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  const { data: call } = await supabase
    .from("calls")
    .select("id,pro_id,room_name")
    .eq("request_id", requestId)
    .maybeSingle();

  const isCustomer = requestRow.customer_id === user.id;
  const isPro = call?.pro_id === user.id;

  if (!call) {
    return NextResponse.json({ error: "Call not ready yet." }, { status: 409 });
  }

  if (!isCustomer && !isPro) {
    return NextResponse.json({ error: "Unauthorized for this room." }, { status: 403 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "LiveKit env not configured." }, { status: 500 });
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: user.email ?? user.id,
  });

  token.addGrant({
    room: call.room_name,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return NextResponse.json({ token: token.toJwt() });
}
