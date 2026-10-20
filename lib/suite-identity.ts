import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

const roles: Record<string, string> = {
  owner: "owner", manager: "owner", admin: "admin", administrator: "admin",
  supervisor: "technician", tech: "technician", technician: "technician",
  estimator: "technician", sales_rep: "technician", apprentice: "apprentice",
};

// Read-only, fail-closed identity for Suite-derived sessions and the calendar.
// Never choose a company from a browser value, old T&M cookie or global email.
export async function verifiedSuiteIdentity() {
  try {
    const sb = await createClient();
    const { data: { user }, error } = await sb.auth.getUser();
    const email = (user?.email || "").trim().toLowerCase();
    if (error || !user || !email) return null;
    const { data: memberships, error: membershipError } = await sb.schema("suite")
      .from("memberships").select("role,company_id").eq("user_id", user.id).limit(2);
    if (membershipError || !memberships || memberships.length !== 1) return null;
    const membership = memberships[0];
    const roleKey = String(membership.role || "").trim().toLowerCase();
    if (!membership.company_id || !Object.hasOwn(roles, roleKey)) return null;
    const { data: company, error: companyError } = await sb.schema("suite")
      .from("companies").select("tm_org_id").eq("id", membership.company_id).maybeSingle();
    if (companyError || !company?.tm_org_id) return null;
    return { suiteUserId: user.id, companyId: membership.company_id as string,
      orgId: company.tm_org_id as string, email, role: roles[roleKey] };
  } catch { return null; }
}

export async function verifiedSuiteTmUser() {
  const identity = await verifiedSuiteIdentity();
  if (!identity) return null;
  try {
    const matches = await prisma.user.findMany({
      where: { orgId: identity.orgId, email: { equals: identity.email, mode: "insensitive" } },
      include: { org: true }, take: 2,
    });
    if (matches.length !== 1 || !matches[0].isActive || matches[0].role !== identity.role) return null;
    return matches[0];
  } catch { return null; }
}
