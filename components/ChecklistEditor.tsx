"use client";

import { useState } from "react";

// EDITING THE CHECKLIST THE CREW SEES WHEN THEY ROLL UP.
//
// Ben's point: not every company wants booties and a facemask. An electrician
// in somebody's living room does; a landscaper does not, and a line that reads
// as nonsense gets ticked without being read - which is worse than no line.
//
// So the ReyGuild list is a starting point. Any company can reword it, drop a
// line, add its own, or put the whole thing back.
//
// Yes/No on every one of those, because this is the list that proves what was
// done on a job, and changing it by accident is not something you notice until
// somebody needs the proof.

export type Row = {
  item_id: string;
  label: string;
  emphasis: boolean;
};

export default function ChecklistEditor({
  phase,
  items,
  heading,
}: {
  phase: "arrival" | "completion";
  items: Row[];
  heading: string;
}) {
  const [rows, setRows] = useState<Row[]>(items);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [emphasis, setEmphasis] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<"" | "save" | "remove" | "reset">("");
  const [pending, setPending] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(body: any, after: () => void) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checklist/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase, ...body }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "That did not save.");
        setBusy(false);
        setConfirm("");
        return;
      }
      after();
      // Reload so the list shows what was stored, not what this form hoped.
      setTimeout(() => window.location.reload(), 600);
    } catch {
      setError("No connection. Nothing was changed.");
    }
    setBusy(false);
    setConfirm("");
  }

  function startEdit(r: Row) {
    setEditing(r.item_id);
    setDraft(r.label);
    setEmphasis(r.emphasis);
    setAdding(false);
    setConfirm("");
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
          {heading}
        </h3>
        <span className="text-xs text-slate-500">{rows.length} lines</span>
      </div>
      <p className="mt-1 text-xs leading-snug text-slate-500">
        What your crew ticks off on every job. Change any of it &mdash; these are
        our suggestions, not your rules.
      </p>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      <ul className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <li key={r.item_id}>
            {editing === r.item_id ? (
              <div className="rounded-lg border-2 border-slate-300 p-3">
                <input
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value); setConfirm(""); }}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={emphasis}
                    onChange={(e) => { setEmphasis(e.target.checked); setConfirm(""); }}
                    className="h-4 w-4"
                  />
                  Show this on the full-screen warning &mdash; for the ones that
                  cost you money if they are skipped
                </label>

                {confirm === "save" ? (
                  <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2.5">
                    <p className="text-xs font-semibold text-slate-900">Save this line?</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" disabled={busy}
                        onClick={() => call({ action: "save", item: r.item_id, label: draft, emphasis }, () => {})}
                        className="flex-1 rounded bg-emerald-700 py-2 text-xs font-bold text-white disabled:opacity-50">
                        {busy ? "Saving..." : "Yes, save"}
                      </button>
                      <button type="button" onClick={() => setConfirm("")}
                        className="flex-1 rounded border border-slate-300 py-2 text-xs font-bold text-slate-700">
                        No
                      </button>
                    </div>
                  </div>
                ) : confirm === "remove" && pending?.item_id === r.item_id ? (
                  <div className="mt-2 rounded-md border border-red-300 bg-red-50 p-2.5">
                    <p className="text-xs font-semibold text-slate-900">
                      Take this line off the checklist?
                    </p>
                    <p className="mt-1 text-[11px] text-slate-600">
                      Jobs already ticked keep their record.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" disabled={busy}
                        onClick={() => call({ action: "remove", item: r.item_id }, () => {})}
                        className="flex-1 rounded bg-red-700 py-2 text-xs font-bold text-white disabled:opacity-50">
                        {busy ? "Working..." : "Yes, remove"}
                      </button>
                      <button type="button" onClick={() => setConfirm("")}
                        className="flex-1 rounded border border-slate-300 py-2 text-xs font-bold text-slate-700">
                        No
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={draft.trim().length < 2}
                      onClick={() => setConfirm("save")}
                      className="flex-1 rounded bg-slate-900 py-2 text-xs font-bold text-white disabled:opacity-40">
                      Save
                    </button>
                    <button type="button"
                      onClick={() => { setPending(r); setConfirm("remove"); }}
                      className="rounded border border-red-300 px-3 py-2 text-xs font-bold text-red-600">
                      Remove
                    </button>
                    <button type="button" onClick={() => { setEditing(null); setConfirm(""); }}
                      className="rounded border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startEdit(r)}
                className={
                  "flex w-full items-start gap-2 rounded-lg border p-3 text-left " +
                  (r.emphasis ? "border-amber-300 bg-amber-50" : "border-slate-200")
                }
              >
                <span className="min-w-0 flex-1 text-sm leading-snug text-slate-800">
                  {r.label}
                  {r.emphasis ? (
                    <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                      warning screen
                    </span>
                  ) : null}
                </span>
                <span className="flex-none text-xs text-slate-400">edit</span>
              </button>
            )}
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="mt-3 rounded-lg border-2 border-slate-300 p-3">
          <input
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setConfirm(""); }}
            placeholder="What should they check?"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={emphasis}
              onChange={(e) => { setEmphasis(e.target.checked); setConfirm(""); }}
              className="h-4 w-4" />
            Show on the full-screen warning
          </label>
          {confirm === "save" ? (
            <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2.5">
              <p className="text-xs font-semibold text-slate-900">Add this line?</p>
              <div className="mt-2 flex gap-2">
                <button type="button" disabled={busy}
                  onClick={() => call({ action: "save", item: "", label: draft, emphasis }, () => {})}
                  className="flex-1 rounded bg-emerald-700 py-2 text-xs font-bold text-white disabled:opacity-50">
                  {busy ? "Adding..." : "Yes, add it"}
                </button>
                <button type="button" onClick={() => setConfirm("")}
                  className="flex-1 rounded border border-slate-300 py-2 text-xs font-bold text-slate-700">
                  No
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <button type="button" disabled={draft.trim().length < 2}
                onClick={() => setConfirm("save")}
                className="flex-1 rounded bg-slate-900 py-2 text-xs font-bold text-white disabled:opacity-40">
                Add
              </button>
              <button type="button" onClick={() => { setAdding(false); setConfirm(""); }}
                className="rounded border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">
                Cancel
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => { setAdding(true); setEditing(null); setDraft(""); setEmphasis(false); }}
            className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm font-semibold text-slate-700"
          >
            Add a line
          </button>
          <button
            type="button"
            onClick={() => setConfirm("reset")}
            className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
          >
            Back to original
          </button>
        </div>
      )}

      {confirm === "reset" ? (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-slate-900">
            Put the whole checklist back to the original?
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Every change you have made to this list is thrown away and the
            ReyGuild version comes back. Jobs already ticked keep their record.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy}
              onClick={() => call({ action: "reset" }, () => {})}
              className="flex-1 rounded-md bg-slate-900 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {busy ? "Working..." : "Yes, put it back"}
            </button>
            <button type="button" onClick={() => setConfirm("")}
              className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm font-bold text-slate-700">
              No, keep mine
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
