import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// Setting the starting number, and taking the next one.
//
// Taking a number is a WRITE even though it feels like a read - the whole
// point is that the database hands it out once and never again. So it is a
// POST, and nothing caches it.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ rows: [] });

  const { data, error } = await supabase.schema("suite").rpc("numbering_status");
  if (error) return NextResponse.json({ rows: [], error: error.message });
  return NextResponse.json({ rows: data || [] });
}

export async function POST(req: NextRequest) {
  let action = "", kind = "", start = 0, prefix = "";
  try {
    const b = await req.json();
    action = String(b.action || "");
    kind = String(b.kind || "");
    start = Number(b.start || 0);
    prefix = String(b.prefix || "");
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  if (action === "set") {
    const { error } = await supabase.schema("suite").rpc("set_starting_number", {
      p_kind: kind,
      p_start: start,
      p_prefix: prefix,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "next") {
    const { data, error } = await supabase
      .schema("suite")
      .rpc("next_document_number", { p_kind: kind });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, number: data });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
