import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// Save, add or delete a procedure. Every guard lives in the database
// functions - who may edit, what may be deleted, and the copy-on-edit that
// keeps a company off the ReyGuild template. This route only carries the
// request across.

export async function POST(req: NextRequest) {
  let action = "";
  let color = "";
  let title = "";
  let purpose = "";
  let onePager = "";
  try {
    const b = await req.json();
    action = String(b.action || "");
    color = String(b.color || "");
    title = String(b.title || "");
    purpose = String(b.purpose || "");
    onePager = String(b.onePager || "");
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  let fn = "";
  let args: Record<string, any> = {};

  if (action === "save") {
    fn = "save_procedure";
    args = { p_color: color, p_title: title, p_purpose: purpose, p_one_pager: onePager };
  } else if (action === "add") {
    fn = "add_procedure";
    args = { p_color: color, p_title: title, p_purpose: purpose, p_one_pager: onePager };
  } else if (action === "delete") {
    fn = "delete_procedure";
    args = { p_color: color };
  } else {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const { data, error } = await supabase.schema("suite").rpc(fn, args);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, result: data });
}
