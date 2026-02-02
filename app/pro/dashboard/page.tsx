import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ClaimButton } from "@/components/pro/claim-button";
import { Button } from "@/components/ui/button";

export default async function ProDashboardPage() {
  const user = await requireUser();
  const supabase = getSupabaseServerClient();

  const { data: profile } = await supabase
    .from("pro_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: requests } = await supabase
    .from("requests")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: true });

  const { data: myCalls } = await supabase
    .from("calls")
    .select("*")
    .eq("pro_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-xl font-semibold">Pro dashboard</h1>
        {profile ? (
          <p className="text-sm text-slate-600">
            Trade: {profile.trade} · Radius: {profile.service_radius_miles} miles
          </p>
        ) : (
          <p className="text-sm text-amber-600">
            No pro profile found. Add one in Supabase to claim requests.
          </p>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Open requests</h2>
        {!requests?.length ? (
          <p className="text-sm text-slate-600">No open requests right now.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="rounded-md border border-slate-200 p-4">
                <p className="text-sm font-medium">{request.trade}</p>
                <p className="text-sm text-slate-600">{request.description}</p>
                <div className="mt-3">
                  <ClaimButton requestId={request.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Your active calls</h2>
        {!myCalls?.length ? (
          <p className="text-sm text-slate-600">No active calls yet.</p>
        ) : (
          <div className="space-y-2">
            {myCalls.map((call) => (
              <div key={call.id} className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Request {call.request_id}
                </div>
                <Button variant="secondary" asChild>
                  <Link href={`/call/${call.id}`}>Join call</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
