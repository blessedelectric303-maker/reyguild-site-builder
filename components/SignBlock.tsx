"use client";

import { useState } from "react";

// The signature block that sits at the bottom of every signable document.
//
// Two deliberate choices:
//
//   - You have to TYPE your name. A single "I agree" button is weaker
//     evidence, and typing is the closest thing on a phone to putting pen to
//     paper.
//   - There is a Yes/No confirm. Ben asked for one on every irreversible
//     action, and a signature is the most irreversible thing in the app.

export default function SignBlock({
  docKey,
  title,
  alreadySigned,
  signedAt,
  signedName,
  suggestedName,
  backHref,
}: {
  docKey: string;
  title: string;
  alreadySigned: boolean;
  signedAt?: string | null;
  signedName?: string | null;
  suggestedName?: string;
  backHref: string;
}) {
  const [name, setName] = useState(suggestedName || "");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(alreadySigned);

  async function sign() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: docKey, name }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "That did not save. Try again.");
        setBusy(false);
        setConfirming(false);
        return;
      }
      setDone(true);
      setBusy(false);
      setConfirming(false);
    } catch (e: any) {
      setError("No connection. Your signature was not saved.");
      setBusy(false);
      setConfirming(false);
    }
  }

  if (done) {
    return (
      <div className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
        <div className="text-sm font-semibold text-emerald-800">Signed</div>
        <div className="mt-1 text-sm text-emerald-700">
          {signedName ? signedName + " - " : null}
          {signedAt ? new Date(signedAt).toLocaleString() : "just now"}
        </div>
        <a href={backHref} className="mt-3 inline-block text-sm font-semibold text-emerald-800 underline">
          Back to the list
        </a>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border-2 border-slate-300 bg-white p-4">
      <div className="text-sm font-bold uppercase tracking-wide text-slate-900">Sign here</div>
      <p className="mt-1 text-xs leading-snug text-slate-500">
        Typing your full name below and pressing Sign is your electronic
        signature on &ldquo;{title}&rdquo;. It has the same effect as signing on
        paper. The date, time and the exact wording you were shown are saved
        with it.
      </p>

      <label className="mt-3 block text-xs font-semibold text-slate-600">
        Your full name
      </label>
      <input
        type="text"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setConfirming(false);
        }}
        placeholder="First and last name"
        autoComplete="name"
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-base text-slate-900 focus:border-slate-500 focus:outline-none"
      />

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      {!confirming ? (
        <button
          type="button"
          disabled={busy || name.trim().length < 2}
          onClick={() => setConfirming(true)}
          className="mt-3 w-full rounded-md bg-slate-900 py-3 text-sm font-bold text-white disabled:opacity-40"
        >
          Sign
        </button>
      ) : (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-slate-900">
            Sign as {name.trim()}?
          </p>
          <p className="mt-1 text-xs text-slate-600">
            This cannot be undone from your phone. If it is wrong, tell the
            office.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={sign}
              className="flex-1 rounded-md bg-emerald-700 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? "Saving..." : "Yes, sign it"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-md border border-slate-300 bg-white py-2.5 text-sm font-bold text-slate-700"
            >
              No, go back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
