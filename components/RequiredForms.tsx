"use client";

import { useRef, useState } from "react";

export type FormRow = {
  slot: string;
  label: string;
  help: string | null;
  action: string;
  source_url: string | null;
  required: boolean;
  sort_order: number;
  uploaded: boolean;
  file_name: string | null;
};

// Download on the left, hand it back on the right.
//
// We link out to the government page rather than serving our own copy of a tax
// form. The day the IRS changes a form, our copy is the wrong one and somebody
// files it - the link is always current, a PDF in our bucket never is.

function Card({ row, onDone }: { row: FormRow; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(row.file_name);
  const [licType, setLicType] = useState("");
  const [licNum, setLicNum] = useState("");
  const [expires, setExpires] = useState("");

  const isLicence = row.slot === "license";
  const canDownload = row.action === "download" || row.action === "both";
  const canUpload = row.action === "upload" || row.action === "both";

  async function send(file: File) {
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.append("slot", row.slot);
    body.append("file", file);
    if (isLicence) {
      body.append("license_type", licType);
      body.append("license_number", licNum);
      body.append("expires_on", expires);
    }
    try {
      const res = await fetch("/api/documents/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "That did not upload.");
      } else {
        setName(json.file_name || file.name);
        onDone();
      }
    } catch {
      setError("No connection. Nothing was uploaded.");
    }
    setBusy(false);
  }

  return (
    <div
      className={
        "rounded-xl border bg-white p-4 " +
        (row.required && !name ? "border-red-200" : "border-slate-200")
      }
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900">{row.label}</div>
          {row.help ? (
            <p className="mt-1 text-xs leading-snug text-slate-500">{row.help}</p>
          ) : null}
        </div>
        <span
          className={
            "flex-none rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide " +
            (name
              ? "bg-emerald-100 text-emerald-800"
              : row.required
              ? "bg-red-100 text-red-700"
              : "bg-slate-100 text-slate-500")
          }
        >
          {name ? "Done" : row.required ? "Needed" : "Optional"}
        </span>
      </div>

      {isLicence && !name ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <select
            value={licType}
            onChange={(e) => setLicType(e.target.value)}
            className="col-span-2 rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900"
          >
            <option value="">What do you hold?</option>
            <option value="apprentice">Registered Apprentice</option>
            <option value="residential_wireman">Residential Wireman</option>
            <option value="journeyman">Journeyman</option>
            <option value="master">Master Electrician</option>
            <option value="other">Something else</option>
          </select>
          <input
            type="text"
            value={licNum}
            onChange={(e) => setLicNum(e.target.value)}
            placeholder="Licence number"
            className="rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900"
          />
          <input
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900"
          />
        </div>
      ) : null}

      {name ? (
        <p className="mt-3 text-xs text-emerald-700">Uploaded: {name}</p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {canDownload && row.source_url ? (
          <a
            href={row.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700"
          >
            Download the form
          </a>
        ) : null}
        {canUpload ? (
          <>
            <input
              ref={input}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (f) send(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current && input.current.click()}
              className="rounded-md bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {busy ? "Uploading..." : name ? "Replace it" : "Take a photo or upload"}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function RequiredForms({ rows }: { rows: FormRow[] }) {
  const [tick, setTick] = useState(0);
  if (!rows.length) return null;
  const outstanding = rows.filter((r) => r.required && !r.uploaded).length;

  return (
    <section className="mt-6" key={tick}>
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
        Forms to download and hand in
      </h2>
      <p className="mt-1 text-xs leading-snug text-slate-500">
        Tap Download to get the blank form from the government site, fill it in
        on your phone or print it, then upload it back here. A clear photo of
        each page is fine.
      </p>
      {outstanding > 0 ? (
        <p className="mt-1 text-xs font-semibold text-red-600">
          {outstanding} still needed
        </p>
      ) : null}
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <Card key={r.slot} row={r} onDone={() => setTick((t) => t + 1)} />
        ))}
      </div>
      <p className="mt-3 rounded-lg bg-slate-100 p-3 text-[11px] leading-snug text-slate-500">
        Your I-9 cannot be finished on a phone. Federal law says the employer
        half has to be done with your original identification documents in front
        of them, so bring those to the office. Everything else on this page can
        be done from the truck.
      </p>
    </section>
  );
}
