"use client";

import { useRouter } from "next/navigation";
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
  estimate: { label: "Proposal", color: "#1BBF55", text: "#0b1220", blurb: "Price on new or larger work. Small = phone quote, medium = photos required, large = in-person job walk." },
  service_call: { label: "Service Call", color: "#2183E8", text: "#ffffff", blurb: "Something is broken. Runs the six-question safety triage first, then schedules a 2/4/8 block." },
  warranty_call: { label: "Warranty", color: "#FF9012", text: "#0b1220", blurb: "Problem with paid work under 12 months. Supervisor only, booked within 7 days." },
  concern: { label: "Concern / Complaint", color: "#F2BE00", text: "#0b1220", blurb: "Customer is unhappy. Guided five-step response; auto-escalates to the owner when needed." },
  question: { label: "Question", color: "#9B44CE", text: "#ffffff", blurb: "Info or comparing prices. Treated as a lead; every call ends with an offered next step." },
  material: { label: "Material", color: "#6E6E6E", text: "#ffffff", blurb: "Purchasing workflow. Tech lists it, admin approves and buys, a pickup code is issued." },
  absence: { label: "Absence", color: "#FF2E9A", text: "#ffffff", blurb: "Call-in or schedule change. Auto-classified by time; tracks the 90-day absence count." },
};

export default function CallLinks({ keys, companyId, userId }: { keys: CallKey[]; companyId?: string; userId?: string }) {
  const router = useRouter();

  // Every color opens its procedure. Which ones actually HAVE one is a
  // database question, not a code question - there used to be a hardcoded
  // list of four here and it silently hid yellow long after yellow existed.
  // A color with nothing written yet lands on the procedure page's own
  // "not set up yet" message, which is the honest answer.
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
      {keys.map((k) => {
        const info = INFO[k];
        return (
          <button type="button" key={k} title={info.blurb} onClick={() => router.push("/procedures/" + k)} className="w-full rounded-lg px-3 py-3.5 text-center text-sm font-extrabold uppercase tracking-wide shadow hover:brightness-110" style={{ background: info.color, color: info.text }}>{info.label}</button>
        );
      })}
    </div>
  );
}
