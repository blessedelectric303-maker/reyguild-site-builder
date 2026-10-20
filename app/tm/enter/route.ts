import { NextResponse } from "next/server";
import { hasUnsignedDocuments } from "@/lib/signingGate";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie, clearSessionCookie } from "@/lib/auth";
import { safeNextPath } from "@/lib/invite-flow";

export const dynamic = "force-dynamic";

// This bridge authorizes a T&M session from the current verified Suite identity.
// An old T&M cookie, an email match in another company or one organization in
// the database is never evidence of current company membership.
const roles: Record<string, string> = {
  owner: "owner", manager: "owner", admin: "admin", administrator: "admin",
  supervisor: "technician", tech: "technician", technician: "technician",
  estimator: "technician", sales_rep: "technician", apprentice: "apprentice",
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const problem = (reason: string) => {
    const target = new URL("/tm/no-access", url.origin);
    target.searchParams.set("reason", reason);
    return NextResponse.redirect(target);
  };
  // Clear before every denial as well as account switches. Never leave the
  // previous person's cookie active when this identity cannot enter T&M.
  try { await clearSessionCookie(); } catch { return problem("session"); }

  try {
    const sb = await createClient();
    const { data: { user }, error: authError } = await sb.auth.getUser();
    if (authError || !user) return NextResponse.redirect(new URL("/login", url.origin));
    const email = (user.email || "").trim().toLowerCase();
    if (!email) return problem("noemail");
    if (await hasUnsignedDocuments()) return NextResponse.redirect(new URL("/onboarding", url.origin));

    const { data: memberships, error: membershipError } = await sb.schema("suite")
      .from("memberships").select("role,company_id").eq("user_id", user.id).limit(2);
    if (membershipError || !memberships || memberships.length !== 1) return problem("nolink");
    const membership = memberships[0];
    const roleKey = String(membership.role || "").trim().toLowerCase();
    const role = Object.hasOwn(roles, roleKey) ? roles[roleKey] : undefined;
    if (!membership.company_id || !role) return problem("nolink");
    const { data: company, error: companyError } = await sb.schema("suite")
      .from("companies").select("tm_org_id").eq("id", membership.company_id).maybeSingle();
    if (companyError || !company?.tm_org_id) return problem("nolink");

    // Include inactive rows in the lookup: an inactive employee must not be
    // recreated as an active employee merely by revisiting the bridge.
    const findMatches = () => prisma.user.findMany({
      where: { orgId: company.tm_org_id, email: { equals: email, mode: "insensitive" } },
      select: { id: true, orgId: true, role: true, isActive: true }, take: 2,
    });
    let matches = await findMatches();
    if (matches.length === 0) {
      // Preserve the one-invite flow only for an explicit, verified company
      // link and a recognized role. No single-company or default-role guess.
      const meta = user.user_metadata || {};
      const name = String(meta.full_name || meta.name || "").trim() || email.split("@")[0];
      try {
        await prisma.user.create({ data: {
          id: "usr_" + crypto.randomUUID(), orgId: company.tm_org_id,
          email, name, role, isActive: true, passwordHash: "",
        } });
      } catch (error) {
        // Parallel entry may have already provisioned this exact org/email.
        if ((error as { code?: string }).code !== "P2002") return problem("nouser");
      }
      matches = await findMatches();
    }
    if (matches.length !== 1 || !matches[0].isActive || matches[0].role !== role)
      return problem("nouser");

    const token = await createSessionToken(matches[0].id, { source: "suite", suiteUserId: user.id, companyId: membership.company_id });
    await setSessionCookie(token);
    const home = role === "owner" || role === "admin" ? "/tm/admin" : "/tm/tech";
    const wanted = url.searchParams.get("next");
    const safe = safeNextPath(wanted);
    return NextResponse.redirect(new URL(wanted && safe !== "/" ? safe : home, url.origin));
  } catch {
    return problem("db");
  }
}
