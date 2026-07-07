import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { canAccess, homeFor } from "@/utils/roles";
import Builder from "./Builder";

export default async function SiteBuilderPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ent } = await supabase
    .schema("suite")
    .from("entitlements")
    .select("status")
    .eq("app_key", "site_builder")
    .maybeSingle();
  const ok = ent && (ent.status === "active" || ent.status === "trialing");
  if (!ok) redirect("/");

  const { data: mem } = await supabase
    .schema("suite")
    .from("memberships")
    .select("role")
    .limit(1)
    .maybeSingle();
  const role = (mem as any)?.role || "owner";
  if (!canAccess(role, "site_builder")) redirect(homeFor(role));

  return <Builder />;
}
