import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { canAccess, homeFor } from "@/utils/roles";
import Invoicing from "./Invoicing";

export const metadata = {
  title: "ReyGuild - Proposals & Invoicing",
  description: "Proposals, invoices, clients and the price list.",
};

export default async function EstimatingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // SCOPED TO THIS USER, and never maybeSingle() on an unfiltered read.
  //
  // This was: .from("entitlements").select("status").eq("app_key","estimating")
  //           .maybeSingle()
  //
  // No user filter. maybeSingle() ERRORS if more than one row comes back, so
  // the moment a second person existed the read failed, `ent` was null, and
  // everybody was redirected out of the app they had paid for. Same shape as
  // the unscoped membership lookups that once handed a tech the owner's row.
  const { data: ents, error: entErr } = await supabase
    .schema("suite")
    .from("entitlements")
    .select("status")
    .eq("user_id", user.id)
    .eq("app_key", "estimating");

  if (entErr) console.error("[estimating] entitlement read failed:", entErr.message);

  const statuses = (ents || []).map((e: any) => String(e.status));
  // 'trial' is accepted alongside 'trialing' so an account written before
  // SQL 51 is not locked out of the app it is paying for.
  const ok = statuses.some((st) =>
    st === "active" || st === "trialing" || st === "trial"
  );
  if (!ok) redirect("/?no_access=estimating");

  const { data: mem } = await supabase
    .schema("suite")
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const role = (mem as any)?.role || "owner";
  if (!canAccess(role, "estimating")) redirect(homeFor(role));

  return <Invoicing />;
}
