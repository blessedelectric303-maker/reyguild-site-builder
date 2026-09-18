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

  // THIS IS THE MOST SENSITIVE DATA IN THE SYSTEM - licences, W-4s, I-9
  // support documents, voided checks. The read above leans entirely on a
  // database policy, and the step below signs whatever path comes back with
  // the service role, which ignores policies altogether. If that policy is
  // ever dropped, renamed or lost in a migration, this becomes "any signed-in
  // person reads any company's paperwork by trying ids", with nothing else in
  // the way and no record of it. Uploads write the path as
  // <companyId>/<userId>/..., so the company can be checked here too - and
  // two locks that fail independently is the entire point.
  const { data: mem } = await supabase
    .schema("suite")
    .from("memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const companyId = ((mem as any) || {}).company_id || "";
  if (!companyId || !String(path).startsWith(companyId + "/")) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

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
