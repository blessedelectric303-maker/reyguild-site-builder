import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// What the office has not dealt with yet. Accepted and unseen means "get this
// on the calendar" - which is the whole reason the accept button exists.
//
// Row security decides who sees this, not the route: the function refuses
// anybody below supervisor, and only ever returns the caller's own company.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [] });

  try {
    const { data, error } = await supabase
      .schema("suite")
      .rpc("open_proposal_responses");
    if (error) return NextResponse.json({ items: [] });
    return NextResponse.json({ items: data || [] });
  } catch {
    // Not deployed yet, or no access. An empty list means no badge, which is
    // the same as it was before this feature existed.
    return NextResponse.json({ items: [] });
  }
}

export async function POST(req: NextRequest) {
  let ref = "";
  try {
    const b = await req.json();
    ref = String(b.ref_id || "");
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!ref) return NextResponse.json({ error: "Missing proposal." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const { error } = await supabase
    .schema("suite")
    .rpc("acknowledge_proposal_response", { p_ref: ref });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
