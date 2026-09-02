import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// Editing a document - the booklet parts, the safety procedures, the NDAs.
//
// Same copy-on-edit shape as the procedures: pressing save clones the
// ReyGuild template into the company first, so from the first keystroke they
// are writing to their own copy and every other customer still sees ours.
//
// The guards live in the database. This route only carries the request.

export async function POST(req: NextRequest) {
  let action = "", key = "", title = "", body = "", summary = "";
  try {
    const b = await req.json();
    action = String(b.action || "");
    key = String(b.key || "");
    title = String(b.title || "");
    body = String(b.body || "");
    summary = String(b.summary || "");
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  if (action === "save") {
    const { error } = await supabase.schema("suite").rpc("save_document", {
      p_key: key,
      p_title: title,
      p_summary: summary,
      p_body: body,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "revert") {
    const { data, error } = await supabase
      .schema("suite")
      .rpc("reset_document", { p_key: key });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, result: data });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
