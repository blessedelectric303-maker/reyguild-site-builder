import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { buildTokenMap, fillTokens, type CompanyFacts } from "@/utils/tokens";
import { techCard, skinFor } from "@/utils/techProcedures";
import TechProcedureView from "./TechProcedureView";

export const dynamic = "force-dynamic";

export default async function TechProcedurePage({ params }: { params: Promise<{ color: string }> }) {
  const { color } = await params;
  const card = techCard(color);
  if (!card) redirect("/tm/tech/procedures");

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // One database, two doors. The T and M app signs you in with its own
  // session, but the procedures live on the ReyGuild side - so we read them
  // through the Supabase session the tech already picked up at /tm/enter.
  let proc: any = null;
  let items: any[] = [];
  let facts: CompanyFacts = {} as CompanyFacts;
  let reachable = true;

  try {
    const supabase = await createClient();
    const {
      data: { user: su },
    } = await supabase.auth.getUser();
    const { data: mem } = await supabase
      .schema("suite")
      .from("memberships")
      .select("company_id")
      .eq("user_id", su?.id || "")
      .limit(1)
      .maybeSingle();
    const cid = ((mem as any) || {}).company_id || "";
    if (!cid) {
      reachable = false;
    } else {
      const { data: co } = await supabase
        .schema("suite")
        .from("companies")
        .select("name,phone,email,website,address,city,state,zip,owner_name,trade,settings")
        .eq("id", cid)
        .maybeSingle();
      facts = ((co || {}) as unknown) as CompanyFacts;

      const { data: p } = await supabase
        .schema("suite")
        .from("procedures")
        .select("id,color,title,purpose,one_pager")
        .eq("company_id", cid)
        .eq("color", color)
        .maybeSingle();
      proc = p || null;

      // Fall back to the universal template if this company has no copy of
      // its own yet. The cards are identical until somebody edits them, so
      // showing the template beats showing a tech an empty screen on a job.
      if (!proc) {
        const { data: t } = await supabase
          .schema("suite")
          .from("procedures")
          .select("id,color,title,purpose,one_pager")
          .is("company_id", null)
          .eq("color", color)
          .maybeSingle();
        proc = t || null;
      }

      if (proc) {
        const { data: rows } = await supabase
          .schema("suite")
          .from("checklist_items")
          .select("id,label,group_heading,sort_order")
          .eq("procedure_id", proc.id)
          .order("sort_order");
        items = (rows as any[]) || [];
      }
    }
  } catch (e) {
    reachable = false;
  }

  const skin = skinFor(card);

  if (!reachable || !proc) {
    return (
      <div>
        <div className="rounded-xl p-4 text-center" style={{ background: skin.bg, color: skin.text }}>
          <div className="text-sm font-extrabold uppercase tracking-widest">{card.label}</div>
        </div>
        <p className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-600">
          This card has not been loaded yet. Nothing is broken - your office
          needs to add it. Everything else in the app still works.
        </p>
        <Link href="/tm/tech/procedures" className="mt-4 block text-center text-sm text-slate-500 underline">
          Back to procedures
        </Link>
      </div>
    );
  }

  const tokens = buildTokenMap(facts);

  return (
    <TechProcedureView
      color={color}
      procedureId={proc.id}
      label={card.label}
      skin={skin}
      purpose={fillTokens(proc.purpose, tokens)}
      onePager={fillTokens(proc.one_pager, tokens)}
      items={items.map((i) => ({
        id: i.id,
        label: fillTokens(i.label, tokens) || i.label,
        group: i.group_heading || "Checklist",
      }))}
    />
  );
}
