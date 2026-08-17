"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

// Wording you can edit anytime — these are the scripts the admin reads aloud.
const SAFETY_SCRIPT = [
  "First — are you or anyone else in any danger right now?",
  "If you see flames or smoke, or someone has been shocked or hurt: hang up and call 911 now, then call us back.",
  "If it is safe to reach, turn the power off at your main breaker panel (the large switch at the top).",
  "Do not touch anything that is sparking, burning, hot, or wet.",
  "Stay clear of the area and keep everyone else away until our technician arrives.",
];

const SCRIPT_911 =
  "This is beyond what we can safely handle over the phone. Please hang up and dial 911 now — tell them it is an electrical emergency. Once you are safe, call us back and we will get a technician to you right away.";

export default function EmergencyIntake({
  companyId,
  userId,
  onClose,
}: {
  companyId?: string;
  userId?: string;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [show911, setShow911] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [callerName, setCallerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [need, setNeed] = useState("");
  const [heardHow, setHeardHow] = useState("");
  const [customerStatus, setCustomerStatus] = useState("");
  const [instructed, setInstructed] = useState("");
  const [called911, setCalled911] = useState("");
  const [powerKilled, setPowerKilled] = useState("");
  const [techDispatched, setTechDispatched] = useState("");
  const [eta, setEta] = useState("");

  async function save() {
    setErr(null);
    if (!callerName.trim() || !phone.trim() || !address.trim()) {
      setErr("Caller name, phone, and address are required.");
      return;
    }
    if (!companyId) {
      setErr("No company found.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.schema("suite").from("calls").insert({
      company_id: companyId,
      call_type: "emergency",
      caller_name: callerName.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      address: address.trim(),
      need: need.trim() || null,
      urgency: "emergency",
      safety_issue: true,
      heard_how: heardHow.trim() || null,
      customer_status: customerStatus || null,
      details: {
        instructed: instructed.trim(),
        called_911: called911,
        power_killed: powerKilled,
        tech_dispatched: techDispatched.trim(),
        eta: eta.trim(),
      },
      taken_by: userId || null,
    });
    setSaving(false);
    if (error) {
      setErr("Couldn't save: " + error.message);
      return;
    }
    setSaved(true);
    setTimeout(onClose, 1200);
  }

  const field = "w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100";
  const label = "block text-xs uppercase tracking-wide text-slate-400 mt-3 mb-1";

  const yesNo = (val: string, set: (v: string) => void) => (
    <div className="flex gap-2">
      <button type="button" onClick={() => set("yes")} className={"flex-1 rounded-md px-3 py-1.5 text-xs font-semibold border " + (val === "yes" ? "bg-emerald-600 text-white border-transparent" : "text-slate-300 border-slate-600")}>Yes</button>
      <button type="button" onClick={() => set("no")} className={"flex-1 rounded-md px-3 py-1.5 text-xs font-semibold border " + (val === "no" ? "bg-slate-600 text-white border-transparent" : "text-slate-300 border-slate-600")}>No</button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-3 sm:items-center" onClick={onClose}>
      <div className="mt-4 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:mt-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3" style={{ background: "#B31B1B" }}>
          <div className="text-base font-extrabold text-white">EMERGENCY — SAFETY FIRST</div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-white/90 hover:bg-white/20">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {saved ? (
            <div className="text-center py-8 text-emerald-400 font-semibold">Emergency call logged.</div>
          ) : (
            <>
              <div className="rounded-lg border p-3" style={{ borderColor: "#B31B1B", background: "#B31B1B12" }}>
                <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "#ef8f8f" }}>Read this to the caller first</div>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-200">
                  {SAFETY_SCRIPT.map((line, i) => (
                    <li key={i} className="flex gap-2"><span style={{ color: "#ef4444" }}>•</span><span>{line}</span></li>
                  ))}
                </ul>
                <button type="button" onClick={() => setShow911(!show911)} className="mt-3 w-full rounded-md py-2 text-sm font-bold text-white" style={{ background: "#7f1010" }}>{show911 ? "Hide 911 script" : "Need 911? Tap for script"}</button>
                {show911 ? <p className="mt-2 text-sm text-amber-200">{SCRIPT_911}</p> : null}
              </div>

              <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/40 p-3 text-xs text-slate-300">
                <span className="font-bold text-slate-100">Never on an emergency:</span> quote a price · charge a material pickup fee · tell the caller we are booked.
              </div>

              <span className={label} style={{ marginTop: "1rem" }}>Caller name *</span>
              <input className={field} value={callerName} onChange={(e) => setCallerName(e.target.value)} />
              <span className={label}>Best phone *</span>
              <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} />
              <span className={label}>Email</span>
              <input className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
              <span className={label}>Service address *</span>
              <input className={field} value={address} onChange={(e) => setAddress(e.target.value)} />
              <span className={label}>What is happening (their words)</span>
              <textarea className={field} rows={2} value={need} onChange={(e) => setNeed(e.target.value)} />

              <span className={label}>New or returning customer</span>
              <select className={field} value={customerStatus} onChange={(e) => setCustomerStatus(e.target.value)}>
                <option value="">Select…</option>
                <option value="new">New</option>
                <option value="returning">Returning</option>
              </select>
              <span className={label}>How did they hear about us</span>
              <input className={field} value={heardHow} onChange={(e) => setHeardHow(e.target.value)} />

              <div className="mt-4 border-t border-slate-800 pt-3">
                <div className="text-sm font-semibold text-white">Emergency specifics</div>
                <span className={label}>What the customer was told to do</span>
                <textarea className={field} rows={2} value={instructed} onChange={(e) => setInstructed(e.target.value)} />
                <span className={label}>Was 911 called?</span>
                {yesNo(called911, setCalled911)}
                <span className={label}>Was power killed at the breaker?</span>
                {yesNo(powerKilled, setPowerKilled)}
                <span className={label}>Tech dispatched</span>
                <input className={field} value={techDispatched} onChange={(e) => setTechDispatched(e.target.value)} />
                <span className={label}>ETA given to customer</span>
                <input className={field} value={eta} onChange={(e) => setEta(e.target.value)} />
              </div>

              {err ? <p className="mt-3 text-sm text-red-400">{err}</p> : null}
              <button type="button" onClick={save} disabled={saving} className="mt-4 w-full rounded-md py-2.5 text-sm font-bold text-white disabled:opacity-60" style={{ background: "#B31B1B" }}>{saving ? "Saving…" : "Log emergency call"}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
