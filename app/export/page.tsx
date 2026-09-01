import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";

// YOUR DATA, WHENEVER YOU WANT IT
//
// Section by section as CSV, or the whole lot as one JSON file. No support
// ticket, no waiting, no "contact us to discuss your options".
//
// The honest bit is at the bottom: the ReyGuild templates are not included,
// and the page says so plainly rather than letting somebody discover it after
// they have cancelled.

const SECTIONS = [
  { key: "clients", label: "Clients", blurb: "Every customer, with addresses and contact details." },
  { key: "pricelist", label: "Price list", blurb: "Your items, both prices, hours, scope and notes." },
  { key: "proposals", label: "Proposals", blurb: "Every proposal, its line items and its status." },
  { key: "invoices", label: "Invoices", blurb: "Every invoice, its payments and its balance." },
  { key: "responses", label: "Customer answers", blurb: "Who accepted, who declined, and why." },
  { key: "people", label: "Team", blurb: "Your staff records as held in Proposals and Invoicing." },
  { key: "signatures", label: "Signed paperwork", blurb: "Who signed what, when, and the hash of the exact wording." },
  { key: "files", label: "Uploaded forms", blurb: "The index of licences, tax forms and ID your staff handed in." },
  { key: "documents", label: "Your own documents", blurb: "Policies and procedures you wrote yourself." },
  { key: "messages", label: "Messages", blurb: "In-app conversations." },
];

export default async function ExportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/export");

  let role = "";
  try {
    const { data: mem } = await supabase
      .schema("suite")
      .from("memberships")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    role = ((mem as any) || {}).role || "";
  } catch {
    role = "";
  }

  const allowed = role === "owner" || role === "admin";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <BackLink className="text-sm text-slate-400 underline hover:text-slate-200" />

      <h1 className="mt-3 text-xl font-bold text-white">Export your data</h1>
      <p className="mt-1 text-sm leading-snug text-slate-400">
        Everything you have put into ReyGuild is yours. Take a copy whenever you
        want, section by section or all at once. You do not have to ask, and you
        do not have to be leaving.
      </p>

      {!allowed ? (
        <p className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-5 text-sm text-slate-300">
          Only an owner or an administrator can export company data. That is
          enforced in the database, not on this page.
        </p>
      ) : (
        <>
          <a
            href="/api/export?section=everything"
            className="mt-6 block rounded-xl px-4 py-4 text-center text-sm font-bold"
            style={{ background: "#CC9000", color: "#16243F" }}
          >
            Download everything (JSON)
          </a>
          <p className="mt-2 text-center text-xs text-slate-500">
            One file with all of the below in it. Best for a backup or for
            handing to another system.
          </p>

          <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-slate-300">
            Or one section at a time
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            These download as CSV, so they open straight into a spreadsheet.
          </p>

          <div className="mt-4 space-y-2">
            {SECTIONS.map((s) => (
              <a
                key={s.key}
                href={"/api/export?section=" + s.key}
                className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 hover:border-slate-500"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">{s.label}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-slate-400">
                    {s.blurb}
                  </span>
                </span>
                <span className="flex-none text-xs font-bold text-amber-400">CSV</span>
              </a>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-300">
              What is not in here
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              The procedure cards, checklists, SOPs, scripts, the employee
              booklet, the safety procedure and the non-disclosure agreements
              are ReyGuild&rsquo;s, supplied under licence while you subscribe.
              They are not included in an export, including any copy you have
              edited. Anything you wrote yourself comes out with everything else.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Photos and uploaded files are listed with their names and dates,
              not bundled into the download. Ask and we will get you the files
              themselves.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Every export is logged with who ran it and when, so a company can
              answer the question &ldquo;who took the customer list&rdquo; if it
              is ever asked.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
