import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import SubscriptionAction from "@/components/SubscriptionAction";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "ReyGuild - Pause subscription" };

export default async function PausePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/subscription/pause");

  let monthly = "$99.99";
  try {
    const { data } = await supabase.schema("suite").rpc("billable_seats");
    const row: any = Array.isArray(data) && data.length ? data[0] : null;
    if (row) monthly = "$" + Number(row.monthly).toFixed(2);
  } catch (e) {
    // Show the base price rather than an error. The number is context here,
    // not the point of the page.
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <BackLink className="text-sm text-slate-400 underline hover:text-slate-200" />

      <h1 className="mt-3 text-xl font-bold text-white">Pause your subscription</h1>
      <p className="mt-1 text-sm text-slate-400">
        For a quiet season, or a few months off.
      </p>

      <div className="mt-5 rounded-xl border border-slate-700 bg-slate-900/60 p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          What happens
        </div>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">
          <li>&bull; Billing stops at the end of the period you have paid for.</li>
          <li>&bull; <strong className="text-white">Nothing is deleted.</strong> Your jobs, hours, customers, price list, proposals, invoices and every signed document stay exactly where they are.</li>
          <li>&bull; The app goes read-only. Everybody can still open it and read, nobody can add new work.</li>
          <li>&bull; You can export everything at any time, paused or not.</li>
          <li>&bull; Come back whenever. Nothing to set up again.</li>
        </ul>
      </div>

      <SubscriptionAction kind="pause" monthly={monthly} />

      <p className="mt-6 text-center text-xs text-slate-500">
        Rather cancel outright?{" "}
        <Link href="/subscription/cancel" className="underline">
          Cancel instead
        </Link>
      </p>
    </main>
  );
}
