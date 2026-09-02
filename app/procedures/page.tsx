import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import BackLink from "@/components/BackLink";
import { TECH_CARDS, skinFor, type TextPart } from "@/utils/techProcedures";

export const dynamic = "force-dynamic";
export const metadata = { title: "ReyGuild - Procedures" };

// THE PROCEDURE CARDS, FOR THE OFFICE.
//
// The crew has had these on their phones since day one. The office had no way
// to read them at all - which is the wrong way round, because the office is
// who answers when a customer asks what happens next, and who edits the card
// when the answer changes.
//
// Same colours, same order, same words as the truck cards. Two apps showing
// a different version of the same procedure is how a customer gets told two
// different things on the same day.

function strokeFor(checker?: boolean) {
  return checker
    ? ({ WebkitTextStroke: "3px #ffffff", paintOrder: "stroke fill" } as const)
    : undefined;
}

function paint(parts: TextPart[]) {
  return parts.map((p, i) => (
    <span key={i} style={p.c ? { color: p.c } : undefined}>
      {p.t}
    </span>
  ));
}

// The written guides, loaded by SQL 36. Listed here rather than fetched so
// the page still renders on a company that has not run that file - a missing
// guide gives an empty page, not a broken one.
const GUIDES = [
  { key: "guide-proposal", title: "How to build a proposal",
    blurb: "Pricing a job from the price list, what the customer sees, and what they never do." },
  { key: "guide-invoice", title: "How to build an invoice",
    blurb: "Turning finished work into a bill, and what has to be on it." },
  { key: "guide-convert", title: "Turning an accepted proposal into an invoice",
    blurb: "What carries across, what changes, and what to check before it goes out." },
  { key: "guide-pricelist-have", title: "Building your price list from what you already have",
    blurb: "If you have prices written down somewhere, start here." },
  { key: "guide-pricelist-none", title: "Building a price list from scratch",
    blurb: "If you have been quoting from your head, start here." },
];

export default async function ProceduresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/procedures");

  // Only the office can edit, and the editor sits on each card - but the
  // cards themselves are worth reading for anybody, so nobody is turned away
  // from this page.
  let canEdit = false;
  try {
    const { data: mem } = await supabase
      .schema("suite")
      .from("memberships")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const r = ((mem as any) || {}).role || "";
    canEdit = r === "owner" || r === "admin";
  } catch (e) {
    canEdit = false;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <BackLink className="text-sm text-slate-500 underline hover:text-slate-800" />
      <h1 className="mt-3 border-l-4 pl-3 text-lg font-semibold text-slate-900"
          style={{ borderColor: "#16243F" }}>
        Field procedures
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        {canEdit
          ? "The cards your crew carries. Open one to read the whole procedure, then edit it if your company does it differently - your version is what the crew sees from then on, and you can put ours back at any time."
          : "The cards your crew carries. Open one to read the whole procedure."}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
        {TECH_CARDS.map((c) => {
          const skin = skinFor(c);
          return (
            <Link
              key={c.key}
              href={"/procedures/" + c.key}
              className={
                "flex min-h-[92px] flex-col justify-between rounded-xl p-3 shadow-sm hover:brightness-110" +
                (c.key === "tech_clockin" ? " col-span-2" : "")
              }
              style={
                c.checker
                  ? {
                      backgroundColor: "#ffffff",
                      backgroundImage:
                        "linear-gradient(45deg,#000 25%,transparent 25%,transparent 75%,#000 75%)," +
                        "linear-gradient(45deg,#000 25%,transparent 25%,transparent 75%,#000 75%)",
                      backgroundSize: "32px 32px",
                      backgroundPosition: "0 0, 16px 16px",
                      color: "#000000",
                    }
                  : { background: skin.bg, color: skin.text }
              }
            >
              <span
                className="text-sm font-extrabold uppercase tracking-wide"
                style={strokeFor(c.checker)}
              >
                {c.labelParts ? paint(c.labelParts) : c.label}
              </span>
              <span className="text-[11px] leading-snug" style={strokeFor(c.checker)}>
                {c.blurbParts ? paint(c.blurbParts) : <span className="opacity-90">{c.blurb}</span>}
              </span>
            </Link>
          );
        })}
      </div>

      <p className="mt-4 max-w-2xl text-xs leading-relaxed text-slate-500">
        Every card also has the full written procedure behind it &mdash; around a
        thousand words each, worth reading once away from a job. The link sits
        at the bottom of the card&rsquo;s one-page summary.
      </p>

      {/* The second set. Different question, so a separate block rather than
          more tiles in the same grid. */}
      <h2 className="mt-8 border-l-4 pl-3 text-base font-semibold text-slate-900"
          style={{ borderColor: "#0F6E56" }}>
        Quoting and closing out
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        How a job gets priced, and how it gets turned into an invoice once the
        work is done.
      </p>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {GUIDES.map((g) => (
          <Link
            key={g.key}
            href={"/guide/" + g.key}
            className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-400"
          >
            <span className="block text-sm font-semibold text-slate-900">{g.title}</span>
            <span className="mt-0.5 block text-xs leading-snug text-slate-500">{g.blurb}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
