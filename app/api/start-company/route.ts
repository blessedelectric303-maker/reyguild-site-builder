import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// WHAT HAPPENS THE SECOND SOMEBODY SIGNS UP.
//
// Two things, and both have bitten us:
//
//   1. The company is created NOW. Someone who signs up is an owner starting
//      their own company. Until that company exists they look like a person
//      with no company at all, and the T and M side used to take that to mean
//      "employee" - which is how a stranger ended up inside somebody else's
//      business as a technician.
//   2. Any T and M cookie left in this browser is thrown away. That cookie
//      belongs to whoever used the browser last. Carried into a brand new
//      account it hands the new person the old person's portal.

const TM_SESSION = "blessed_track_session";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  try {
    const store = await cookies();
    store.delete(TM_SESSION);
  } catch (e) {
    // Nothing more to do; the checks below still run.
  }

  const { error } = await supabase.schema("suite").rpc("ensure_company");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Say what they ended up as, so the sign up page can prove it worked.
  const { data: mem } = await supabase
    .schema("suite")
    .from("memberships")
    .select("role,company_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    role: ((mem as any) || {}).role || "",
    company_id: ((mem as any) || {}).company_id || "",
  });
}
