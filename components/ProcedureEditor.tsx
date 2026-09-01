"use client";

import { useState } from "react";

// EDITING A PROCEDURE, FROM INSIDE IT.
//
// Ben's original note: "Edit button INSIDE a procedure, not on the list."
// That is the right instinct - the list is where you choose what to read, and
// an edit button there is one mis-tap away from changing a card you only
// meant to open.
//
// Yes/No on edit, add and delete, all three, as asked.
//
// What this never does is change the ReyGuild template. Pressing Edit clones
// it into the company first, so from the first keystroke they are typing into
// their own copy. Every other company still sees the original.

export default function ProcedureEditor({
  color,
  title,
  purpose,
  onePager,
  isTemplate,
  canEdit,
}: {
  color: string;
  title: string;
  purpose: string | null;
  onePager: string | null;
  // True while they are still reading ReyGuild's copy.
  isTemplate: boolean;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [t, setT] = useState(title || "");
  const [p, setP] = useState(purpose || "");
  const [o, setO] = useState(onePager || "");
  const [confirm, setConfirm] = useState<"" | "save" | "revert">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (!canEdit) return null;

  async function send(action: "save" | "delete") {
    // The API still calls it delete; the BUTTON says what it does.
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/procedures/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, color, title: t, purpose: p, onePager: o }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "That did not save.");
        setBusy(false);
        setConfirm("");
        return;
      }
      setDone(
        action === "delete"
          ? "Back to the original ReyGuild card. Your changes are gone."
          : "Saved. Your crew sees this version from now on."
      );
      setBusy(false);
      setConfirm("");
      // Reload so the page shows what was actually stored, not what this
      // form thinks was stored.
      setTimeout(() => window.location.reload(), 900);
    } catch {
      setError("No connection. Nothing was saved.");
      setBusy(false);
      setConfirm("");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
      >
        Edit this procedure
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-xl border-2 border-slate-300 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
          Edit this procedure
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-slate-500 underline"
        >
          Close
        </button>
      </div>

      {isTemplate ? (
        <p className="mt-2 rounded-lg bg-sky-50 p-3 text-xs leading-snug text-sky-900">
          This is the ReyGuild card. Saving makes <strong>your own copy</strong>{" "}
          of it &mdash; the original is left alone, and your crew sees yours
          from then on. You can go back to the original at any time.
        </p>
      ) : null}

      {done ? (
        <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {done}
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <label className="mt-4 block text-xs font-semibold text-slate-600">Title</label>
      <input
        value={t}
        onChange={(e) => { setT(e.target.value); setConfirm(""); }}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-base text-slate-900"
      />

      <label className="mt-3 block text-xs font-semibold text-slate-600">
        Purpose &mdash; one line, what this card is for
      </label>
      <input
        value={p}
        onChange={(e) => { setP(e.target.value); setConfirm(""); }}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-base text-slate-900"
      />

      <label className="mt-3 block text-xs font-semibold text-slate-600">
        The one page &mdash; what a tech reads on the job
      </label>
      <textarea
        rows={10}
        value={o}
        onChange={(e) => { setO(e.target.value); setConfirm(""); }}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm leading-relaxed text-slate-900"
      />

      {confirm === "save" ? (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-slate-900">
            Save these changes?
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Everybody on your crew sees this version the next time they open the
            card.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy} onClick={() => send("save")}
              className="flex-1 rounded-md bg-emerald-700 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {busy ? "Saving..." : "Yes, save it"}
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirm("")}
              className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm font-bold text-slate-700">
              No, go back
            </button>
          </div>
        </div>
      ) : confirm === "revert" ? (
        <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3">
          <p className="text-sm font-semibold text-slate-900">
            {isTemplate
              ? "You are already on the original."
              : "Put this card back to the original?"}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {isTemplate
              ? "There are no changes of yours to undo."
              : "Your version is thrown away and the ReyGuild card comes back. Nobody is left with a blank button."}
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy || isTemplate} onClick={() => send("delete")}
              className="flex-1 rounded-md bg-red-700 py-2.5 text-sm font-bold text-white disabled:opacity-40">
              {busy ? "Working..." : "Yes, put it back"}
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirm("")}
              className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm font-bold text-slate-700">
              No, keep it
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={t.trim().length < 2}
            onClick={() => setConfirm("save")}
            className="flex-1 rounded-md bg-slate-900 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            Save changes
          </button>
          {!isTemplate ? (
            <button
              type="button"
              onClick={() => setConfirm("revert")}
              className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700"
            >
              Back to original
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
