import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import NumberingForm from "@/components/NumberingForm";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "ReyGuild - Numbering" };

export default async function NumberingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/numbering");

  let role = "";
  let rows: any[] = [];
  try {
    const { data: mem } = await supabase
      .schema("suite")
      .from("memberships")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    role = ((mem as any) || {}).role || "";
    const { data } = await supabase.schema("suite").rpc("numbering_status");
    rows = data || [];
  } catch (e) {
    rows = [];
  }

  const isOffice = role === "owner" || role === "admin";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <BackLink />
      <h1 className="mt-3 text-xl font-bold text-white">
        Proposal and invoice numbers
      </h1>
      <p className="mt-1 text-sm leading-snug text-slate-400">
        Pick where you want to start. After that the app hands out the next one
        every time, so two people can never end up with the same number.
      </p>

      {!isOffice ? (
        <p className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-5 text-sm text-slate-300">
          Only an owner or an administrator can set the numbering.
        </p>
      ) : (
        <NumberingForm rows={rows} />
      )}

      <p className="mt-6 rounded-xl bg-slate-900/40 p-4 text-xs leading-relaxed text-slate-400">
        If you are moving over from another system, start one above your
        highest existing number so nothing collides with your old records. A
        prefix is optional &mdash; <span className="text-slate-200">INV-</span>{" "}
        or your initials, whatever your bookkeeper is used to seeing.
      </p>
    </main>
  );
}
