import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Invoicing from "./Invoicing";

export default async function EstimatingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ent } = await supabase
    .schema("suite")
    .from("entitlements")
    .select("status")
    .eq("app_key", "estimating")
    .maybeSingle();
  const ok = ent && (ent.status === "active" || ent.status === "trialing");
  if (!ok) redirect("/");

  return <Invoicing />;
}
