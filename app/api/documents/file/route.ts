import { NextRequest, NextResponse } from "next/server";
import { createClient as createUserClient } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Hands back a link that works for five minutes and then stops. Row security
// on suite.member_files decides whether this person is allowed to see the row
// at all - you get your own files, and an owner or administrator gets their
// company's. Anyone else asking gets a 404 and learns nothing.

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const { data: row } = await supabase
    .schema("suite")
    .from("member_files")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  const path = ((row as any) || {}).storage_path;
  if (!path) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    return NextResponse.json({ error: "Storage is not configured." }, { status: 500 });
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const signed = await sb.storage.from("employee-docs").createSignedUrl(path, 300);

  if (signed.error || !signed.data) {
    return NextResponse.json({ error: "Could not open that file." }, { status: 500 });
  }

  return NextResponse.redirect(signed.data.signedUrl);
}
