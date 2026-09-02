"use client";

import { useState } from "react";

// EDITING A DOCUMENT.
//
// The booklet parts, the safety procedures, a company's own NDA. At the
// bottom of the document, past the words, so somebody reading it never trips
// over an editor they did not want.
//
// Two things this warns about that the procedure editor does not need to:
//
//   Saving bumps the version, which UN-SIGNS everybody for that page. That is
//   correct - nobody is bound by wording they never read - but it means a
//   crew of twelve has twelve signatures to redo, and an owner should know
//   that before they fix a typo.
//
//   Back to original throws away signatures against their version too. Those
//   people signed words that no longer exist, so a record of having signed
//   should not survive to look like agreement to the ReyGuild text.

export default function DocumentEditor({
  docKey,
  title,
  summary,
  body,
  isTemplate,
  requiresSignature,
  canEdit,
}: {
  docKey: string;
  title: string;
  summary: string | null;
  body: string;
  isTemplate: boolean;
  requiresSignature: boolean;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [t, setT] = useState(title || "");
  const [sm, setSm] = useState(summary || "");
  const [b, setB] = useState(body || "");
  const [confirm, setConfirm] = useState<"" | "save" | "revert">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // The four ReyGuild documents are the agreement between this company and
  // us. Not editable, and the button is not drawn rather than drawn and
  // refused.
  if (!canEdit || docKey.startsWith("rg-")) return null;

  async function send(action: "save" | "revert") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, key: docKey, title: t, summary: sm, body: b }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "That did not save.");
        setBusy(false);
        setConfirm("");
        return;
      }
      setDone(
        action === "revert"
          ? "Back to the ReyGuild original. Your version is gone."
          : "Saved. Your crew reads this version from now on."
      );
      setBusy(false);
      setConfirm("");
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
        className="mt-6 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
      >
        Edit this document
      </button>
    );
  }

  return (
    <div className="mt-6 rounded-xl border-2 border-slate-300 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
          Edit this document
        </h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 underline">
          Close
        </button>
      </div>

      {isTemplate ? (
        <p className="mt-2 rounded-lg bg-sky-50 p-3 text-xs leading-snug text-sky-900">
          This is the ReyGuild wording. Saving makes <strong>your own copy</strong>{" "}
          &mdash; ours is left alone and you can go back to it at any time.
        </p>
      ) : null}

      {requiresSignature ? (
        <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs leading-snug text-amber-900">
          <strong>People have to sign this one again.</strong> Changing the
          words un-signs everybody for this page, because nobody is bound by
          wording they never read. Worth doing all your edits in one sitting
          rather than fixing a typo on a Tuesday and another on a Thursday.
        </p>
      ) : null}

      {done ? (
        <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{done}</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <label className="mt-4 block text-xs font-semibold text-slate-600">Title</label>
      <input
        value={t}
        onChange={(e) => { setT(e.target.value); setConfirm(""); }}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-base text-slate-900"
      />

      <label className="mt-3 block text-xs font-semibold text-slate-600">
        One line, shown under the title on the list
      </label>
      <input
        value={sm}
        onChange={(e) => { setSm(e.target.value); setConfirm(""); }}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-base text-slate-900"
      />

      <label className="mt-3 block text-xs font-semibold text-slate-600">
        The document itself
      </label>
      <textarea
        rows={18}
        value={b}
        onChange={(e) => { setB(e.target.value); setConfirm(""); }}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 font-mono text-xs leading-relaxed text-slate-900"
      />
      <p className="mt-1 text-[11px] leading-snug text-slate-500">
        <code>## </code> starts a heading. <code>- </code> starts a bullet.{" "}
        <code>**bold**</code> for bold. A blank line starts a new paragraph.
        Leave <code>[COMPANY NAME]</code> alone and it fills itself in.
      </p>

      {confirm === "save" ? (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-slate-900">Save these changes?</p>
          <p className="mt-1 text-xs text-slate-600">
            {requiresSignature
              ? "Everybody will be asked to sign this page again the next time they open the app."
              : "Your crew reads this version from now on."}
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
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-slate-900">
            Put this document back to the original?
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Your version is thrown away and the ReyGuild wording comes back.
            {requiresSignature
              ? " Signatures against your version go with it - those people signed words that will no longer exist."
              : ""}
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy} onClick={() => send("revert")}
              className="flex-1 rounded-md bg-slate-900 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {busy ? "Working..." : "Yes, put it back"}
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirm("")}
              className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm font-bold text-slate-700">
              No, keep mine
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={t.trim().length < 2 || b.trim().length < 10}
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
