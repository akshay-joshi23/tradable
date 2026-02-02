import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <h2 className="text-xl font-semibold">Homeowners</h2>
        <p className="mt-2 text-sm text-slate-600">
          Create a repair request and meet a pro in minutes.
        </p>
        <Button className="mt-4" asChild>
          <Link href="/customer/request/new">Create Request</Link>
        </Button>
      </Card>
      <Card>
        <h2 className="text-xl font-semibold">Pros</h2>
        <p className="mt-2 text-sm text-slate-600">
          Claim open requests and diagnose issues on video.
        </p>
        <Button className="mt-4" variant="secondary" asChild>
          <Link href="/pro/dashboard">View Open Requests</Link>
        </Button>
      </Card>
    </div>
  );
}
