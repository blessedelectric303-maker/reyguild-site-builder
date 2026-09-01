import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// Ticking a checklist box. The tick is the record that it was actually done,
// which is what matters on a damage claim three months later - so it is
// written to the database at the moment of the tap, not held in the page and
// saved at the end where a dropped signal loses it.

export async function POST(req: NextRequest) {
  let job = "";
  let item = "";
  let on = true;
  try {
    const b = await req.json();
    job = String(b.job || "");
    item = String(b.item || "");
    on = b.on !== false;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!job || !item) {
    return NextResponse.json({ error: "Missing job or item." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const { error } = await supabase.schema("suite").rpc("tick_job_checklist", {
    p_job: job,
    p_item: item,
    p_on: on,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
