"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Row = { id: string; label: string; group: string };

// Phone first. Big tap targets, light theme to match the rest of the tech app,
// and the checklist saves itself the same way the office one does.
export default function TechProcedureView({
  color, procedureId, label, skin, purpose, onePager, items, longFormHref,
}: {
  color: string;
  procedureId: string;
  label: string;
  skin: { bg: string; text: string };
  purpose: string | null;
  onePager: string | null;
  items: Row[];
  // Set when SQL 46 has loaded the full written procedure for this card.
  // Undefined means the card is all there is, and no link is drawn.
  longFormHref?: string;
}) {
  const [pane, setPane] = useState<"onepage" | "checklist">("onepage");
  const longForm = longFormHref ? (
    <a
      href={longFormHref}
      className="mt-4 block rounded-xl border border-slate-300 bg-white p-4 text-center"
    >
      <span className="block text-sm font-bold text-slate-900">
        Read the full procedure
      </span>
      <span className="mt-0.5 block text-xs text-slate-500">
        Everything behind this card, in detail. Worth reading once, off the job.
      </span>
    </a>
  ) : null;
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [runId, setRunId] = useState<string | null>(null);
  const [saved, setSaved] = useState("");
  const timer = useRef<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/checklist?color=" + color);
        const data = await res.json();
        if (data.run) {
          setRunId(data.run.id);
          setAnswers(data.run.answers || {});
        }
      } catch (e) {
        // starting fresh is fine
      }
    })();
  }, [color]);

  const persist = useCallback(async (next: Record<string, boolean>) => {
    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, color, procedureId, answers: next }),
      });
      const data = await res.json();
      if (data.id && !runId) setRunId(data.id);
      setSaved("Saved");
      setTimeout(() => setSaved(""), 1500);
    } catch (e) {
      setSaved("Not saved - check your signal");
    }
  }, [runId, color, procedureId]);

  function toggle(id: string) {
    const next = { ...answers, [id]: !answers[id] };
    setAnswers(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(next), 500);
  }

  function clearAll() {
    if (!confirm("Clear every tick on this checklist and start it fresh?")) return;
    setAnswers({});
    persist({});
  }

  const groups: { heading: string; rows: Row[] }[] = [];
  items.forEach((i) => {
    const last = groups[groups.length - 1];
    if (last && last.heading === i.group) last.rows.push(i);
    else groups.push({ heading: i.group, rows: [i] });
  });

  const done = items.filter((i) => answers[i.id]).length;
  const tabCls = (on: boolean) =>
    "flex-1 rounded-lg px-3 py-2.5 text-sm font-bold uppercase tracking-wide " +
    (on ? "bg-black/25" : "bg-black/10 opacity-80");

  return (
    <div>
      <div className="rounded-xl p-3" style={{ background: skin.bg, color: skin.text }}>
        <div className="flex items-center gap-2">
          <Link href="/tm/tech/procedures" aria-label="Back" className="rounded-md bg-black/20 px-2.5 py-2 text-sm font-bold">&larr;</Link>
          <div className="flex-1 text-center text-sm font-extrabold uppercase tracking-widest">{label}</div>
          <span className="w-9" />
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setPane("onepage")} className={tabCls(pane === "onepage")} style={{ color: skin.text }}>One page</button>
          <button type="button" onClick={() => setPane("checklist")} className={tabCls(pane === "checklist")} style={{ color: skin.text }}>
            Checklist{items.length ? " " + done + "/" + items.length : ""}
          </button>
        </div>
      </div>

      {pane === "onepage" ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
          {purpose ? <p className="mb-3 text-sm text-slate-600">{purpose}</p> : null}
          <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-slate-800">{onePager || "The one page card has not been written yet."}</pre>
          {/* At the bottom of the summary, where somebody who has just read it
              and wants the detail will look for it. */}
          {longForm}
        </div>
      ) : (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs text-emerald-600">{saved}</span>
            <button type="button" onClick={clearAll} className="text-xs text-slate-500 underline">Start fresh</button>
          </div>
          {groups.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-500">No checklist on this card yet.</p>
          ) : groups.map((g) => (
            <div key={g.heading} className="mb-4">
              <div className="mb-1.5 px-1 text-xs font-bold uppercase tracking-widest text-slate-500">{g.heading}</div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {g.rows.map((r, n) => {
                  const on = !!answers[r.id];
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => toggle(r.id)}
                      className={"flex w-full items-start gap-3 px-3 py-3 text-left " + (n ? "border-t border-slate-100 " : "") + (on ? "bg-emerald-50" : "")}
                    >
                      <span className={"mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded border text-[11px] font-bold " + (on ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent")}>&#10003;</span>
                      <span className={"text-sm " + (on ? "text-slate-400 line-through" : "text-slate-800")}>{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="px-1 pb-2 text-xs text-slate-500">Saves as you go. Close it and come back - it will still be here.</p>
        </div>
      )}
    </div>
  );
}
