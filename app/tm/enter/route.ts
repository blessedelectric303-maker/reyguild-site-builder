import { NextResponse } from "next/server";
import { hasUnsignedDocuments } from "@/lib/signingGate";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie, getCurrentUser, clearSessionCookie } from "@/lib/auth";
import { safePath } from "@/lib/safe-path";
import { canReuseTmSession } from "@/lib/tm-session";
import { tmRoleFor } from "@/utils/roles";

export const dynamic = "force-dynamic";

function homeForRole(role: string): string {
  return role === "owner" || role === "admin" ? "/tm/admin" : "/tm/tech";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const wanted = safePath(url.searchParams.get("next"), "");
  const problem = (reason: string) => {
    const target = new URL("/tm/no-access", url.origin);
    target.searchParams.set("reason", reason);
    return NextResponse.redirect(target);
  };

  // Resolve the portal identity before considering a different person's old T&M cookie.
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    await clearSessionCookie();
    const login = new URL("/login", url.origin);
    login.searchParams.set("next", "/tm/enter" + url.search);
    return NextResponse.redirect(login);
  }

  const email = (user.email || "").trim().toLowerCase();
  if (!email) return problem("noemail");
  if (!user.email_confirmed_at) return problem("unverified");

  const { data: membership, error: membershipError } = await supabase
    .schema("suite").from("memberships")
    .select("company_id,role").eq("user_id", user.id).limit(1).maybeSingle();
  if (membershipError) return problem("db");
  if (!membership?.company_id || !membership.role) {
    await clearSessionCookie();
    return problem("membership");
  }

  const { data: company, error: companyError } = await supabase
    .schema("suite").from("companies").select("tm_org_id")
    .eq("id", membership.company_id).maybeSingle();
  if (companyError) return problem("db");
  if (!company?.tm_org_id) {
    await clearSessionCookie();
    return problem("nolink");
  }

  if (await hasUnsignedDocuments()) return NextResponse.redirect(new URL("/onboarding", url.origin));

  const identity = { orgId: String(company.tm_org_id), email, role: tmRoleFor(membership.role) };
  const existing = await getCurrentUser();
  if (canReuseTmSession(existing, identity)) {
    return NextResponse.redirect(new URL(wanted || homeForRole(identity.role), url.origin));
  }
  await clearSessionCookie();

  try {
    const found = await prisma.user.findFirst({
      where: { orgId: identity.orgId, email: { equals: email, mode: "insensitive" } },
    });
    // Do not reactivate an account the office deliberately disabled.
    if (found && !found.isActive) return problem("inactive");

    const name = String(user.user_metadata?.full_name || user.user_metadata?.name || "").trim() || email.split("@")[0];
    const tmUser = await prisma.user.upsert({
      where: { orgId_email: { orgId: identity.orgId, email: found?.email || email } },
      update: { role: identity.role },
      create: {
        id: "usr_" + crypto.randomUUID(),
        ...identity,
        name,
        isActive: true,
        passwordHash: "",
      },
    });
    if (!tmUser.isActive) return problem("inactive");
    const token = await createSessionToken(tmUser.id);
    await setSessionCookie(token);
    return NextResponse.redirect(new URL(wanted || homeForRole(identity.role), url.origin));
  } catch (error) {
    console.error("[tm/enter] could not establish linked workspace session", error);
    return problem("session");
  }
}

