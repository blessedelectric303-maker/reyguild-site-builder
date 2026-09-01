import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ChecklistEditor from "@/components/ChecklistEditor";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "ReyGuild - Job checklists" };

// The two lists a crew ticks off on every job, and the screen where an owner
// makes them their own.

export default async function ChecklistsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/checklists");

  let role = "";
  let arrival: any[] = [];
  let completion: any[] = [];
  let problem: string | null = null;

  try {
    const { data: mem } = await supabase
      .schema("suite")
      .from("memberships")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    role = ((mem as any) || {}).role || "";

    // A blank job id - we want the lines, not anybody's ticks.
    const a = await supabase
      .schema("suite")
      .rpc("job_checklist", { p_job: "", p_phase: "arrival" });
    const c = await supabase
      .schema("suite")
      .rpc("job_checklist", { p_job: "", p_phase: "completion" });
    if (a.error) problem = a.error.message;
    arrival = a.data || [];
    completion = c.data || [];
  } catch (e: any) {
    problem = e?.message || "Could not load the checklists.";
  }

  const isOffice = role === "owner" || role === "admin";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <BackLink />

      <h1 className="mt-3 text-xl font-bold text-white">Job checklists</h1>
      <p className="mt-1 text-sm leading-snug text-slate-400">
        What your crew ticks off when they arrive, and again before they leave.
        The lines marked <strong className="text-slate-200">warning screen</strong>{" "}
        are the ones that stop them in their tracks until they are done.
      </p>

      {problem ? (
        <p className="mt-4 rounded-xl border border-amber-700 bg-amber-950/30 p-4 text-sm text-amber-200">
          {problem}
        </p>
      ) : null}

      {!isOffice ? (
        <p className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-5 text-sm text-slate-300">
          Only an owner or an administrator can change the checklists. You will
          see them on each job as you work.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          <ChecklistEditor
            phase="arrival"
            items={arrival}
            heading="When they arrive"
          />
          <ChecklistEditor
            phase="completion"
            items={completion}
            heading="Before they leave"
          />
          <p className="rounded-xl bg-slate-900/40 p-4 text-xs leading-relaxed text-slate-400">
            These start as ReyGuild&rsquo;s suggestions and they are only
            suggestions. Booties and a facemask make sense for an electrician in
            somebody&rsquo;s living room and read as nonsense to a landscaper -
            and a line that reads as nonsense gets ticked without being read,
            which is worse than no line at all. Make them yours.
          </p>
        </div>
      )}
    </main>
  );
}
