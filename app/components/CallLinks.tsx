"use client";

import { useRouter } from "next/navigation";
import { CALL_COLORS, type CallKey } from "@/utils/callColors";

export type { CallKey };

// The label and the colour now live in utils/callColors.ts so that the
// command center, the procedure header and the coloured tags on the SOPs and
// the premade replies can never drift apart. Only the hover blurb is local.
const BLURB: Record<CallKey, string> = {
  emergency: "Safety first. Runs the emergency script, alerts the owner immediately, and dispatches the nearest tech.",
  estimate: "Price on new or larger work. Small = phone quote, medium = photos required, large = in-person job walk.",
  service_call: "Something is broken. Runs the six-question safety triage first, then schedules a 2/4/8 block.",
  warranty_call: "Problem with paid work under 12 months. Supervisor only, booked within 7 days.",
  concern: "Customer is unhappy. Guided five-step response; auto-escalates to the owner when needed.",
  question: "Info or comparing prices. Treated as a lead; every call ends with an offered next step.",
  material: "Purchasing workflow. Tech lists it, admin approves and buys, a pickup code is issued.",
  absence: "Call-in or schedule change. Auto-classified by time; tracks the 90-day absence count.",
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
        const info = CALL_COLORS[k];
        return (
          <button type="button" key={k} title={BLURB[k]} onClick={() => router.push("/procedures/" + k)} className="w-full rounded-lg px-3 py-3.5 text-center text-sm font-extrabold uppercase tracking-wide shadow hover:brightness-110" style={{ background: info.bg, color: info.text }}>{info.label}</button>
        );
      })}
    </div>
  );
}
