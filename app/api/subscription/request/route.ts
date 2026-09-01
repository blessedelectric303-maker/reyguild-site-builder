import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// Records a pause or cancel request. Stripe is not connected yet, so nothing
// can actually stop billing today - but a person who taps Cancel has made a
// decision, and losing it until billing is wired up is how you end up
// charging somebody who asked you to stop.

export async function POST(req: NextRequest) {
  let request = "";
  let reason = "";
  try {
    const b = await req.json();
    request = String(b.request || "");
    reason = String(b.reason || "").slice(0, 2000);
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const { error } = await supabase
    .schema("suite")
    .rpc("request_subscription_change", { p_request: request, p_reason: reason });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
