// The eight tech truck cards, and the colour each one wears.
//
// The keys are deliberately prefixed. A tech procedure is NOT the same row as
// the office procedure of the same colour - see the comment at the top of
// sql/16-tech-procedures.sql for why sharing them would have broken both the
// office page and the saved checklists.

import { CALL_COLORS, type CallKey } from "@/utils/callColors";

export type TechCard = {
  key: string;
  mirrors: CallKey | null;
  label: string;
  blurb: string;
  // Set only for cards that are not one of the eight call types.
  skin?: { bg: string; text: string };
};

export const TECH_CARDS: TechCard[] = [
  // First, and above the eight, because it is the first thing in the day.
  // Black: distinct from all eight call colours and from the slate the
  // reference shelves use, so it reads as its own thing at a glance.
  {
    key: "tech_clockin",
    mirrors: null,
    label: "Clock In",
    blurb: "How the day runs. Read this one first.",
    skin: { bg: "#000000", text: "#ffffff" },
  },
  { key: "tech_emergency", mirrors: "emergency", label: "Emergency", blurb: "Safe first, diagnosed second." },
  { key: "tech_service_call", mirrors: "service_call", label: "Service Call", blurb: "The full run card. Truck to driveway." },
  { key: "tech_estimate", mirrors: "estimate", label: "Site Visit", blurb: "The walk is the sale." },
  { key: "tech_warranty_call", mirrors: "warranty_call", label: "Warranty", blurb: "No charge, said early. Find the cause." },
  { key: "tech_concern", mirrors: "concern", label: "Complaint", blurb: "Let them finish. Tell the office same day." },
  { key: "tech_question", mirrors: "question", label: "Questions", blurb: "Answer what you know. Never a price." },
  { key: "tech_material", mirrors: "material", label: "Material", blurb: "You don't buy anything. Ever." },
  { key: "tech_absence", mirrors: "absence", label: "Calling Off", blurb: "Never silence. The office calls the customer." },
];

export function techCard(key: string): TechCard | null {
  return TECH_CARDS.find((c) => c.key === key) || null;
}

export function skinFor(card: TechCard) {
  if (card.skin) return card.skin;
  return CALL_COLORS[card.mirrors as CallKey];
}
