import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
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

  return <FieldLog />;
}
