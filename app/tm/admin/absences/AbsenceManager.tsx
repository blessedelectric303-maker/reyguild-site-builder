"use client";

import { useState } from "react";
import Link from "next/link";

type Notice = { id: string; date: string; excused: boolean; reason: string; notes: string };
type Row = { id: string; name: string; email: string; role: string; unexcused: number; recent: Notice[] };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AbsenceManager({
  rows, windowDays, threshold,
}: { rows: Row[]; windowDays: number; threshold: number }) {
  const [team, setTeam] = useState<Row[]>(rows);
  const [open, setOpen] = useState<string | null>(null);
  const [date, setDate] = useState(today());
  const [excused, setExcused] = useState(true);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function mark(userId: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, absenceDate: date, excused, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Could not save that.");
        setBusy(false);
        return;
      }
      setTeam(team.map((t) => t.id === userId
        ? {
            ...t,
            unexcused: t.unexcused + (excused ? 0 : 1),
            recent: [{ id: data.id, date, excused, reason: "", notes }, ...t.recent].slice(0, 8),
          }
        : t));
      setOpen(null);
      setNotes("");
      setExcused(true);
      setDate(today());
    } catch (e) {
      setErr("Could not reach the server.");
    }
    setBusy(false);
  }

  return (
    <div className="max-w-3xl">
      <Link href="/tm/admin" className="text-sm text-slate-500 underline">&larr; Back</Link>
      <h1 className="mt-3 text-xl font-semibold text-slate-900">Absences</h1>
      <p className="mt-1 text-sm text-slate-600">
        Everything defaults to excused. An absence only counts against somebody
        when you deliberately mark it unexcused. {threshold} unexcused in{" "}
        {windowDays} days raises a flag.
      </p>

      {err ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p> : null}

      <div className="mt-5 space-y-2">
        {team.map((u) => {
          const flagged = u.unexcused >= threshold;
          return (
            <div key={u.id} className={"rounded-xl border bg-white p-4 " + (flagged ? "border-red-300" : "border-slate-200")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">{u.name}</div>
                  <div className="truncate text-xs text-slate-500">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={"rounded-full px-2.5 py-1 text-xs font-bold " + (flagged ? "bg-red-100 text-red-800" : u.unexcused > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600")}>
                    {u.unexcused} unexcused
                  </span>
                  <button type="button" onClick={() => setOpen(open === u.id ? null : u.id)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    Mark absent
                  </button>
                </div>
              </div>

              {flagged ? (
                <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
                  {u.unexcused} unexcused absences in the last {windowDays} days.
                  This is at or past the threshold - it goes to the owner, not
                  decided at this desk.
                </p>
              ) : null}

              {open === u.id ? (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-xs text-slate-600">
                      Date
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    </label>
                    <label className="text-xs text-slate-600">
                      Notes - what was said, not your opinion of it
                      <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Called at 6:10, said he was ill" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setExcused(true)} className={"rounded-md px-3 py-1.5 text-xs font-semibold " + (excused ? "bg-emerald-600 text-white" : "border border-slate-300 text-slate-700")}>Excused</button>
                    <button type="button" onClick={() => setExcused(false)} className={"rounded-md px-3 py-1.5 text-xs font-semibold " + (!excused ? "bg-red-600 text-white" : "border border-slate-300 text-slate-700")}>Unexcused</button>
                    <button type="button" disabled={busy} onClick={() => mark(u.id)} className="ml-auto rounded-md bg-slate-900 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50">{busy ? "Saving..." : "Save"}</button>
                  </div>
                </div>
              ) : null}

              {u.recent.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {u.recent.map((n) => (
                    <span key={n.id} title={n.notes || n.reason} className={"rounded px-2 py-0.5 text-[11px] " + (n.excused ? "bg-slate-100 text-slate-600" : "bg-red-100 text-red-800")}>
                      {n.date}{n.excused ? "" : " - unexcused"}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
