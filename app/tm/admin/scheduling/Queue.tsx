"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// The four colors that can land on the calendar.
const TYPES: { key: string; label: string; color: string; text: string }[] = [
  { key: "emergency", label: "Emergency", color: "#F0302A", text: "#ffffff" },
  { key: "proposal", label: "Proposal", color: "#1BBF55", text: "#000000" },
  { key: "service_call", label: "Service Call", color: "#2183E8", text: "#ffffff" },
  { key: "warranty", label: "Warranty", color: "#FF9012", text: "#000000" },
];

export type PendingProposal = { id: string; no: string; client: string; addr: string; description: string; total: number };
export type PendingJob = { id: string; customerName: string; jobAddress: string; jobType: string; jobDescription: string };
export type Tech = { id: string; name: string };

function colorFor(key: string) {
  return TYPES.find((t) => t.key === key) || TYPES[1];
}

export default function Queue({ proposals, jobs, techs }: { proposals: PendingProposal[]; jobs: PendingJob[]; techs: Tech[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [openJob, setOpenJob] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [hours, setHours] = useState(2);
  const [tech, setTech] = useState("");
  const [jobType, setJobType] = useState("proposal");

  async function send(payload: any, tag: string) {
    setBusy(tag);
    setErr(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "That did not work. Try again.");
      } else {
        setOpenJob(null);
        setDate("");
        setTech("");
        router.refresh();
      }
    } catch (e) {
      setErr("Could not reach the server.");
    }
    setBusy(null);
  }

  return (
    <div className="space-y-8">
      {err ? <p className="rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{err}</p> : null}

      <section>
        <h2 className="text-lg font-bold text-white">Approved proposals with no job yet</h2>
        <p className="mt-1 text-sm text-slate-400">The customer said yes. Turn it into a job.</p>
        <div className="mt-3 space-y-2">
          {proposals.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing waiting.</p>
          ) : (
            proposals.map((p) => (
              <div key={p.id} className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-white">{p.client || "Customer"}{p.no ? " - " + p.no : ""}</div>
                    {p.addr ? <div className="text-xs text-slate-400">{p.addr}</div> : null}
                    {p.description ? <div className="mt-1 text-sm text-slate-300">{p.description}</div> : null}
                    {p.total > 0 ? <div className="mt-1 text-xs text-emerald-400">${p.total.toFixed(2)}</div> : null}
                  </div>
                  <button type="button" disabled={busy === p.id} onClick={() => send({ action: "create_job", estimateId: p.id, jobType: "proposal" }, p.id)} className="shrink-0 rounded-md px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50" style={{ background: "#1BBF55" }}>{busy === p.id ? "Creating..." : "Create job"}</button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white">Jobs with no date</h2>
        <p className="mt-1 text-sm text-slate-400">Give it a day, a time, and a tech. It lands on the calendar in its color.</p>
        <div className="mt-3 space-y-2">
          {jobs.length === 0 ? (
            <p className="text-sm text-slate-500">Everything is scheduled.</p>
          ) : (
            jobs.map((j) => {
              const c = colorFor(j.jobType || "proposal");
              const open = openJob === j.id;
              return (
                <div key={j.id} className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                        <span className="font-semibold text-white">{j.customerName}</span>
                      </div>
                      {j.jobAddress ? <div className="text-xs text-slate-400">{j.jobAddress}</div> : null}
                      {j.jobDescription ? <div className="mt-1 text-sm text-slate-300">{j.jobDescription}</div> : null}
                    </div>
                    <button type="button" onClick={() => { setOpenJob(open ? null : j.id); setJobType(j.jobType || "proposal"); }} className="shrink-0 rounded-md px-4 py-2 text-sm font-semibold text-slate-900" style={{ background: "#e0a82e" }}>{open ? "Close" : "Set date"}</button>
                  </div>

                  {open ? (
                    <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
                      <div className="grid grid-cols-2 gap-2">
                        {TYPES.map((t) => {
                          const on = jobType === t.key;
                          return (
                            <button type="button" key={t.key} onClick={() => setJobType(t.key)} className="rounded-md px-3 py-2 text-xs font-bold uppercase border border-slate-600" style={on ? { background: t.color, color: t.text, borderColor: "transparent" } : undefined}>{t.label}</button>
                          );
                        })}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
                        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
                      </div>
                      <div className="flex gap-2">
                        {[2, 4, 8].map((h) => (
                          <button type="button" key={h} onClick={() => setHours(h)} className={"flex-1 rounded-md border px-3 py-2 text-xs font-semibold " + (hours === h ? "bg-slate-200 text-slate-900 border-transparent" : "border-slate-600 text-slate-300")}>{h}h</button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {techs.length === 0 ? (
                          <span className="text-xs text-slate-500">No techs to assign yet.</span>
                        ) : (
                          techs.map((t) => (
                            <button type="button" key={t.id} onClick={() => setTech(tech === t.id ? "" : t.id)} className={"rounded-full border px-3 py-1 text-xs font-semibold " + (tech === t.id ? "text-slate-900 border-transparent" : "border-slate-600 text-slate-200")} style={tech === t.id ? { background: "#e0a82e" } : undefined}>{t.name}</button>
                          ))
                        )}
                      </div>
                      <button type="button" disabled={busy === j.id || !date} onClick={() => send({ action: "schedule", jobId: j.id, date, time, hours, techId: tech, jobType }, j.id)} className="w-full rounded-md py-2 text-sm font-semibold text-slate-900 disabled:opacity-50" style={{ background: "#e0a82e" }}>{busy === j.id ? "Scheduling..." : "Schedule it"}</button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
