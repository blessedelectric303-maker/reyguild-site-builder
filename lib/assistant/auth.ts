import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { isOrgLocked } from "@/lib/auth";
import { hasUnsignedDocuments } from "@/lib/signingGate";
import { Actor, AssistantError } from "./core";

// Resolve every request from the verified Suite identity. Never use a client
// role/company, a stale T&M cookie, a global email match, or a single-org guess.
export async function assistantActor(): Promise<Actor> {
  const sb = await createClient();
  const { data: { user }, error: authError } = await sb.auth.getUser();
  if (authError || !user?.email) throw new AssistantError("Sign in to ReyGuild first.", 401);
  // Direct API calls must honor the same onboarding gate as the app pages.
  // Reuse the shared gate so its grace periods and existing failure behavior
  // remain unchanged; never duplicate those rules in the assistant.
  if (await hasUnsignedDocuments())
    throw new AssistantError("Complete the required paperwork before using the assistant.", 403);
  const { data: memberships, error } = await sb.schema("suite").from("memberships")
    .select("role,company_id").eq("user_id", user.id).limit(2);
  if (error || !memberships || memberships.length !== 1)
    throw new AssistantError("Your company membership could not be verified. Ask the office to check it.", 403);
  const membership = memberships[0];
  const expectedRoles: Record<string, string> = {owner:"owner", manager:"owner", admin:"admin", administrator:"admin", supervisor:"technician", tech:"technician", technician:"technician", estimator:"technician", sales_rep:"technician", apprentice:"apprentice"};
  const expectedRole = expectedRoles[String(membership.role || "").toLowerCase()];
  if (!expectedRole) throw new AssistantError("Your role is not supported by the assistant.", 403);
  const { data: company, error: companyError } = await sb.schema("suite").from("companies")
    .select("tm_org_id").eq("id", membership.company_id).maybeSingle();
  if (companyError || !company?.tm_org_id) throw new AssistantError("Your company is not linked to Time and Material yet.", 403);
  const matches = await prisma.user.findMany({
    where: { orgId: company.tm_org_id, email: { equals: user.email.trim(), mode: "insensitive" }, isActive: true },
    select: {id:true,orgId:true,name:true,role:true,org:{select:{subscriptionStatus:true,trialEndsAt:true}}}, take:2,
  });
  if (matches.length !== 1 || matches[0].role !== expectedRole)
    throw new AssistantError("Your app roles need to be synchronized before using the assistant.", 403);
  const actor = matches[0];
  return {id:actor.id,orgId:actor.orgId,name:actor.name,role:actor.role,locked:isOrgLocked(actor.org)};
}

export function assistantConfigured() {
  return process.env.REYGUILD_ASSISTANT_ENABLED === "true" && !!process.env.OPENAI_API_KEY && !!process.env.OPENAI_MODEL && !!process.env.JWT_SECRET;
}
