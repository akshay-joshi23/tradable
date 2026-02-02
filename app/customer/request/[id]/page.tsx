import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PageProps = {
  params: { id: string };
};

export default async function CustomerRequestPage({ params }: PageProps) {
  await requireUser();
  const supabase = getSupabaseServerClient();

  const { data: request } = await supabase
    .from("requests")
    .select("*")
    .eq("id", params.id)
    .single();

  const { data: call } = await supabase
    .from("calls")
    .select("*")
    .eq("request_id", params.id)
    .maybeSingle();

  const { data: outcome } = call
    ? await supabase.from("outcomes").select("*").eq("call_id", call.id).maybeSingle()
    : { data: null };

  if (!request) {
    return <p>Request not found.</p>;
  }

  return (
    <Card className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Request status</h1>
        <p className="text-sm text-slate-600">Trade: {request.trade}</p>
      </div>
      <p className="text-sm text-slate-700">Status: {request.status}</p>
      <p className="text-sm text-slate-600">{request.description}</p>
      {call && (request.status === "matched" || request.status === "in_call") ? (
        <Button asChild>
          <Link href={`/call/${call.id}`}>Join Call</Link>
        </Button>
      ) : null}
      {request.status === "completed" && outcome ? (
        <Button variant="secondary" asChild>
          <Link href={`/customer/request/${params.id}/outcome`}>View outcome</Link>
        </Button>
      ) : null}
    </Card>
  );
}
