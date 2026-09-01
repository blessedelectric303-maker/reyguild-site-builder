import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "ReyGuild - Help" };

// The help pages, listed in the order somebody actually needs them: set the
// company up, understand how a job runs, understand the roles, put yourself
// on the roster, then change anything you do not like.
//
// They are documents like everything else, so they read through the same
// screen as the procedures and fill in the company's own name.

type Doc = {
  doc_key: string;
  title: string;
  summary: string | null;
  kind: string;
  sort_order: number;
};

export default async function HelpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/help");

  let help: Doc[] = [];
  let guides: Doc[] = [];
  try {
    const { data } = await supabase.schema("suite").rpc("my_documents");
    const all = (data || []) as Doc[];
    help = all.filter((d) => d.kind === "help").sort((a, b) => a.sort_order - b.sort_order);
    guides = all.filter((d) => d.kind === "guide").sort((a, b) => a.sort_order - b.sort_order);
  } catch (e) {
    help = [];
    guides = [];
  }

  const card = (d: Doc) => (
    <Link
      key={d.doc_key}
      href={"/guide/" + d.doc_key}
      className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 hover:border-slate-500"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">{d.title}</span>
        {d.summary ? (
          <span className="mt-0.5 block text-xs leading-snug text-slate-400">{d.summary}</span>
        ) : null}
      </span>
      <span className="flex-none text-slate-500">&rarr;</span>
    </Link>
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <BackLink />

      <h1 className="mt-3 text-xl font-bold text-white">Help</h1>
      <p className="mt-1 text-sm leading-snug text-slate-400">
        Short pages, written to be read once. Start at the top if the app is
        new to you.
      </p>

      {help.length === 0 && guides.length === 0 ? (
        <p className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-5 text-sm text-slate-300">
          The help pages have not been loaded on this account yet. Everything
          else in the app still works.
        </p>
      ) : null}

      {help.length > 0 ? (
        <div className="mt-6 space-y-2">{help.map(card)}</div>
      ) : null}

      {guides.length > 0 ? (
        <>
          <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-slate-300">
            How to do the work
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Proposals, invoices, and building a price list.
          </p>
          <div className="mt-3 space-y-2">{guides.map(card)}</div>
        </>
      ) : null}

      <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          Still stuck
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          Email <span className="text-slate-200">support@reyguild.com</span>.
          Tell us what you were trying to do and what happened instead - those
          two things together get a real answer far faster than either on its
          own.
        </p>
      </div>
    </main>
  );
}
