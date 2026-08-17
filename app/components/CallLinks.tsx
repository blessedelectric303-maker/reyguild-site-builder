"use client";

import { useState } from "react";
import EmergencyIntake from "@/app/components/EmergencyIntake";
import ServiceCallIntake from "@/app/components/ServiceCallIntake";

export type CallKey =
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
  estimate: { label: "Estimate", color: "#1BBF55", text: "#0b1220", blurb: "Price on new or larger work. Small = phone quote, medium = photos required, large = in-person job walk." },
  service_call: { label: "Service Call", color: "#2183E8", text: "#ffffff", blurb: "Something is broken. Runs the six-question safety triage first, then schedules a 2/4/8 block." },
  warranty_call: { label: "Warranty", color: "#FF9012", text: "#0b1220", blurb: "Problem with paid work under 12 months. Supervisor only, booked within 7 days." },
  concern: { label: "Concern", color: "#F2BE00", text: "#0b1220", blurb: "Customer is unhappy. Guided five-step response; auto-escalates to the owner when needed." },
  question: { label: "Question", color: "#9B44CE", text: "#ffffff", blurb: "Info or comparing prices. Treated as a lead; every call ends with an offered next step." },
  material: { label: "Material", color: "#6E6E6E", text: "#ffffff", blurb: "Purchasing workflow. Tech lists it, admin approves and buys, a pickup code is issued." },
  absence: { label: "Absence", color: "#FF2E9A", text: "#ffffff", blurb: "Call-in or schedule change. Auto-classified by time; tracks the 90-day absence count." },
};

export default function CallLinks({ keys, companyId, userId }: { keys: CallKey[]; companyId?: string; userId?: string }) {
  const [open, setOpen] = useState<CallKey | null>(null);

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
      {keys.map((k) => {
        const info = INFO[k];
        return (
          <button type="button" key={k} onClick={() => setOpen(k)} className="w-full rounded-lg px-3 py-3.5 text-center text-sm font-extrabold uppercase tracking-wide shadow hover:brightness-110" style={{ background: info.color, color: info.text }}>{info.label}</button>
        );
      })}

      {open === "emergency" ? (
        <EmergencyIntake companyId={companyId} userId={userId} onClose={() => setOpen(null)} />
      ) : null}

      {open === "service_call" ? (
        <ServiceCallIntake companyId={companyId} userId={userId} onClose={() => setOpen(null)} onEmergency={() => setOpen("emergency")} />
      ) : null}

      {open && open !== "emergency" && open !== "service_call" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(null)}>
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: INFO[open].color }} />
              <h3 className="text-lg font-bold text-white">{INFO[open].label}</h3>
            </div>
            <p className="mt-2 text-sm text-slate-300">{INFO[open].blurb}</p>
            <p className="mt-4 text-xs text-slate-500">The full intake script, required fields, and workflow for this color are being built next.</p>
            <button type="button" onClick={() => setOpen(null)} className="mt-4 w-full rounded-md py-2 text-sm font-semibold text-slate-900" style={{ background: "#e0a82e" }}>Close</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
