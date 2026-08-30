import Link from "next/link";

export type DocRow = {
  id: string;
  doc_key: string;
  title: string;
  kind: string;
  summary: string | null;
  sort_order: number;
  version: number;
  requires_signature: boolean;
  is_master: boolean;
  signed: boolean;
  signed_at: string | null;
  is_platform: boolean;
};

// Every document gets its OWN link. Ben asked for that specifically - one row
// per subject, each one openable on its own, rather than one long scroll that
// nobody reads to the bottom of.

function Row({ d, basePath }: { d: DocRow; basePath: string }) {
  const state = !d.requires_signature
    ? { label: "Read", cls: "bg-slate-100 text-slate-600" }
    : d.signed
    ? { label: "Signed", cls: "bg-emerald-100 text-emerald-800" }
    : { label: "Not signed", cls: "bg-red-100 text-red-700" };

  return (
    <Link
      href={basePath + "/" + d.doc_key}
      className={
        "flex items-center gap-3 rounded-xl border bg-white p-4 hover:border-slate-300 " +
        (d.requires_signature && !d.signed ? "border-red-200" : "border-slate-200")
      }
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900">{d.title}</span>
        {d.summary ? (
          <span className="mt-0.5 block text-xs leading-snug text-slate-500">{d.summary}</span>
        ) : null}
        <span
          className={"mt-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide " + state.cls}
        >
          {state.label}
        </span>
        {d.signed && d.signed_at ? (
          <span className="ml-2 text-[10px] text-slate-400">
            {new Date(d.signed_at).toLocaleDateString()}
          </span>
        ) : null}
      </span>
      <span className="flex-none text-slate-400">&rarr;</span>
    </Link>
  );
}

export default function DocumentList({
  docs,
  basePath,
  heading,
  blurb,
  filter,
}: {
  docs: DocRow[];
  basePath: string;
  heading: string;
  blurb?: string;
  filter: (d: DocRow) => boolean;
}) {
  const rows = docs.filter(filter);
  if (!rows.length) return null;

  const need = rows.filter((d) => d.requires_signature && !d.signed).length;

  return (
    <section className="mt-6">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">{heading}</h2>
      {blurb ? <p className="mt-1 text-xs leading-snug text-slate-500">{blurb}</p> : null}
      {need > 0 ? (
        <p className="mt-1 text-xs font-semibold text-red-600">
          {need} still to sign
        </p>
      ) : null}
      <div className="mt-3 space-y-2">
        {rows.map((d) => (
          <Row key={d.id} d={d} basePath={basePath} />
        ))}
      </div>
    </section>
  );
}
