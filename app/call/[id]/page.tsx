import { requireUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CallRoom } from "@/components/livekit/call-room";

type PageProps = {
  params: { id: string };
};

export default async function CallPage({ params }: PageProps) {
  const user = await requireUser();
  const supabase = getSupabaseServerClient();

  const { data: call } = await supabase.from("calls").select("*").eq("id", params.id).single();

  if (!call) {
    return <p>Call not found.</p>;
  }

  const livekitUrl = process.env.LIVEKIT_URL ?? "";

  if (!livekitUrl) {
    return <p>LiveKit URL is not configured.</p>;
  }

  return (
    <CallRoom
      callId={call.id}
      requestId={call.request_id}
      livekitUrl={livekitUrl}
      isPro={call.pro_id === user.id}
    />
  );
}
