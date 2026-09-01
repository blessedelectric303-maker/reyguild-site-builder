"use client";

import { useState } from "react";

// THE ARRIVAL AND COMPLETION CHECKLISTS.
//
// Two things are deliberate here.
//
// The full-screen ATTENTION appears when the ordinary boxes are done and the
// lines that matter most are not. Coverings, drop cloths and BEFORE photos are
// the difference between "the customer says we scratched the floor" and "here
// is a photograph of the floor before we touched it". A tech in a hurry
// scrolls past a list. A screen he has to deal with is harder to scroll past.
//
// Every tick saves immediately. A checklist held in the page and saved at the
// end is a checklist lost when the signal drops in somebody's basement.

export type Item = {
  item_id: string;
  label: string;
  emphasis: boolean;
  ticked: boolean;
};

export default function JobChecklist({
  jobId,
  phase,
  items,
  heading,
  blurb,
}: {
  jobId: string;
  phase: "arrival" | "completion";
  items: Item[];
  heading: string;
  blurb: string;
}) {
  const [state, setState] = useState<Item[]>(items);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attentionSeen, setAttentionSeen] = useState(false);

  async function toggle(it: Item) {
    const next = !it.ticked;
    setSaving(it.item_id);
    setError(null);
    setState((s) =>
      s.map((x) => (x.item_id === it.item_id ? { ...x, ticked: next } : x))
    );
    try {
      const res = await fetch("/api/tech/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job: jobId, item: it.item_id, on: next }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error || "That did not save.");
        // Put it back. A tick that looks saved and is not is worse than one
        // that visibly failed.
        setState((s) =>
          s.map((x) => (x.item_id === it.item_id ? { ...x, ticked: !next } : x))
        );
      }
    } catch {
      setError("No signal. That tick was not saved - try again when you have bars.");
      setState((s) =>
        s.map((x) => (x.item_id === it.item_id ? { ...x, ticked: !next } : x))
      );
    }
    setSaving(null);
  }

  const ordinary = state.filter((i) => !i.emphasis);
  const critical = state.filter((i) => i.emphasis);
  const ordinaryDone = ordinary.every((i) => i.ticked);
  const criticalDone = critical.every((i) => i.ticked);
  const allDone = ordinaryDone && criticalDone;

  // The moment the easy ones are done and the important ones are not.
  const showAttention =
    !attentionSeen && ordinary.length > 0 && ordinaryDone && !criticalDone;

  if (showAttention) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-center bg-red-700 p-6 text-white">
        <div className="mx-auto w-full max-w-md">
          <div className="text-center text-5xl font-black tracking-tight">
            ATTENTION
          </div>
          <p className="mt-4 text-center text-lg font-semibold leading-snug">
            {phase === "arrival"
              ? "Before you touch anything."
              : "Before you leave."}
          </p>

          <ul className="mt-6 space-y-3">
            {critical.map((i) => (
              <li key={i.item_id}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className={
                    "flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left " +
                    (i.ticked
                      ? "border-white bg-white/20"
                      : "border-white/60 bg-white/5")
                  }
                >
                  <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded border-2 border-white text-sm font-bold">
                    {i.ticked ? "\u2713" : ""}
                  </span>
                  <span className="text-base font-bold leading-snug">{i.label}</span>
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-center text-sm leading-snug text-red-100">
            {phase === "arrival"
              ? "Photographs before you start are what settle an argument about damage. There is no way to take them later."
              : "The after photos and the walkthrough are what get the invoice paid without a phone call."}
          </p>

          {error ? (
            <p className="mt-3 text-center text-sm font-semibold text-yellow-200">{error}</p>
          ) : null}

          <button
            type="button"
            disabled={!criticalDone}
            onClick={() => setAttentionSeen(true)}
            className="mt-6 w-full rounded-xl bg-white py-4 text-base font-bold text-red-700 disabled:opacity-40"
          >
            {criticalDone ? "Done - carry on" : "Tick all of them first"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
          {heading}
        </h2>
        <span
          className={
            "text-xs font-bold " + (allDone ? "text-emerald-700" : "text-amber-700")
          }
        >
          {state.filter((i) => i.ticked).length} / {state.length}
        </span>
      </div>
      <p className="mt-1 text-xs leading-snug text-slate-500">{blurb}</p>

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      <ul className="mt-3 space-y-1.5">
        {state.map((i) => (
          <li key={i.item_id}>
            <button
              type="button"
              disabled={saving === i.item_id}
              onClick={() => toggle(i)}
              className={
                "flex w-full items-start gap-3 rounded-lg border p-3 text-left " +
                (i.ticked
                  ? "border-emerald-300 bg-emerald-50"
                  : i.emphasis
                  ? "border-amber-300 bg-amber-50"
                  : "border-slate-200 bg-white")
              }
            >
              <span
                className={
                  "mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded border-2 text-xs font-bold " +
                  (i.ticked
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-400 text-transparent")
                }
              >
                {"\u2713"}
              </span>
              <span
                className={
                  "leading-snug " +
                  (i.emphasis
                    ? "text-sm font-bold text-slate-900"
                    : "text-sm text-slate-700")
                }
              >
                {i.label}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {allDone ? (
        <p className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-center text-xs font-semibold text-emerald-800">
          {phase === "arrival"
            ? "All set. Go to work."
            : "All done. Mark the job finished and the office will invoice it."}
        </p>
      ) : null}
    </div>
  );
}
