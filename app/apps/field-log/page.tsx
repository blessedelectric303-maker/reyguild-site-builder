import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { canAccess, homeFor } from "@/utils/roles";
import FieldLog from "./FieldLog";
import { hasAppAccess } from "@/lib/entitlements";

export default async function FieldLogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ents } = await supabase
    .schema("suite")
    .from("entitlements")
    .select("status,trial_ends_at")
    .eq("user_id", user.id)
    .eq("app_key", "app_four");
  if (!hasAppAccess(ents)) redirect("/?no_access=app_four");

  const { data: mem } = await supabase
    .schema("suite")
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!mem?.role) redirect("/setup");
  const role = mem.role;
  if (!canAccess(role, "app_four")) redirect(homeFor(role));

  return <FieldLog />;
}

