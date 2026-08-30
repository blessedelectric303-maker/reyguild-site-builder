import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// Sign up ticks one box for the terms, the privacy policy and the cookie
// policy together. Three separate signatures are still recorded, because a
// single "I agree to everything" row is worth very little later - you want to
// be able to say which version of which document that person accepted.

export async function POST(req: NextRequest) {
  let name = "";
  try {
    const body = await req.json();
    name = String(body.name || "");
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  if (name.trim().length < 2) {
    return NextResponse.json({ error: "We need your name." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0].trim() : req.headers.get("x-real-ip");
  const ua = req.headers.get("user-agent");

  const { data: docs } = await supabase.schema("suite").rpc("my_documents");
  const platform = (docs || []).filter(
    (d: any) => d.is_platform && d.requires_signature && !d.signed
  );

  const signed: string[] = [];
  for (const d of platform) {
    const { data: full } = await supabase
      .schema("suite")
      .rpc("document_body", { p_key: d.doc_key });
    const text = full && full.length ? String(full[0].body || "") : "";
    const hash = createHash("sha256").update(text, "utf8").digest("hex");

    const { error } = await supabase.schema("suite").rpc("sign_document", {
      p_key: d.doc_key,
      p_typed_name: name.trim(),
      p_ip: ip,
      p_user_agent: ua,
      p_body_hash: hash,
    });
    if (!error) signed.push(d.doc_key);
  }

  return NextResponse.json({ ok: true, signed });
}
