"use client";

import { useState } from "react";

// Pause and cancel share one component because they are the same shape: say
// plainly what happens, ask once why, confirm, record it.
//
// The reason box is optional and it is the most valuable field in the table.
// People will tell you why they are leaving if you make it easy and do not
// argue with them on the way out.

export default function SubscriptionAction({
  kind,
  monthly,
}: {
  kind: "pause" | "cancel";
  monthly: string;
}) {
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/subscription/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: kind, reason }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "That did not save. Try again.");
        setBusy(false);
        setConfirming(false);
        return;
      }
      setDone(true);
    } catch {
      setError("No connection. Nothing was sent.");
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="mt-6 rounded-xl border border-emerald-700 bg-emerald-950/30 p-5">
        <div className="text-sm font-semibold text-emerald-300">
          {kind === "pause" ? "Pause requested" : "Cancellation requested"}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          It is recorded with today&rsquo;s date. Billing is not connected yet,
          so a person will action it rather than a machine &mdash; you will hear
          back. Nothing about your account changes in the meantime, and nothing
          is deleted.
        </p>
        <a href="/export" className="mt-3 inline-block text-sm text-emerald-300 underline">
          Export your data
        </a>
      </div>
    );
  }

  const isCancel = kind === "cancel";

  return (
    <div className="mt-6">
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
        {isCancel ? "Why are you leaving?" : "Anything we should know?"}
      </label>
      <p className="mt-1 text-xs text-slate-500">
        Optional, and genuinely useful. Nobody will call you to argue about it.
      </p>
      <textarea
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={
          isCancel
            ? "Too expensive, missing something we need, going elsewhere, quiet season..."
            : "Slow season, taking a few months off..."
        }
        className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
      />

      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={
            "mt-3 w-full rounded-md py-3 text-sm font-bold " +
            (isCancel
              ? "border border-red-700 bg-red-950/30 text-red-300"
              : "border border-slate-600 bg-slate-800 text-slate-100")
          }
        >
          {isCancel ? "Cancel my subscription" : "Pause my subscription"}
        </button>
      ) : (
        <div className="mt-3 rounded-md border border-amber-700 bg-amber-950/30 p-4">
          <p className="text-sm font-semibold text-amber-200">
            {isCancel
              ? "Cancel " + monthly + " a month, at the end of the paid period?"
              : "Pause " + monthly + " a month?"}
          </p>
          <p className="mt-1 text-xs leading-snug text-slate-400">
            {isCancel
              ? "Your data stays available to export for 30 days afterwards."
              : "Everything stays exactly where it is. Come back whenever."}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={send}
              className="flex-1 rounded-md bg-slate-100 py-2.5 text-sm font-bold text-slate-900 disabled:opacity-50"
            >
              {busy ? "Sending..." : "Yes, go ahead"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-md border border-slate-600 py-2.5 text-sm font-bold text-slate-200"
            >
              No, keep it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
