import { NextResponse } from "next/server";
import { createRequestSchema } from "@/lib/validation";
import { requireUser } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const user = await requireUser();
  const payload = await request.json();
  const parsed = createRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("requests")
    .insert({
      customer_id: user.id,
      trade: parsed.data.trade,
      description: parsed.data.description,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Unable to create request." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
