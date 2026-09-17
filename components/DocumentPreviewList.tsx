import Link from "next/link";

export type PreviewRow = {
  doc_key: string;
  title: string;
  kind: string;
  summary: string | null;
  requires_signature: boolean;
  can_sign: boolean;
  signed: boolean;
};

// THE DOCUMENTS THIS PERSON DOES NOT HAVE TO SIGN.
//
// An owner signs the four ReyGuild documents. The conduct policy, the safety
// rules, drug and alcohol, non-solicit and the rest are the company's own
// paperwork, carrying the company's name, and they are signed by the people
// the owner invites. The owner should still be able to read every word of
// them - they are handing them to their staff - so they are listed here to
// open, with no signing box and no effect on the progress bar.

export default function DocumentPreviewList({
  rows,
  signable,
}: {
  rows: PreviewRow[];
  signable: { doc_key: string }[];
}) {
  const mine = new Set((signable || []).map((d) => d.doc_key));
  const list = (rows || []).filter((r) => !mine.has(r.doc_key));
  if (list.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
        Also in the app &ndash; your company&rsquo;s documents
      </h2>
      <p className="mt-1 text-sm leading-snug text-slate-500">
        Yours to read now and to hand out later. These carry your company name,
        and the people you invite sign them - you do not. They stay in the app
        under Settings.
      </p>
      <div className="mt-3 space-y-2">
        {list.map((r) => (
          <Link
            key={r.doc_key}
            href={"/onboarding/" + r.doc_key}
            className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">{r.title}</span>
              {r.summary ? (
                <span className="mt-0.5 block text-sm text-slate-500">{r.summary}</span>
              ) : null}
              <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {r.requires_signature ? "Your team signs this" : "Reading only"}
              </span>
            </span>
            <span className="shrink-0 text-slate-400">&rarr;</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
