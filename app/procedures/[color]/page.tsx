import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isStaff, isOwnerOrAdmin } from "@/utils/roles";
import ProcedureView from "./ProcedureView";
import { buildTokenMap, fillTokens, hasUnfilled, type CompanyFacts } from "@/utils/tokens";
import { CALL_COLORS, NON_CALL_COLORS } from "@/utils/callColors";

export const dynamic = "force-dynamic";

// The eight call colours plus the three screens that are not call types.
// One definition, in utils/callColors.ts - a colour missing from here is a
// colour that redirects to "/" and looks broken.
const COLOR: Record<string, { bg: string; text: string }> = {
  ...CALL_COLORS,
  ...NON_CALL_COLORS,
};

export default async function ProcedurePage({ params }: { params: Promise<{ color: string }> }) {
  const { color } = await params;
  const skin = COLOR[color];
  if (!skin) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: mem } = await supabase
    .schema("suite")
    .from("memberships")
    .select("role,company_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const role = (mem as any)?.role || "owner";
  const companyId = (mem as any)?.company_id || "";
  if (!isStaff(role)) redirect("/");

  const { data: co } = await supabase
    .schema("suite")
    .from("companies")
    .select("name,phone,email,website,address,city,state,zip,owner_name,trade,settings")
    .eq("id", companyId)
    .maybeSingle();

  let { data: proc } = await supabase
    .schema("suite")
    .from("procedures")
    .select("id,color,title,purpose,qualifies,opening_script,may_say,may_not_say,one_pager,schedules_to_calendar,default_block_hours")
    .eq("company_id", companyId)
    .eq("color", color)
    .maybeSingle();

  // Fall back to the universal template. Without this a brand new company
  // opens a coloured button and finds nothing behind it - the templates were
  // sitting there at company_id null the whole time, and only the tech side
  // knew to look. That is what made a new account's procedure boxes empty.
  if (!proc) {
    const { data: tmpl } = await supabase
      .schema("suite")
      .from("procedures")
      .select("id,color,title,purpose,qualifies,opening_script,may_say,may_not_say,one_pager,schedules_to_calendar,default_block_hours")
      .is("company_id", null)
      .eq("color", color)
      .maybeSingle();
    if (tmpl) proc = tmpl;
  }

  if (!proc) {
    return (
      <main className="min-h-screen p-8 text-center">
        <h1 className="text-2xl text-white">This procedure has not been set up yet</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">An owner or admin can add the wording under Settings. Until then there is nothing to show here.</p>
      </main>
    );
  }

  const pid = (proc as any).id;

  const { data: sections } = await supabase
    .schema("suite")
    .from("procedure_sections")
    .select("id,heading,body,collapsed_by_default,sort_order,color_tag")
    .eq("procedure_id", pid)
    .order("sort_order");

  const { data: items } = await supabase
    .schema("suite")
    .from("checklist_items")
    .select("id,label,group_heading,field_key,input_type,choices,required_to_dispatch,required_to_close,sort_order")
    .eq("procedure_id", pid)
    .order("sort_order");

  // Fill the bracketed placeholders from this company's own details.
  const tokens = buildTokenMap((co || {}) as CompanyFacts);
  const p = proc as any;
  const filled = {
    ...p,
    purpose: fillTokens(p.purpose, tokens),
    qualifies: fillTokens(p.qualifies, tokens),
    opening_script: fillTokens(p.opening_script, tokens),
    may_say: fillTokens(p.may_say, tokens),
    may_not_say: fillTokens(p.may_not_say, tokens),
    one_pager: fillTokens(p.one_pager, tokens),
  };
  const filledSections = ((sections as any[]) || []).map((s) => ({
    ...s,
    heading: fillTokens(s.heading, tokens),
    body: fillTokens(s.body, tokens),
  }));
  const filledItems = ((items as any[]) || []).map((i) => ({
    ...i,
    label: fillTokens(i.label, tokens),
  }));

  const missing =
    hasUnfilled(p.one_pager, tokens) ||
    hasUnfilled(p.opening_script, tokens) ||
    ((sections as any[]) || []).some((s) => hasUnfilled(s.body, tokens));

  return (
    <ProcedureView
      procedure={filled}
      sections={filledSections}
      items={filledItems}
      unfilled={missing}
      skin={skin}
      companyId={companyId}
      userId={user.id}
      settings={((co as any)?.settings as Record<string, any>) || null}
      canEdit={isOwnerOrAdmin(role)}
    />
  );
}
