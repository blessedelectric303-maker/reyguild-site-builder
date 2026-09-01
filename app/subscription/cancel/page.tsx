import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import SubscriptionAction from "@/components/SubscriptionAction";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "ReyGuild - Cancel subscription" };

export default async function CancelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/subscription/cancel");

  let monthly = "$99.99";
  try {
    const { data } = await supabase.schema("suite").rpc("billable_seats");
    const row: any = Array.isArray(data) && data.length ? data[0] : null;
    if (row) monthly = "$" + Number(row.monthly).toFixed(2);
  } catch (e) {
    // Fall back to the base price.
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <BackLink className="text-sm text-slate-400 underline hover:text-slate-200" />

      <h1 className="mt-3 text-xl font-bold text-white">Cancel your subscription</h1>
      <p className="mt-1 text-sm text-slate-400">
        No hoops. Here is exactly what happens.
      </p>

      <div className="mt-5 rounded-xl border border-slate-700 bg-slate-900/60 p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          What happens
        </div>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">
          <li>&bull; Billing ends at the end of the period you have already paid for. You keep the app until then.</li>
          <li>&bull; After that the account goes <strong className="text-white">read-only for 30 days</strong>, not dark. You can still sign in and export.</li>
          <li>&bull; <strong className="text-white">Take everything.</strong> Customers, price list, proposals, invoices, timesheets, signed paperwork. It is yours and it always was.</li>
          <li>&bull; The procedure cards, checklists, SOPs, the employee booklet and the safety documents are ReyGuild&rsquo;s and stay with us &mdash; including copies you edited.</li>
          <li>&bull; Come back later and your data is still here if it is inside those 30 days.</li>
        </ul>
      </div>

      <div className="mt-4 rounded-xl border border-amber-800 bg-amber-950/20 p-4">
        <div className="text-sm font-semibold text-amber-200">Export before you go</div>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          It takes about a minute and it means nothing depends on a deadline
          you have to remember.
        </p>
        <Link
          href="/export"
          className="mt-3 inline-block rounded-md px-4 py-2 text-sm font-bold"
          style={{ background: "#e0a82e", color: "#16243F" }}
        >
          Export my data
        </Link>
      </div>

      <SubscriptionAction kind="cancel" monthly={monthly} />

      <p className="mt-6 text-center text-xs text-slate-500">
        Just need a break?{" "}
        <Link href="/subscription/pause" className="underline">
          Pause instead
        </Link>{" "}
        &mdash; nothing is deleted and you can come back.
      </p>
    </main>
  );
}
