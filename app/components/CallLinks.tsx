"use client";

import { useState } from "react";
import EmergencyIntake from "./EmergencyIntake";
import ServiceCallIntake from "./ServiceCallIntake";

type CallKey =
  | "emergency"
  | "estimate"
  | "service_call"
  | "warranty_call"
  | "concern"
  | "question"
  | "material"
  | "absence";

const INFO: Record<CallKey, { label: string; color: string; text: string; blurb: string }> = {
  emergency: { label: "Emergency", color: "#F0302A", text: "#ffffff", blurb: "Safety first. Runs the emergency script, alerts the owner immediately, and dispatches the nearest tech." },
  estimate: { label: "Proposal", color: "#1BBF55", text: "#0b1220", blurb: "Price on new or larger work. Small = phone quote, medium = photos required, large = in-person job walk." },
  service_call: { label: "Service Call", color: "#2183E8", text: "#ffffff", blurb: "Something is broken. Runs the six-question safety triage first, then schedules a 2/4/8 block." },
  warranty_call: { label: "Warranty", color: "#FF9012", text: "#0b1220", blurb: "Problem with paid work under 12 months. Supervisor only, booked within 7 days." },
  concern: { label: "Concern / Complaint", color: "#F2BE00", text: "#0b1220", blurb: "Customer is unhappy. Guided five-step response; auto-escalates to the owner when needed." },
  question: { label: "Question", color: "#9B44CE", text: "#ffffff", blurb: "Info or comparing prices. Treated as a lead; every call ends with an offered next step." },
  material: { label: "Material", color: "#6E6E6E", text: "#ffffff", blurb: "Purchasing workflow. Tech lists it, admin approves and buys, a pickup code is issued." },
  absence: { label: "Absence", color: "#FF2E9A", text: "#ffffff", blurb: "Call-in or schedule change. Auto-classified by time; tracks the 90-day absence count." },
};

export default function CallLinks({ keys, companyId, userId }: { keys: CallKey[]; companyId: string; userId: string }) {
  const [open, setOpen] = useState<CallKey | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
        {keys.map((k) => {
          const info = INFO[k];
          return (
            <button type="button" key={k} onClick={() => setOpen(k)} className="w-full rounded-lg px-3 py-3.5 text-center text-sm font-extrabold uppercase tracking-wide shadow hover:brightness-110" style={{ background: info.color, color: info.text }}>{info.label}</button>
          );
        })}
      </div>

      {open === "emergency" ? (
        <EmergencyIntake companyId={companyId} userId={userId} onClose={() => setOpen(null)} />
      ) : open === "service_call" ? (
        <ServiceCallIntake companyId={companyId} userId={userId} onClose={() => setOpen(null)} onEmergency={() => setOpen("emergency")} />
      ) : open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(null)}>
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-white">{INFO[open].label}</h3>
              <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white">&times;</button>
            </div>
            <p className="mt-3 text-sm text-slate-300">{INFO[open].blurb}</p>
            <p className="mt-4 text-xs text-slate-500">This procedure is being built next.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
