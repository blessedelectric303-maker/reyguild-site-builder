import { NextRequest, NextResponse } from "next/server";
import { createClient as createUserClient } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Uploaded paperwork - a licence card, a signed W-4, an I-9 support document,
// a voided check - is the most sensitive thing this company will ever hold.
// It goes into a PRIVATE bucket through the service role, and it is only ever
// read back through a signed link that expires. It is never a public URL.

const MAX_BYTES = 15 * 1024 * 1024;

const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "application/pdf",
];

function service() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("Storage is not configured on this deployment.");
  return createClient(url, key, { auth: { persistSession: false } });
}

function safeName(name: string): string {
  return (name || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(-80);
}

export async function POST(req: NextRequest) {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  // Scoped to this user. An unscoped membership read hands back somebody
  // else's row - that bug has already cost us once.
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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Bad upload." }, { status: 400 });
  }

  const slot = String(form.get("slot") || "");
  const file = form.get("file") as File | null;
  const licenseType = String(form.get("license_type") || "") || null;
  const licenseNumber = String(form.get("license_number") || "") || null;
  const expiresOn = String(form.get("expires_on") || "") || null;

  if (!slot) return NextResponse.json({ error: "Missing slot." }, { status: 400 });
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Pick a file first." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That file is too big. 15 MB is the limit - a photo of the page is plenty." },
      { status: 400 }
    );
  }
  if (file.type && !ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Photos and PDFs only." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = companyId + "/" + user.id + "/" + slot + "-" + Date.now() + "-" + safeName(file.name);

  let sb;
  try {
    sb = service();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const up = await sb.storage.from("employee-docs").upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (up.error) {
    return NextResponse.json({ error: "Upload failed: " + up.error.message }, { status: 500 });
  }

  const { error: insErr } = await sb
    .schema("suite")
    .from("member_files")
    .insert({
      company_id: companyId,
      user_id: user.id,
      slot,
      file_name: file.name,
      storage_path: up.data.path,
      mime_type: file.type || null,
      size_bytes: file.size,
      license_type: licenseType,
      license_number: licenseNumber,
      expires_on: expiresOn || null,
    });

  if (insErr) {
    // The file landed but the row did not. Take the file back out rather than
    // leaving an orphan nobody can see or delete.
    await sb.storage.from("employee-docs").remove([up.data.path]);
    return NextResponse.json({ error: "Could not save: " + insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, file_name: file.name });
}
