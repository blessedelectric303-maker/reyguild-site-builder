"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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

  // ACCEPTED PROPOSALS WAITING TO BE SCHEDULED.
  // Ben's rule: nothing goes on the calendar the customer has not said yes
  // to. Picking one here fills the form from the proposal, so the job that
  // gets booked is the job that was quoted - not a retyped approximation of
  // it that drifts by a room and two hours.
  const [props, setProps] = useState<any[]>([]);
  const [fProp, setFProp] = useState("");
  // Coordinates inherited from the proposal, when it has them.
  const [fEmail, setFEmail] = useState("");
  const [fPhone, setFPhone] = useState("");
  const calAddrRef = useRef<HTMLInputElement | null>(null);
  const calAutoRef = useRef<any>(null);
  const [mapsReady, setMapsReady] = useState(false);

  // Loaded once, only when somebody opens the form.
  useEffect(() => {
    if ((window as any).google?.maps?.places) { setMapsReady(true); return; }
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return; // No key: an ordinary text box, not a broken one.
    if (document.getElementById("rg-maps-js")) return;
    const el = document.createElement("script");
    el.id = "rg-maps-js";
    el.src = "https://maps.googleapis.com/maps/api/js?key=" + key + "&libraries=places";
    el.async = true;
    el.onload = () => setMapsReady(true);
    document.head.appendChild(el);
  }, []);

  useEffect(() => {
    if (!mapsReady || !calAddrRef.current || calAutoRef.current) return;
    const g = (window as any).google;
    if (!g?.maps?.places) return;
    calAutoRef.current = new g.maps.places.Autocomplete(calAddrRef.current, {
      types: ["address"],
      componentRestrictions: { country: "us" },
      fields: ["formatted_address", "geometry"],
    });
    calAutoRef.current.addListener("place_changed", () => {
      const place = calAutoRef.current.getPlace();
      if (!place?.geometry) return;
      setFAddr(place.formatted_address || "");
      setFLat(place.geometry.location.lat());
      setFLng(place.geometry.location.lng());
    });
  }, [mapsReady]);

  const [fLat, setFLat] = useState<number | null>(null);
  const [fLng, setFLng] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/proposals/schedulable");
        const j = await r.json();
        if (alive && Array.isArray(j.items)) setProps(j.items);
      } catch (e) { /* leave it empty; the picker hides itself */ }
    })();
    return () => { alive = false; };
  }, []);

  const waiting = props.filter((p) => !p.already_scheduled);

  function pickProposal(ref: string) {
    setFProp(ref);
    const p = props.find((x) => x.ref_id === ref);
    if (!p) return;
    // A PROPOSAL GETS THE FULL JOB PAGE, NOT THIS BOX.
    // The quick form on the calendar is for a job somebody invents on the
    // spot. A proposal already has a customer, an address, a scope and a
    // price the customer signed for, and it needs material, costs and a tech
    // rate attached to it - none of which fit here. Hand it over instead.
    if (ref) {
      router.push("/tm/admin/jobs/new?fromProposal=" + encodeURIComponent(ref));
      return;
    }
    if (p.client) setFTitle(p.client);
    if (p.address) setFAddr(p.address);
    if (p.description) setFDesc(p.description);
    // The estimator already picked this address off Google's list. Reusing
    // those coordinates means the job lands exactly where the proposal said,
    // rather than wherever a second lookup decides.
    if (p.email) setFEmail(p.email);
    if (p.phone) setFPhone(p.phone);
    if (p.lat != null && p.lng != null) {
      setFLat(p.lat);
      setFLng(p.lng);
    }
  }
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
          proposalRef: fProp,
          jobLat: fLat,
          jobLng: fLng,
          customerEmail: fEmail,
          customerPhone: fPhone,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      setSaving(false);
      if (!res.ok) {
        setErr(payload.error || "Could not add that job.");
        return;
      }
      if (payload.note) setErr(payload.note);
      setFProp("");
      setProps((list) =>
        list.map((p) => (p.ref_id === fProp ? { ...p, already_scheduled: true } : p))
      );
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

      {/* One line on every screen: short words, small type, no wrapping. */}
      <div className="mt-3 flex flex-nowrap items-center justify-center gap-x-3 whitespace-nowrap text-[10px] text-slate-400 sm:text-[11px]">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TYPE_COLOR.emergency }} />Emergency</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TYPE_COLOR.service_call }} />Service</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TYPE_COLOR.estimate }} />Proposal</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TYPE_COLOR.warranty_call }} />Warranty</span>
      </div>
      <div className="mt-2 text-center text-xs text-slate-500">{canEdit ? "Tap a day to see its jobs. Edit changes the job everywhere." : "Tap a day to see the jobs."}</div>

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
                      {canEdit && !(e as any).legacy ? (
                        <a href={"/tm/enter?next=" + encodeURIComponent("/tm/admin/jobs/" + e.id)} className="shrink-0 rounded-md border px-2 py-1 text-xs font-semibold" style={{ borderColor: "#CC9000", color: "#CC9000" }}>Edit</a>
                      ) : null}
                    </div>
                  ))
                )}
              </div>

              {/* REFERENCE ONLY. A job exists because a customer signed a
                  proposal - so nothing is booked from here. The booking
                  happens in T&M; this shows the result, and Edit opens the job
                  itself, so a change lands in T&M and P&L at the same time. */}
              {canEdit ? (
                <div className="mt-4 border-t border-slate-800 pt-3 text-xs leading-relaxed text-slate-400">
                  Jobs come from signed proposals.{" "}
                  <a href={"/tm/enter?next=" + encodeURIComponent("/tm/admin/scheduling")} className="font-semibold" style={{ color: "#CC9000" }}>Book an accepted proposal &rsaquo;</a>
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
