import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { canAccess, homeFor } from "@/utils/roles";
import FieldLog from "./FieldLog";

export default async function FieldLogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ent } = await supabase
    .schema("suite")
    .from("entitlements")
    .select("status")
    .eq("app_key", "app_four")
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
  if (!canAccess(role, "app_four")) redirect(homeFor(role));

  return <FieldLog />;
}
