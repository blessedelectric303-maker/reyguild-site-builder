import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
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

export default async function AdminProceduresPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Procedures</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        The cards your crew carries. Open one to read the whole procedure, and
        edit it if your company does it differently &mdash; your version
        replaces ours for everybody, and you can put ours back at any time.
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

      <p className="mt-6 max-w-2xl text-xs leading-relaxed text-slate-500">
        Every card also has a full written procedure behind it &mdash; roughly a
        thousand words each, worth reading once away from a job. The link is at
        the bottom of the card&rsquo;s one-page summary.
      </p>
    </div>
  );
}
