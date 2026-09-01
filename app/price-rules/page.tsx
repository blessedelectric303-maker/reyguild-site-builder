import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import SectionRules from "@/components/SectionRules";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "ReyGuild - Price book rules" };

export default async function PriceRulesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/price-rules");

  let rules: any[] = [];
  let problem: string | null = null;
  try {
    const { data, error } = await supabase
      .schema("suite")
      .rpc("section_rules", { p_section: null });
    if (error) problem = error.message;
    rules = data || [];
  } catch (e: any) {
    problem = e?.message || "Could not load the rules.";
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <BackLink />
      <h1 className="mt-3 text-xl font-bold text-white">Price book rules</h1>
      <p className="mt-1 text-sm leading-snug text-slate-400">
        What is included, what triggers an upcharge, and which of it a customer
        is allowed to hear.
      </p>

      {problem ? (
        <p className="mt-4 rounded-xl border border-amber-700 bg-amber-950/30 p-4 text-sm text-amber-200">
          {problem}
        </p>
      ) : null}

      {rules.length === 0 && !problem ? (
        <p className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-5 text-sm text-slate-300">
          No rules loaded on this account yet.
        </p>
      ) : (
        <div className="rounded-xl bg-white p-1">
          <SectionRules rules={rules} />
        </div>
      )}
    </main>
  );
}
