"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

// The six-question safety triage. The first five, if YES, force an emergency.
const TRIAGE = [
  { key: "burning", q: "Burning smell?", red: true },
  { key: "sparking", q: "Sparking or buzzing?", red: true },
  { key: "exposed", q: "Exposed or hanging wires?", red: true },
  { key: "water", q: "Water on or near electrical?", red: true },
  { key: "hot", q: "Anything hot to the touch?", red: true },
  { key: "power", q: "Power out (fully or partially)?", red: false },
];

export default function ServiceCallIntake({
  companyId,
  userId,
  onClose,
  onEmergency,
}: {
  companyId?: string;
  userId?: string;
  onClose: () => void;
  onEmergency: () => void;
}) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [callerName, setCallerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [heardHow, setHeardHow] = useState("");
  const [customerStatus, setCustomerStatus] = useState("");

  const [triage, setTriage] = useState<Record<string, string>>({});

  const [symptoms, setSymptoms] = useState("");
  const [breakerKnown, setBreakerKnown] = useState("");
  const [started, setStarted] = useState("");
  const [tried, setTried] = useState("");
  const [material, setMaterial] = useState("");
  const [urgency, setUrgency] = useState("standard");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [dur, setDur] = useState(2);

  const redFlag = TRIAGE.some((t) => t.red && triage[t.key] === "yes");
  const triageComplete = TRIAGE.every((t) => triage[t.key] === "yes" || triage[t.key] === "no");

  function setT(key: string, val: string) {
    setTriage((prev) => ({ ...prev, [key]: val }));
    if (key === "power" && val === "yes") setUrgency("urgent");
  }

  async function save() {
    setErr(null);
    if (!callerName.trim() || !phone.trim() || !address.trim()) {
      setErr("Caller name, phone, and address are required.");
      return;
    }
    if (!triageComplete) {
      setErr("Answer all six safety questions first.");
      return;
    }
    if (redFlag) {
      setErr("A safety answer flagged an emergency — switch to the RED emergency intake.");
      return;
    }
    if (!companyId) {
      setErr("No company found.");
      return;
    }
    if (!date) {
      setErr("Pick a date to put it on the calendar.");
      return;
    }
    setSaving(true);
    const { error: callErr } = await supabase.schema("suite").from("calls").insert({
      company_id: companyId,
      call_type: "service_call",
      caller_name: callerName.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      address: address.trim(),
      need: symptoms.trim() || null,
      urgency,
      safety_issue: false,
      heard_how: heardHow.trim() || null,
      customer_status: customerStatus || null,
      details: {
        triage,
        breaker_location_known: breakerKnown,
        when_started: started.trim(),
        already_tried: tried.trim(),
        likely_material: material.trim(),
      },
      taken_by: userId || null,
    });
    if (callErr) {
      setSaving(false);
      setErr("Couldn't save the call: " + callErr.message);
      return;
    }
    const { error: calErr } = await supabase.schema("suite").from("calendar_events").insert({
      company_id: companyId,
      title: callerName.trim(),
      address: address.trim(),
      event_type: "service_call",
      event_date: date,
      event_time: time.trim() || null,
      duration_hours: dur,
      assigned_to: null,
    });
    setSaving(false);
    if (calErr) {
      setErr("Call saved, but couldn't add to calendar: " + calErr.message);
      return;
    }
    setSaved(true);
    setTimeout(onClose, 1200);
  }

  const field = "w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100";
  const label = "block text-xs uppercase tracking-wide text-slate-400 mt-3 mb-1";

  const yesNo = (key: string) => (
    <div className="flex gap-2">
      <button type="button" onClick={() => setT(key, "yes")} className={"flex-1 rounded-md px-3 py-1.5 text-xs font-semibold border " + (triage[key] === "yes" ? "bg-red-700 text-white border-transparent" : "text-slate-300 border-slate-600")}>Yes</button>
      <button type="button" onClick={() => setT(key, "no")} className={"flex-1 rounded-md px-3 py-1.5 text-xs font-semibold border " + (triage[key] === "no" ? "bg-slate-600 text-white border-transparent" : "text-slate-300 border-slate-600")}>No</button>
    </div>
  );
  const durToggle = (val: number) => (
    <button type="button" onClick={() => setDur(val)} className={"flex-1 rounded-md px-3 py-1.5 text-xs font-semibold border " + (dur === val ? "bg-slate-200 text-slate-900 border-transparent" : "text-slate-300 border-slate-600")}>{val}h</button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-3 sm:items-center" onClick={onClose}>
      <div className="mt-4 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:mt-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3" style={{ background: "#1C5FA8" }}>
          <div className="text-base font-extrabold text-white">SERVICE CALL</div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-white/90 hover:bg-white/20">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {saved ? (
            <div className="text-center py-8 text-emerald-400 font-semibold">Service call saved and added to the calendar.</div>
          ) : (
            <>
              <span className={label} style={{ marginTop: 0 }}>Caller name *</span>
              <input className={field} value={callerName} onChange={(e) => setCallerName(e.target.value)} />
              <span className={label}>Best phone *</span>
              <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} />
              <span className={label}>Email</span>
              <input className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
              <span className={label}>Service address *</span>
              <input className={field} value={address} onChange={(e) => setAddress(e.target.value)} />

              <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/40 p-3">
                <div className="text-sm font-bold text-white">Safety triage — ask before scheduling</div>
                <div className="mt-2 space-y-2">
                  {TRIAGE.map((t) => (
                    <div key={t.key}>
                      <div className="text-xs text-slate-300 mb-1">{t.q}</div>
                      {yesNo(t.key)}
                    </div>
                  ))}
                </div>
              </div>

              {redFlag ? (
                <div className="mt-4 rounded-lg border p-3" style={{ borderColor: "#B31B1B", background: "#B31B1B18" }}>
                  <div className="text-sm font-bold" style={{ color: "#ef8f8f" }}>This is an emergency.</div>
                  <p className="mt-1 text-xs text-slate-300">A danger sign was reported. Do not schedule this as a normal service call — switch to the emergency intake now.</p>
                  <button type="button" onClick={onEmergency} className="mt-3 w-full rounded-md py-2 text-sm font-bold text-white" style={{ background: "#B31B1B" }}>Switch to Emergency</button>
                </div>
              ) : null}

              {triageComplete && !redFlag ? (
                <>
                  <div className="mt-4 border-t border-slate-800 pt-3">
                    <div className="text-sm font-semibold text-white">Details</div>
                    <span className={label}>Symptoms (their words)</span>
                    <textarea className={field} rows={2} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
                    <span className={label}>Breaker location known?</span>
                    <input className={field} value={breakerKnown} onChange={(e) => setBreakerKnown(e.target.value)} placeholder="e.g. garage panel" />
                    <span className={label}>When did it start?</span>
                    <input className={field} value={started} onChange={(e) => setStarted(e.target.value)} />
                    <span className={label}>What have they already tried?</span>
                    <input className={field} value={tried} onChange={(e) => setTried(e.target.value)} />
                    <span className={label}>Likely material needed</span>
                    <input className={field} value={material} onChange={(e) => setMaterial(e.target.value)} />
                    <span className={label}>New or returning customer</span>
                    <select className={field} value={customerStatus} onChange={(e) => setCustomerStatus(e.target.value)}>
                      <option value="">Select…</option>
                      <option value="new">New</option>
                      <option value="returning">Returning</option>
                    </select>
                    <span className={label}>How did they hear about us</span>
                    <input className={field} value={heardHow} onChange={(e) => setHeardHow(e.target.value)} />
                  </div>

                  <div className="mt-4 border-t border-slate-800 pt-3">
                    <div className="text-sm font-semibold text-white">Urgency &amp; schedule</div>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => setUrgency("urgent")} className={"flex-1 rounded-md px-3 py-1.5 text-xs font-semibold border " + (urgency === "urgent" ? "bg-amber-600 text-white border-transparent" : "text-slate-300 border-slate-600")}>Urgent (24–48h)</button>
                      <button type="button" onClick={() => setUrgency("standard")} className={"flex-1 rounded-md px-3 py-1.5 text-xs font-semibold border " + (urgency === "standard" ? "bg-slate-600 text-white border-transparent" : "text-slate-300 border-slate-600")}>Standard</button>
                    </div>
                    <span className={label}>Date *</span>
                    <input type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} />
                    <span className={label}>Start time</span>
                    <input className={field} value={time} onChange={(e) => setTime(e.target.value)} placeholder="e.g. 9:00 AM" />
                    <span className={label}>Time block</span>
                    <div className="flex gap-2">
                      {durToggle(2)}
                      {durToggle(4)}
                      {durToggle(8)}
                    </div>
                  </div>

                  {err ? <p className="mt-3 text-sm text-red-400">{err}</p> : null}
                  <button type="button" onClick={save} disabled={saving} className="mt-4 w-full rounded-md py-2.5 text-sm font-bold text-white disabled:opacity-60" style={{ background: "#1C5FA8" }}>{saving ? "Saving…" : "Save & add to calendar"}</button>
                </>
              ) : null}

              {err && (redFlag || !triageComplete) ? <p className="mt-3 text-sm text-red-400">{err}</p> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
