"use client";

import { useState } from "react";
import EmergencyIntake from "@/app/components/EmergencyIntake";

export type CallKey =
  | "emergency"
  | "estimate"
  | "service_call"
  | "warranty_call"
  | "concern"
  | "question"
  | "material"
  | "absence";

const INFO: Record<CallKey, { label: string; color: string; blurb: string }> = {
  emergency: { label: "Emergency", color: "#B31B1B", blurb: "Safety first. Runs the emergency script, alerts the owner immediately, and dispatches the nearest tech." },
  estimate: { label: "Estimate", color: "#1B7A3D", blurb: "Price on new or larger work. Small = phone quote, medium = photos required, large = in-person job walk." },
  service_call: { label: "Service Call", color: "#1C5FA8", blurb: "Something is broken. Runs the six-question safety triage first, then schedules a 2/4/8 block." },
  warranty_call: { label: "Warranty", color: "#B85C00", blurb: "Problem with paid work under 12 months. Supervisor only, booked within 7 days." },
  concern: { label: "Concern", color: "#8A6A00", blurb: "Customer is unhappy. Guided five-step response; auto-escalates to the owner when needed." },
  question: { label: "Question", color: "#6B2E8F", blurb: "Info or comparing prices. Treated as a lead — every call ends with an offered next step." },
  material: { label: "Material", color: "#4A4A4A", blurb: "Purchasing workflow. Tech lists it, admin approves and buys, a pickup code is issued." },
  absence: { label: "Absence", color: "#B01560", blurb: "Call-in or schedule change. Auto-classified by time; tracks the 90-day absence count." },
};

export default function CallLinks({ keys, companyId, userId }: { keys: CallKey[]; companyId?: string; userId?: string }) {
  const [open, setOpen] = useState<CallKey | null>(null);

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
      {keys.map((k) => {
        const info = INFO[k];
        return (
          <button type="button" key={k} onClick={() => setOpen(k)} className="rounded-lg px-3 py-2.5 text-center text-xs font-bold text-white shadow hover:brightness-110" style={{ background: info.color }}>{info.label}</button>
        );
      })}

      {open === "emergency" ? (
        <EmergencyIntake companyId={companyId} userId={userId} onClose={() => setOpen(null)} />
      ) : null}

      {open && open !== "emergency" ? (
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
