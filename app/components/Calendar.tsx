"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Ev = {
  id: string;
  title: string;
  address: string | null;
  event_type: string;
  event_date: string;
  event_time: string | null;
  assigned_to: string | null;
  assigned_name?: string | null;
  duration_hours: number;
  job_description?: string | null;
  material?: string | null;
  legacy?: boolean;
};
type Member = { user_id: string; role: string; email: string };

const WORKDAY = 8; // hours a tech can be booked per day. Change this to cap it lower.

const TYPE_COLOR: Record<string, string> = {
  estimate: "#1BBF55",
  service_call: "#2183E8",
  warranty_call: "#FF9012",
  emergency: "#F0302A",
};
const TYPE_LABEL: Record<string, string> = {
  estimate: "Proposal",
  service_call: "Service Call",
  warranty_call: "Warranty Call",
  emergency: "Emergency",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function pad(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}
function dayKey(y: number, m: number, d: number): string {
  return y + "-" + pad(m + 1) + "-" + pad(d);
}
function shortName(email: string): string {
  return email ? email.split("@")[0] : "Tech";
}

export default function Calendar({ companyId, canEdit, userId, userEmail, logoUrl }: { companyId?: string; canEdit: boolean; userId?: string; userEmail?: string; logoUrl?: string }) {
  const supabase = createClient();
  const today = new Date();
  const [y, setY] = useState(today.getFullYear());
  const [m, setM] = useState(today.getMonth());
  const [events, setEvents] = useState<Ev[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selDay, setSelDay] = useState<string | null>(null);
  const [fType, setFType] = useState("service_call");
  const [fTitle, setFTitle] = useState("");
  const [fAddr, setFAddr] = useState("");
  const [fTime, setFTime] = useState("");
  const [fTech, setFTech] = useState<string>("");
  const [fDur, setFDur] = useState(2);
  const [fDesc, setFDesc] = useState("");
  const [fMat, setFMat] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstWeekday = new Date(y, m, 1).getDay();

  const techOptions: Member[] = [];
  if (userId) techOptions.push({ user_id: userId, role: "me", email: userEmail || "Me" });
  members.forEach((mm) => techOptions.push(mm));

  function emailFor(id: string): string {
    if (id === userId) return userEmail || "";
    const mm = members.find((x) => x.user_id === id);
    return mm ? mm.email : "";
  }

  function nameFor(id: string | null): string {
    if (!id) return "";
    if (id === userId) return "Me";
    const mm = members.find((x) => x.user_id === id);
    return mm ? shortName(mm.email) : "Tech";
  }

  const load = useCallback(async () => {
    if (!companyId) return;
    const from = dayKey(y, m, 1);
    const to = dayKey(y, m, daysInMonth);
    // Jobs are the real calendar now. The old table is still read so nothing
    // you scheduled before this change disappears.
    let jobEvents: Ev[] = [];
    try {
      const res = await fetch("/api/calendar?from=" + from + "&to=" + to);
      const payload = await res.json();
      jobEvents = (payload.events as Ev[]) || [];
    } catch (e) {
      jobEvents = [];
    }
    const { data } = await supabase.schema("suite").from("calendar_events").select("id,title,address,event_type,event_date,event_time,assigned_to,duration_hours").gte("event_date", from).lte("event_date", to).order("event_date");
    const legacy = ((data as Ev[]) || []).map((e) => ({ ...e, legacy: true }));
    setEvents(jobEvents.concat(legacy));
  }, [companyId, y, m, daysInMonth, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!canEdit) return;
    (async () => {
      const { data } = await supabase.schema("suite").rpc("messageable_members");
      setMembers((data as Member[]) || []);
    })();
  }, [canEdit, supabase]);

  function eventsFor(key: string): Ev[] {
    return events.filter((e) => e.event_date === key);
  }
  function hoursBooked(techId: string, key: string): number {
    return events
      .filter((e) => e.event_date === key && e.assigned_to === techId)
      .reduce((sum, e) => sum + (e.duration_hours || 0), 0);
  }

  function openDay(key: string) {
    setSelDay(key);
    setErr(null);
    setFTitle("");
    setFAddr("");
    setFTime("");
    setFTech("");
    setFDur(2);
    setFDesc("");
    setFMat("");
    setFType("service_call");
  }

  function prevMonth() {
    if (m === 0) {
      setM(11);
      setY(y - 1);
    } else {
      setM(m - 1);
    }
  }
  function nextMonth() {
    if (m === 11) {
      setM(0);
      setY(y + 1);
    } else {
      setM(m + 1);
    }
  }

  async function addEvent() {
    if (!companyId || !selDay || saving) return;
    setErr(null);
    const title = fTitle.trim();
    if (!title) return;
    if (fTech && hoursBooked(fTech, selDay) + fDur > WORKDAY) {
      setErr(nameFor(fTech) + " would be over " + WORKDAY + " hours that day.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          address: fAddr.trim(),
          jobType: fType,
          date: selDay,
          time: fTime.trim() || "08:00",
          hours: fDur,
          techEmail: fTech ? emailFor(fTech) : "",
          jobDescription: fDesc.trim(),
          material: fMat.trim(),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      setSaving(false);
      if (!res.ok) {
        setErr(payload.error || "Could not add that job.");
        return;
      }
      if (payload.note) setErr(payload.note);
    } catch (e) {
      setSaving(false);
      setErr("Could not reach the server.");
      return;
    }
    setFTitle("");
    setFAddr("");
    setFTime("");
    setFTech("");
    setFDesc("");
    setFMat("");
    load();
  }

  async function removeEvent(ev: Ev) {
    if (ev.legacy) {
      const { error } = await supabase.schema("suite").from("calendar_events").delete().eq("id", ev.id);
      if (error) {
        setErr("Couldn't remove that: " + error.message);
        return;
      }
      load();
      return;
    }
    try {
      const res = await fetch("/api/calendar?id=" + encodeURIComponent(ev.id), { method: "DELETE" });
      if (!res.ok) {
        setErr("Could not take that off the calendar.");
        return;
      }
    } catch (e) {
      setErr("Could not reach the server.");
      return;
    }
    load();
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d: number) => y === today.getFullYear() && m === today.getMonth() && d === today.getDate();

  const typeToggle = (val: string, label: string) => {
    const on = fType === val;
    const cls = "flex-1 rounded-md px-3 py-1.5 text-xs font-semibold border " + (on ? "text-slate-900 border-transparent" : "text-slate-300 border-slate-600");
    return (
      <button type="button" onClick={() => setFType(val)} className={cls} style={on ? { background: TYPE_COLOR[val] } : undefined}>{label}</button>
    );
  };
  const durToggle = (val: number) => {
    const on = fDur === val;
    const cls = "flex-1 rounded-md px-3 py-1.5 text-xs font-semibold border " + (on ? "bg-slate-200 text-slate-900 border-transparent" : "text-slate-300 border-slate-600");
    return (
      <button type="button" onClick={() => setFDur(val)} className={cls}>{val}h</button>
    );
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
      {logoUrl ? (
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center p-2">
          <img src={logoUrl} alt="" className="h-full w-full object-contain opacity-[0.09]" />
        </div>
      ) : null}
      <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} aria-label="Previous month" className="rounded-md border border-slate-600 px-2 py-1 text-sm text-slate-200 hover:bg-slate-800">&larr;</button>
        <div className="mil text-base font-bold text-white">{MONTHS[m]} {y}</div>
        <button type="button" onClick={nextMonth} aria-label="Next month" className="rounded-md border border-slate-600 px-2 py-1 text-sm text-slate-200 hover:bg-slate-800">&rarr;</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-500 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="aspect-square" />;
          const key = dayKey(y, m, d);
          const dayEvents = eventsFor(key);
          const cellCls = "aspect-square rounded-md border p-1 text-left overflow-hidden border-slate-800 hover:border-slate-500";
          return (
            <button type="button" key={i} onClick={() => openDay(key)} className={cellCls}>
              <div className={"text-[11px] " + (isToday(d) ? "font-bold text-amber-300" : "text-slate-300")}>{d}</div>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <div key={e.id} className="h-1.5 rounded-full" style={{ background: TYPE_COLOR[e.event_type] || "#94a3b8" }} />
                ))}
                {dayEvents.length > 3 ? <div className="text-[9px] text-slate-500">+{dayEvents.length - 3}</div> : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLOR.emergency }} /> Emergency</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLOR.service_call }} /> Service Call</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLOR.estimate }} /> Proposal</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLOR.warranty_call }} /> Warranty</span>
      </div>
      <div className="mt-2 text-center text-xs text-slate-500">{canEdit ? "Tap a day to open it and add jobs." : "Tap a day to see the jobs."}</div>

      {selDay ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 sm:items-center" onClick={() => setSelDay(null)}>
          <div className="mt-6 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:mt-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="text-base font-bold text-white">{selDay}</div>
              <button type="button" onClick={() => setSelDay(null)} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white">&times;</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {eventsFor(selDay).length === 0 ? (
                  <div className="text-sm text-slate-500">No jobs on this day yet.</div>
                ) : (
                  eventsFor(selDay).map((e) => (
                    <div key={e.id} className="flex items-start justify-between gap-2 rounded-lg border border-slate-800 p-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOR[e.event_type] || "#94a3b8" }} />
                          <span className="text-sm font-semibold" style={{ color: TYPE_COLOR[e.event_type] || "#cbd5e1" }}>{e.title}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{e.event_time ? e.event_time + " - " : ""}{e.duration_hours ? e.duration_hours + "h - " : ""}{TYPE_LABEL[e.event_type] || e.event_type}{e.assigned_to ? " - " + (e.assigned_name || nameFor(e.assigned_to)) : ""}</div>
                        {e.address ? <div className="text-xs text-slate-500 break-words mt-0.5">{e.address}</div> : null}
                        {e.job_description ? <div className="mt-1 text-xs text-slate-300 break-words">{e.job_description}</div> : null}
                        {e.material ? <div className="mt-1 text-xs text-amber-300 break-words">Material: {e.material}</div> : null}
                      </div>
                      {canEdit ? (
                        <button type="button" onClick={() => removeEvent(e)} aria-label="Remove" className="shrink-0 text-slate-500 hover:text-red-400">&times;</button>
                      ) : null}
                    </div>
                  ))
                )}
              </div>

              {canEdit ? (
                <div className="mt-4 border-t border-slate-800 pt-4 space-y-2">
                  <div className="text-sm font-semibold text-white">Add a job</div>
                  <div className="grid grid-cols-2 gap-2">
                    {typeToggle("service_call", "Service Call")}
                    {typeToggle("estimate", "Proposal")}
                    {typeToggle("warranty_call", "Warranty")}
                    {typeToggle("emergency", "Emergency")}
                  </div>
                  <input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="Job / customer name" className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100" />
                  <input value={fAddr} onChange={(e) => setFAddr(e.target.value)} placeholder="Address" className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100" />
                  <input value={fTime} onChange={(e) => setFTime(e.target.value)} placeholder="Start time - 9:00 AM or 09:00" className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100" />
                  <textarea value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={2} placeholder="Job description - what is happening on this job" className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100" />
                  <textarea value={fMat} onChange={(e) => setFMat(e.target.value)} rows={2} placeholder="Material - what to pick up and where" className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100" />

                  <div>
                    <div className="text-xs text-slate-500 mb-1">How long?</div>
                    <div className="flex gap-2">
                      {durToggle(2)}
                      {durToggle(4)}
                      {durToggle(8)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500 mb-1">Assign a tech (optional)</div>
                    <div className="flex flex-wrap gap-2">
                      {techOptions.map((t) => {
                        const wouldExceed = hoursBooked(t.user_id, selDay) + fDur > WORKDAY;
                        const on = fTech === t.user_id;
                        const busy = wouldExceed && !on;
                        const label = t.role === "me" ? "Me" : shortName(t.email);
                        const cls = "rounded-full px-3 py-1 text-xs font-semibold border " + (on ? "text-slate-900 border-transparent" : busy ? "text-slate-600 border-slate-800" : "text-slate-200 border-slate-600");
                        return (
                          <button type="button" key={t.user_id} disabled={busy} onClick={() => setFTech(on ? "" : t.user_id)} className={cls} style={on ? { background: "#CC9000" } : undefined}>{label}{busy ? " (full)" : ""}</button>
                        );
                      })}
                      {techOptions.length === 0 ? <span className="text-xs text-slate-600">Invite your team to assign techs.</span> : null}
                    </div>
                  </div>

                  {err ? <p className="text-xs text-red-400">{err}</p> : null}
                  <button type="button" onClick={addEvent} disabled={saving || !fTitle.trim()} className="w-full rounded-md py-2 text-sm font-semibold text-slate-900 disabled:opacity-50" style={{ background: "#CC9000" }}>{saving ? "Adding..." : "Add to calendar"}</button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
