import { redirect } from "next/navigation";
import { hasUnsignedDocuments } from "@/lib/signingGate";
import { createClient } from "@/utils/supabase/server";
import { canAccess, homeFor } from "@/utils/roles";
import Invoicing from "./Invoicing";
import { hasAppAccess } from "@/lib/entitlements";

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
  // Paperwork first. Nobody writes a proposal for the company before they
  // have signed the company's documents.
  if (await hasUnsignedDocuments()) redirect("/onboarding");

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
    .select("status,trial_ends_at")
    .eq("user_id", user.id)
    .eq("app_key", "estimating");

  if (entErr) console.error("[estimating] entitlement read failed:", entErr.message);

  if (!hasAppAccess(ents)) redirect("/?no_access=estimating");

  const { data: mem } = await supabase
    .schema("suite")
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!mem?.role) redirect("/setup");
  const role = mem.role;
  if (!canAccess(role, "estimating")) redirect(homeFor(role));

  return <Invoicing />;
}

