import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isStaff } from "@/utils/roles";
import ProcedureView from "./ProcedureView";

export const dynamic = "force-dynamic";

const COLOR: Record<string, { bg: string; text: string }> = {
  emergency: { bg: "#F0302A", text: "#ffffff" },
  estimate: { bg: "#1BBF55", text: "#000000" },
  service_call: { bg: "#2183E8", text: "#ffffff" },
  warranty_call: { bg: "#FF9012", text: "#000000" },
  concern: { bg: "#F2BE00", text: "#000000" },
  question: { bg: "#9B44CE", text: "#ffffff" },
  material: { bg: "#6E6E6E", text: "#ffffff" },
  absence: { bg: "#FF2E9A", text: "#ffffff" },
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
    .limit(1)
    .maybeSingle();
  const role = (mem as any)?.role || "owner";
  const companyId = (mem as any)?.company_id || "";
  if (!isStaff(role)) redirect("/");

  const { data: proc } = await supabase
    .schema("suite")
    .from("procedures")
    .select("id,color,title,purpose,qualifies,opening_script,may_say,may_not_say,one_pager,schedules_to_calendar,default_block_hours")
    .eq("company_id", companyId)
    .eq("color", color)
    .maybeSingle();

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
    .select("id,heading,body,collapsed_by_default,sort_order")
    .eq("procedure_id", pid)
    .order("sort_order");

  const { data: items } = await supabase
    .schema("suite")
    .from("checklist_items")
    .select("id,label,group_heading,field_key,input_type,choices,required_to_dispatch,required_to_close,sort_order")
    .eq("procedure_id", pid)
    .order("sort_order");

  return (
    <ProcedureView
      procedure={proc as any}
      sections={(sections as any[]) || []}
      items={(items as any[]) || []}
      skin={skin}
      companyId={companyId}
      userId={user.id}
    />
  );
}
