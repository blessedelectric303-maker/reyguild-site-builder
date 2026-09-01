import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ReyGuild - Subscription",
  description: "What you pay, and why.",
};

// WHAT YOU PAY, AND WHY.
//
// The number comes from suite.billable_seats(), which is the single
// definition of a seat in the whole system - the same function billing will
// read. A page that works the price out for itself would eventually disagree
// with the invoice, and the customer would be right and we would be wrong.
//
// $99.99 for up to five people, $5 for each person after that. Shown as
// arithmetic, not as a total, because a price somebody can check themselves
// is a price they trust.

type Seats = {
  seats: number;
  included: number;
  extra_seats: number;
  monthly: number;
  next_seat_costs: number;
};

function money(n: any): string {
  const v = Number(n || 0);
  return "$" + v.toFixed(2);
}

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/subscription");

  let role = "";
  let companyName = "";
  let s: Seats | null = null;
  let people: { email: string; role: string }[] = [];
  let problem: string | null = null;

  try {
    const { data: mem } = await supabase
      .schema("suite")
      .from("memberships")
      .select("role,company_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    role = ((mem as any) || {}).role || "";
    const cid = ((mem as any) || {}).company_id;

    if (cid) {
      const { data: co } = await supabase
        .schema("suite")
        .from("companies")
        .select("name")
        .eq("id", cid)
        .maybeSingle();
      companyName = ((co as any) || {}).name || "";
    }

    const { data: bs, error: bsErr } = await supabase
      .schema("suite")
      .rpc("billable_seats");
    if (bsErr) problem = bsErr.message;
    s = Array.isArray(bs) && bs.length ? (bs[0] as Seats) : null;

    const { data: roster } = await supabase
      .schema("suite")
      .rpc("company_document_status");
    people = (roster || []).map((r: any) => ({ email: r.email, role: r.role }));
  } catch (e: any) {
    problem = e?.message || "Could not load your subscription.";
  }

  const isOffice = role === "owner" || role === "admin";

  if (!isOffice) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <BackLink className="text-sm text-slate-400 underline hover:text-slate-200" />
        <h1 className="mt-3 text-xl font-bold text-white">Subscription</h1>
        <p className="mt-4 rounded-xl border border-slate-700 bg-slate-900/60 p-5 text-sm text-slate-300">
          Only an owner or an administrator can see the billing for this
          company. Nothing you do here affects your own pay or hours.
        </p>
      </main>
    );
  }

  const seats = s ? s.seats : 0;
  const extra = s ? s.extra_seats : 0;
  const monthly = s ? s.monthly : 99.99;
  const nextCosts = s ? s.next_seat_costs : 0;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="text-sm text-slate-400 underline">
        &larr; Command center
      </Link>

      <h1 className="mt-3 text-xl font-bold text-white">Subscription</h1>
      <p className="mt-1 text-sm text-slate-400">
        {companyName ? companyName + " \u00b7 " : ""}what you pay, and why.
      </p>

      {problem ? (
        <p className="mt-4 rounded-xl border border-amber-700 bg-amber-950/30 p-4 text-sm text-amber-200">
          Could not read your seat count: {problem}
        </p>
      ) : null}

      {/* The number, and the arithmetic behind it. */}
      <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-5">
        <div className="text-xs uppercase tracking-wide text-slate-400">
          Your plan right now
        </div>
        <div className="mt-1 text-4xl font-bold text-white">
          {money(monthly)}
          <span className="ml-1 text-base font-normal text-slate-400">/ month</span>
        </div>

        <div className="mt-5 space-y-1.5 text-sm text-slate-300">
          <div className="flex justify-between">
            <span>Base, up to 5 people</span>
            <span className="tabular-nums">{money(99.99)}</span>
          </div>
          <div className="flex justify-between">
            <span>
              {extra > 0
                ? extra + (extra === 1 ? " extra person" : " extra people") + " at $5.00"
                : "No extra people yet"}
            </span>
            <span className="tabular-nums">{money(extra * 5)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-slate-700 pt-2 font-semibold text-white">
            <span>Total</span>
            <span className="tabular-nums">{money(monthly)}</span>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-400">
          You have <strong className="text-slate-200">{seats}</strong>{" "}
          {seats === 1 ? "person" : "people"} with a login, the owner included.
          {nextCosts === 0
            ? " Your next hire costs you nothing - you are still inside the first five."
            : " Your next hire adds " + money(nextCosts) + " a month."}
        </p>
      </div>

      {/* Who is being counted. A seat count with no names behind it is a
          number somebody has to take on trust. */}
      {people.length > 0 ? (
        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            Who is counted
          </div>
          <ul className="mt-2 space-y-1">
            {people.map((p) => (
              <li key={p.email} className="flex justify-between text-xs text-slate-400">
                <span className="truncate">{p.email}</span>
                <span className="ml-3 flex-none">{p.role}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Remove somebody under Army / Employees and your bill drops from the
            next billing date.
          </p>
        </div>
      ) : null}

      <div className="mt-8 space-y-2">
        <Link
          href="/subscription/pause"
          className="block rounded-xl border border-slate-700 bg-slate-900/60 p-4 hover:border-slate-500"
        >
          <span className="block text-sm font-semibold text-white">
            Pause my subscription
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-slate-400">
            Stop the billing and keep everything. Your jobs, price list,
            customers and signed paperwork stay exactly where they are, and the
            app goes read-only until you come back.
          </span>
        </Link>

        <Link
          href="/subscription/cancel"
          className="block rounded-xl border border-red-900 bg-red-950/20 p-4 hover:border-red-700"
        >
          <span className="block text-sm font-semibold text-red-300">
            Cancel my subscription
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-slate-400">
            Ends at the end of the period you have already paid for. Export
            your data first &mdash; you can take all of it.
          </span>
        </Link>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
        Whatever you choose, your data stays yours.{" "}
        <Link href="/export" className="underline">
          Export everything
        </Link>{" "}
        at any time, without asking anybody.
      </p>
    </main>
  );
}
