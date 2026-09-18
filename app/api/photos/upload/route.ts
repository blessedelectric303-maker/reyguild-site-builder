import { NextRequest, NextResponse } from "next/server";
import { createClient as createUserClient } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// JOB PHOTOS LIVE IN STORAGE, NOT INSIDE THE PROPOSAL.
//
// They used to be pasted into the proposal record itself as base64 text. Ten
// photos on one job is several megabytes of text, every proposal in the
// company sits in ONE row, and that row is read and rewritten on every save -
// so a busy month made the whole app slow and eventually too big to save at
// all. Now the photo goes to a bucket and the proposal keeps a short link.
//
// The bucket is public on purpose: a customer opening a proposal from an
// emailed link is not signed in and has to see the pictures. The path carries
// a random id, so a link cannot be guessed, and nothing sensitive belongs in a
// job photo. Employee paperwork is the opposite case and stays private.

const BUCKET = "job-photos";
const MAX_BYTES = 6 * 1024 * 1024;

function service() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  // Scoped to this user. An unscoped membership read hands back somebody
  // else's row, which would file this company's photos under another company.
  const { data: mem } = await supabase
    .schema("suite")
    .from("memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const companyId = ((mem as any) || {}).company_id;
  if (!companyId) {
    return NextResponse.json({ error: "You are not on a company yet." }, { status: 400 });
  }

  let dataUrl = "";
  try {
    const b = await req.json();
    dataUrl = String(b.dataUrl || "");
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const m = /^data:(image\/(jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!m) return NextResponse.json({ error: "That is not an image." }, { status: 400 });

  const contentType = m[1];
  const ext = m[2] === "jpeg" ? "jpg" : m[2];
  const buffer = Buffer.from(m[3], "base64");
  if (buffer.length > MAX_BYTES) {
    return NextResponse.json({ error: "That photo is too large." }, { status: 400 });
  }

  const sb = service();
  if (!sb) return NextResponse.json({ error: "Storage is not configured." }, { status: 500 });

  const path =
    String(companyId) + "/" + Date.now().toString(36) + "-" + crypto.randomUUID() + "." + ext;

  const up = await sb.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });
  if (up.error) {
    // Nearly always a bucket that has not been created yet. Say so plainly
    // rather than leaving somebody staring at a photo that will not attach.
    return NextResponse.json(
      { error: "Photo storage is not set up yet: " + up.error.message },
      { status: 500 }
    );
  }

  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: pub.publicUrl, path });
}
