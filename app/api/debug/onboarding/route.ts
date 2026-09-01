import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// A window into why the paperwork gate did or did not fire.
//
// Sign in as the account in question and open /api/debug/onboarding. It shows
// exactly what the command centre sees, including the ERROR - which the first
// version of the gate threw away, and which is why a broken check looked like
// a passing one.
//
// Safe to leave in: it only ever reports on the caller's own account, through
// the same row security every other page uses.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ signed_in: false });

  const out: any = { signed_in: true, email: user.email };

  const mem = await supabase
    .schema("suite")
    .from("memberships")
    .select("role,company_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  out.membership = mem.data || null;
  out.membership_error = mem.error?.message || null;

  const ent = await supabase
    .schema("suite")
    .from("entitlements")
    .select("app_key,status")
    .eq("user_id", user.id);
  out.entitlements = ent.data || null;
  out.entitlements_error = ent.error?.message || null;

  const ob = await supabase.schema("suite").rpc("my_onboarding");
  out.my_onboarding = ob.data || null;
  out.my_onboarding_error = ob.error?.message || null;

  const docs = await supabase.schema("suite").rpc("my_documents");
  out.documents_i_must_sign = (docs.data || [])
    .filter((d: any) => d.requires_signature)
    .map((d: any) => ({ key: d.doc_key, signed: d.signed }));
  out.documents_error = docs.error?.message || null;

  out.gate_would_fire =
    Array.isArray(ob.data) && ob.data[0] ? ob.data[0].complete === false : false;

  return NextResponse.json(out, { status: 200 });
}
