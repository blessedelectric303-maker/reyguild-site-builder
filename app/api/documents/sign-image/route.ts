import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// The drawn signature is attached to the signature record that was just
// written. It is deliberately a second step: the legally important part - the
// name, the time, the IP and the hash of the words - is saved first, so a
// picture that fails to upload can never cost somebody their signature.

export async function POST(req: NextRequest) {
  let key = "";
  let png = "";
  try {
    const body = await req.json();
    key = String(body.key || "");
    png = String(body.png || "");
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!key || !png.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }
  if (png.length > 400000) {
    return NextResponse.json({ error: "Signature too large." }, { status: 413 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const { error } = await supabase.schema("suite").rpc("attach_signature_image", {
    p_key: key,
    p_png: png,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
