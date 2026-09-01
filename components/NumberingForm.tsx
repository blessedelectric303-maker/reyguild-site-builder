"use client";

import { useState } from "react";

// Choosing where the numbering starts.
//
// The confirm exists because this is a one-way door in practice: numbers
// already issued do not move, so setting the counter BACKWARDS would hand out
// a number somebody has already sent to a customer. The form warns about that
// specifically rather than asking "are you sure" about nothing.

type Row = {
  kind: string;
  next_number: number;
  prefix: string;
  configured: boolean;
};

export default function NumberingForm({ rows }: { rows: Row[] }) {
  const [state, setState] = useState<Row[]>(rows);
  const [drafts, setDrafts] = useState<Record<string, { start: string; prefix: string }>>(
    Object.fromEntries(
      rows.map((r) => [r.kind, { start: String(r.next_number), prefix: r.prefix || "" }])
    )
  );
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function save(kind: string) {
    const d = drafts[kind];
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/numbering", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set",
          kind,
          start: Number(d.start),
          prefix: d.prefix,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "That did not save.");
      } else {
        setSaved(kind);
        setState((s) =>
          s.map((r) =>
            r.kind === kind
              ? { ...r, next_number: Number(d.start), prefix: d.prefix, configured: true }
              : r
          )
        );
      }
    } catch {
      setError("No connection. Nothing was changed.");
    }
    setBusy(false);
    setConfirm(null);
  }

  const label = (k: string) => (k === "estimate" ? "Proposals" : "Invoices");

  return (
    <div className="mt-6 space-y-3">
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {state.map((r) => {
        const d = drafts[r.kind] || { start: "", prefix: "" };
        const goingBackwards = Number(d.start) < r.next_number;
        return (
          <div
            key={r.kind}
            className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-white">{label(r.kind)}</span>
              <span className="text-xs text-slate-400">
                {r.configured
                  ? "next: " + (r.prefix || "") + r.next_number
                  : "not set yet"}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block text-[11px] text-slate-400">Prefix</label>
                <input
                  value={d.prefix}
                  onChange={(e) => {
                    setDrafts({ ...drafts, [r.kind]: { ...d, prefix: e.target.value } });
                    setConfirm(null);
                  }}
                  placeholder="INV-"
                  className="mt-1 w-full rounded-md bg-slate-800 border border-slate-600 px-2 py-2 text-sm text-slate-100"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] text-slate-400">
                  Start at this number
                </label>
                <input
                  value={d.start}
                  inputMode="numeric"
                  onChange={(e) => {
                    setDrafts({ ...drafts, [r.kind]: { ...d, start: e.target.value.replace(/[^0-9]/g, "") } });
                    setConfirm(null);
                  }}
                  className="mt-1 w-full rounded-md bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-slate-100"
                />
              </div>
            </div>

            {saved === r.kind ? (
              <p className="mt-2 text-xs font-semibold text-emerald-400">
                Saved. The next {label(r.kind).toLowerCase().slice(0, -1)} will be{" "}
                {(d.prefix || "") + d.start}.
              </p>
            ) : null}

            {confirm === r.kind ? (
              <div className="mt-3 rounded-md border border-amber-700 bg-amber-950/30 p-3">
                <p className="text-sm font-semibold text-amber-200">
                  Start {label(r.kind).toLowerCase()} at {(d.prefix || "") + d.start}?
                </p>
                {goingBackwards && r.configured ? (
                  <p className="mt-1 text-xs leading-snug text-amber-100">
                    That is <strong>lower</strong> than where you are now
                    ({(r.prefix || "") + r.next_number}). Numbers already sent to
                    customers do not move, so this would hand out a number you
                    have used before. Only do it if you know why.
                  </p>
                ) : (
                  <p className="mt-1 text-xs leading-snug text-slate-300">
                    Every one after that follows on automatically.
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => save(r.kind)}
                    className="flex-1 rounded-md bg-emerald-700 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {busy ? "Saving..." : "Yes, set it"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm(null)}
                    className="flex-1 rounded-md border border-slate-600 py-2.5 text-sm font-bold text-slate-200"
                  >
                    No
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={!d.start || Number(d.start) < 1}
                onClick={() => { setConfirm(r.kind); setSaved(null); }}
                className="mt-3 w-full rounded-md py-2.5 text-sm font-bold text-slate-900 disabled:opacity-40"
                style={{ background: "#e0a82e" }}
              >
                {r.configured ? "Change the starting number" : "Set the starting number"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
