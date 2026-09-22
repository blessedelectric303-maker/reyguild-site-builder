import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/utils/supabase/server";
import { recordEvent } from "@/lib/ledger";

export const dynamic = "force-dynamic";

// Signing goes through the server rather than straight from the browser for
// one reason: the browser cannot be trusted to report its own IP address, and
// an IP is a large part of what makes an electronic signature hold up. The
// hash of the body is taken here too, from the copy in the database, not from
// anything the browser sent.

function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

export async function POST(req: NextRequest) {
  let key = "";
  let name = "";
  try {
    const body = await req.json();
    key = String(body.key || "");
    name = String(body.name || "");
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  if (!key) return NextResponse.json({ error: "Missing document." }, { status: 400 });
  if (name.trim().length < 2) {
    return NextResponse.json({ error: "Type your full name to sign." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  // Read the words back out of the database and hash those, so the record is
  // of what the document actually said, not what a browser claimed it said.
  const { data: doc, error: readErr } = await supabase
    .schema("suite")
    .rpc("document_body", { p_key: key });

  if (readErr || !doc || !doc.length) {
    return NextResponse.json({ error: "That document was not found." }, { status: 404 });
  }

  const hash = createHash("sha256").update(String(doc[0].body || ""), "utf8").digest("hex");

  const { error } = await supabase.schema("suite").rpc("sign_document", {
    p_key: key,
    p_typed_name: name.trim(),
    p_ip: clientIp(req),
    p_user_agent: req.headers.get("user-agent"),
    p_body_hash: hash,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // THE LEDGER. The signature row itself can be deleted by anybody with
  // database access; this line cannot, by anybody at all. It carries the hash
  // of the words that were actually signed, so the document can be proved
  // unchanged years later.
  try {
    const { data: mem } = await supabase
      .schema("suite")
      .from("memberships")
      .select("company_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const companyId = ((mem as any) || {}).company_id || "";
    if (companyId) {
      await recordEvent({
        companyId,
        event: "document.signed",
        refId: key,
        actor: user.email || name.trim(),
        detail: { typed_name: name.trim(), body_sha256: hash },
        ip: clientIp(req),
        userAgent: req.headers.get("user-agent"),
      });
    }
  } catch { /* the signature is saved; the ledger is evidence, not a gate */ }

  return NextResponse.json({ ok: true });
}
