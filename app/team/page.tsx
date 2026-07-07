import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import TeamManager from "./TeamManager";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.schema("suite").rpc("ensure_company");

  const { data: mem } = await supabase
    .schema("suite")
    .from("memberships")
    .select("role,company_id")
    .limit(1)
    .maybeSingle();

  const role = (mem as any)?.role || "owner";
  const companyId = (mem as any)?.company_id;
  if (!companyId || !(role === "owner" || role === "admin")) redirect("/");

  const { data: company } = await supabase
    .schema("suite")
    .from("companies")
    .select("name,army_mode,owner_is_admin")
    .eq("id", companyId)
    .maybeSingle();

  const { data: members } = await supabase
    .schema("suite")
    .from("memberships")
    .select("id,user_id,role,created_at")
    .eq("company_id", companyId)
    .order("created_at");

  const { data: invites } = await supabase
    .schema("suite")
    .from("invites")
    .select("id,email,role,token,status,created_at")
    .eq("company_id", companyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <TeamManager
      companyName={(company as any)?.name || "My Company"}
      companyId={companyId}
      armyMode={(company as any)?.army_mode === true}
      ownerIsAdmin={(company as any)?.owner_is_admin !== false}
      members={(members as any) ?? []}
      invites={(invites as any) ?? []}
    />
  );
}
