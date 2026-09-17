import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { sendTeamInviteEmail } from "@/lib/email";
import { roleLabel } from "@/utils/roles";

export const dynamic = "force-dynamic";

// INVITING SOMEBODY ACTUALLY INVITES THEM.
// The invite row was being written and nothing else happened - the office had
// to copy a link and send it themselves, and anyone who did not know that had
// a person sitting there waiting for an email that was never coming.

export async function POST(req: NextRequest) {
  let email = "";
  let role = "";
  try {
    const body = await req.json();
    email = String(body.email || "").trim();
    role = String(body.role || "").trim();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "That email address does not look right." }, { status: 400 });
  }
  if (!role) return NextResponse.json({ error: "Pick a role first." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  // The company comes from the signed-in person, never from the browser.
  const { data: mem } = await supabase
    .schema("suite")
    .from("memberships")
    .select("company_id,role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const companyId = ((mem as any) || {}).company_id || "";
  const myRole = ((mem as any) || {}).role || "";
  if (!companyId) return NextResponse.json({ error: "No company found for you." }, { status: 400 });
  if (myRole !== "owner" && myRole !== "admin") {
    return NextResponse.json({ error: "Only an owner or administrator can invite people." }, { status: 403 });
  }

  const { data: invite, error } = await supabase
    .schema("suite")
    .from("invites")
    .insert({ company_id: companyId, email, role })
    .select("id,email,role,token,status")
    .single();
  if (error || !invite) {
    return NextResponse.json({ error: error?.message || "Could not create the invite." }, { status: 400 });
  }

  const { data: co } = await supabase
    .schema("suite")
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .maybeSingle();

  const meta: any = (user as any).user_metadata || {};
  const sent = await sendTeamInviteEmail({
    to: email,
    companyName: ((co as any) || {}).name || "",
    roleLabel: roleLabel(role),
    inviterName: (meta.full_name || meta.name || "").trim(),
    token: String((invite as any).token || ""),
  });

  // The invite exists either way. Say plainly whether the email went, so the
  // office can fall back to the copy-link button instead of waiting.
  return NextResponse.json({ ok: true, invite, emailed: !!sent.ok, reason: (sent as any).reason || "" });
}
