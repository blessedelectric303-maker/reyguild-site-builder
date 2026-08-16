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
};

const TYPE_COLOR: Record<string, string> = {
  estimate: "#3b82f6",
  service_call: "#22c55e",
};
const TYPE_LABEL: Record<string, string> = {
  estimate: "Estimate",
  service_call: "Service Call",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function pad(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}
function dayKey(y: number, m: number, d: number): string {
  return y + "-" + pad(m + 1) + "-" + pad(d);
}

export default function Calendar({ companyId, canEdit }: { companyId?: string; canEdit: boolean }) {
  const supabase = createClient();
  const today = new Date();
  const [y, setY] = useState(today.getFullYear());
  const [m, setM] = useState(today.getMonth());
  const [events, setEvents] = useState<Ev[]>([]);
  const [selDay, setSelDay] = useState<string | null>(null);
  const [fType, setFType] = useState("service_call");
  const [fTitle, setFTitle] = useState("");
  const [fAddr, setFAddr] = useState("");
  const [fTime, setFTime] = useState("");
  const [saving, setSaving] = useState(false);

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstWeekday = new Date(y, m, 1).getDay();

  const load = useCallback(async () => {
    if (!companyId) return;
    const from = dayKey(y, m, 1);
    const to = dayKey(y, m, daysInMonth);
    const { data } = await supabase.schema("suite").from("calendar_events").select("id,title,address,event_type,event_date,event_time").gte("event_date", from).lte("event_date", to).order("event_date");
    setEvents((data as Ev[]) || []);
  }, [companyId, y, m, daysInMonth, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function eventsFor(key: string): Ev[] {
    return events.filter((e) => e.event_date === key);
  }

  function prevMonth() {
    setSelDay(null);
    if (m === 0) {
      setM(11);
      setY(y - 1);
    } else {
      setM(m - 1);
    }
  }
  function nextMonth() {
    setSelDay(null);
    if (m === 11) {
      setM(0);
      setY(y + 1);
    } else {
      setM(m + 1);
    }
  }

  async function addEvent() {
    if (!companyId || !selDay || saving) return;
    const title = fTitle.trim();
    if (!title) return;
    setSaving(true);
    const { error } = await supabase.schema("suite").from("calendar_events").insert({
      company_id: companyId,
      title,
      address: fAddr.trim() || null,
      event_type: fType,
      event_date: selDay,
      event_time: fTime.trim() || null,
    });
    setSaving(false);
    if (error) {
      alert("Couldn't add that job: " + error.message);
      return;
    }
    setFTitle("");
    setFAddr("");
    setFTime("");
    load();
  }

  async function removeEvent(id: string) {
    const { error } = await supabase.schema("suite").from("calendar_events").delete().eq("id", id);
    if (error) {
      alert("Couldn't remove that: " + error.message);
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

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} aria-label="Previous month" className="rounded-md border border-slate-600 px-2 py-1 text-sm text-slate-200 hover:bg-slate-800">&larr;</button>
        <div className="text-base font-bold text-white">{MONTHS[m]} {y}</div>
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
          const selected = selDay === key;
          const cellCls = "aspect-square rounded-md border p-1 text-left overflow-hidden " + (selected ? "border-slate-400 bg-slate-800" : "border-slate-800 hover:border-slate-600");
          return (
            <button type="button" key={i} onClick={() => setSelDay(key)} className={cellCls}>
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

      <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLOR.service_call }} /> Service Call</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLOR.estimate }} /> Estimate</span>
      </div>

      {selDay ? (
        <div className="mt-4 border-t border-slate-800 pt-3">
          <div className="text-sm font-semibold text-white mb-2">{selDay}</div>
          <div className="space-y-2">
            {eventsFor(selDay).length === 0 ? (
              <div className="text-xs text-slate-500">No jobs on this day yet.</div>
            ) : (
              eventsFor(selDay).map((e) => (
                <div key={e.id} className="flex items-start justify-between gap-2 rounded-md border border-slate-800 p-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: TYPE_COLOR[e.event_type] || "#94a3b8" }} />
                      <span className="text-sm font-medium" style={{ color: TYPE_COLOR[e.event_type] || "#cbd5e1" }}>{e.title}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{e.event_time ? e.event_time + " - " : ""}{TYPE_LABEL[e.event_type] || e.event_type}</div>
                    {e.address ? <div className="text-xs text-slate-500 break-words">{e.address}</div> : null}
                  </div>
                  {canEdit ? (
                    <button type="button" onClick={() => removeEvent(e.id)} aria-label="Remove" className="shrink-0 text-slate-500 hover:text-red-400 text-sm">&times;</button>
                  ) : null}
                </div>
              ))
            )}
          </div>

          {canEdit ? (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                {typeToggle("service_call", "Service Call")}
                {typeToggle("estimate", "Estimate")}
              </div>
              <input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="Job / customer name" className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100" />
              <input value={fAddr} onChange={(e) => setFAddr(e.target.value)} placeholder="Address" className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100" />
              <input value={fTime} onChange={(e) => setFTime(e.target.value)} placeholder="Time (e.g. 9:00 AM)" className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100" />
              <button type="button" onClick={addEvent} disabled={saving || !fTitle.trim()} className="w-full rounded-md py-2 text-sm font-semibold text-slate-900 disabled:opacity-50" style={{ background: "#e0a82e" }}>{saving ? "Adding..." : "Add to calendar"}</button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 text-center text-xs text-slate-500">{canEdit ? "Tap a day to add a job." : "Tap a day to see the jobs."}</div>
      )}
    </div>
  );
}
