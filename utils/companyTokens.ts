import { createClient } from "@/utils/supabase/server";
import { buildTokenMap, type CompanyFacts } from "@/utils/tokens";

// One place that answers "what should [COMPANY NAME] say for this person".
//
// The documents and the proposal terms are written UNIVERSAL - the same words
// serve every company - with [COMPANY NAME], [COMPANY PHONE] and
// [COMPANY ADDRESS] standing in for whatever that company calls itself. This
// loads the facts and hands back the map that fills them in.
//
// Anything a company has not filled in is left as the visible bracket rather
// than going blank, so it is obvious what is missing under Settings instead of
// a contract quietly shipping with a hole in it.

export async function companyTokensForCurrentUser(): Promise<Record<string, string>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return {};

    // Scoped to this user. An unscoped membership read hands back any member
    // of the company - the bug that once put a tech in the command center.
    const { data: mem } = await supabase
      .schema("suite")
      .from("memberships")
      .select("company_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const cid = ((mem as any) || {}).company_id;
    if (!cid) return {};

    const { data: co } = await supabase
      .schema("suite")
      .from("companies")
      .select("name,phone,email,website,address,city,state,zip,owner_name,trade,settings")
      .eq("id", cid)
      .maybeSingle();

    return buildTokenMap(((co || {}) as unknown) as CompanyFacts);
  } catch (e) {
    // No tokens is survivable: the reader shows the brackets, which is the
    // same thing an unfilled company profile does.
    return {};
  }
}
