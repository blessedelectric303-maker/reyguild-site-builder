import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// Editing the arrival and completion checklists.
//
// Every guard is in the database: only an owner or admin may change anything,
// and touching the list copies it into the company first so the ReyGuild
// original is never altered and "back to original" always works.

export async function POST(req: NextRequest) {
  let action = "", phase = "", item = "", label = "";
  let emphasis = false, sort = 999;
  try {
    const b = await req.json();
    action = String(b.action || "");
    phase = String(b.phase || "");
    item = String(b.item || "");
    label = String(b.label || "");
    emphasis = !!b.emphasis;
    sort = Number(b.sort || 999);
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  let fn = "", args: Record<string, any> = {};
  if (action === "save") {
    fn = "save_checklist_item";
    args = { p_phase: phase, p_item: item || null, p_label: label,
             p_emphasis: emphasis, p_sort: sort };
  } else if (action === "remove") {
    fn = "remove_checklist_item";
    args = { p_phase: phase, p_item: item };
  } else if (action === "reset") {
    fn = "reset_checklist";
    args = { p_phase: phase };
  } else {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const { data, error } = await supabase.schema("suite").rpc(fn, args);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, result: data });
}
