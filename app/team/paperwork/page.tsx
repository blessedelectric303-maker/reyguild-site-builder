import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { roleLabel } from "@/utils/roles";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";

// Who has signed what. Owner and administrator only - the function itself
// refuses anybody else, so this page cannot leak by being linked to.

type Row = {
  user_id: string;
  email: string;
  role: string;
  docs_total: number;
  docs_signed: number;
  uploads_done: number;
  last_signed: string | null;
};

export default async function PaperworkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/team/paperwork");

  let rows: Row[] = [];
  let reachable = true;
  try {
    const { data, error } = await supabase
      .schema("suite")
      .rpc("company_document_status");
    if (error) reachable = false;
    rows = (data || []) as Row[];
  } catch (e) {
    reachable = false;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <BackLink className="text-sm text-slate-400 underline hover:text-slate-200" />
      <h1 className="mt-3 text-xl font-bold text-white">Paperwork</h1>
      <p className="mt-1 text-sm text-slate-400">
        Signed agreements and uploaded forms, per person. Anybody short of the
        full count cannot get into the phone app.
      </p>

      {!reachable ? (
        <p className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-5 text-sm text-slate-300">
          Not loaded yet. Run SQL 27, 28 and 29, then come back.
        </p>
      ) : !rows.length ? (
        <p className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-5 text-sm text-slate-300">
          Nothing to show. Either nobody is on the team yet, or you are not an
          owner or administrator.
        </p>
      ) : (
        <div className="mt-6 space-y-2">
          {rows.map((r) => {
            const done = r.docs_total > 0 && r.docs_signed >= r.docs_total;
            return (
              <div
                key={r.user_id}
                className={
                  "rounded-xl border p-4 " +
                  (done ? "border-emerald-700 bg-emerald-950/30" : "border-amber-700 bg-amber-950/20")
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{r.email}</div>
                    <div className="text-xs text-slate-400">{roleLabel(r.role)}</div>
                  </div>
                  <div className="flex-none text-right">
                    <div
                      className={
                        "text-sm font-bold " + (done ? "text-emerald-400" : "text-amber-400")
                      }
                    >
                      {r.docs_signed} / {r.docs_total} signed
                    </div>
                    <div className="text-xs text-slate-500">
                      {r.uploads_done} file{r.uploads_done === 1 ? "" : "s"} uploaded
                    </div>
                  </div>
                </div>
                {r.last_signed ? (
                  <div className="mt-2 text-[11px] text-slate-500">
                    Last signed {new Date(r.last_signed).toLocaleString()}
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-amber-400">
                    Has not signed anything yet
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
