// THE EIGHT CALL COLOURS - one definition, used everywhere.
//
// These used to be written out separately in CallLinks.tsx and in the
// procedure page. Two copies is how yellow ended up missing from the command
// center for weeks while it sat happily in the database. One copy now.
//
// A colour_tag on a procedure section points at a key in here. That is what
// makes a script or an SOP say "this one belongs to a warranty call".

export type CallKey =
  | "emergency"
  | "estimate"
  | "service_call"
  | "warranty_call"
  | "concern"
  | "question"
  | "material"
  | "absence";

export type CallColor = { label: string; bg: string; text: string };

export const CALL_COLORS: Record<CallKey, CallColor> = {
  emergency: { label: "Emergency", bg: "#F0302A", text: "#ffffff" },
  estimate: { label: "Proposal", bg: "#1BBF55", text: "#0b1220" },
  service_call: { label: "Service Call", bg: "#2183E8", text: "#ffffff" },
  warranty_call: { label: "Warranty", bg: "#FF9012", text: "#0b1220" },
  concern: { label: "Concern / Complaint", bg: "#F2BE00", text: "#0b1220" },
  question: { label: "Question", bg: "#9B44CE", text: "#ffffff" },
  material: { label: "Material", bg: "#6E6E6E", text: "#ffffff" },
  absence: { label: "Absence", bg: "#FF2E9A", text: "#ffffff" },
};

// The order they are shown in wherever a full set of colours is listed.
export const CALL_ORDER: CallKey[] = [
  "emergency",
  "service_call",
  "estimate",
  "warranty_call",
  "concern",
  "question",
  "material",
  "absence",
];

// Screens that are not a call type. The answering kit is the front door.
// SOPs and premade replies are reference shelves whose CONTENT is coloured,
// so the screens themselves stay neutral on purpose.
export const NON_CALL_COLORS: Record<string, CallColor> = {
  answering: { label: "The Answering Kit", bg: "#FFFFFF", text: "#0b1220" },
  sops: { label: "SOPs", bg: "#1E293B", text: "#ffffff" },
  replies: { label: "Scripts", bg: "#1E293B", text: "#ffffff" },
  // Clock In is a card the crew carries but it is not a call type. Without
  // an entry here its page had no skin, and a colour with no skin redirects
  // to "/" - which is exactly what it did.
  clockin: { label: "Clock In / Clock Out", bg: "#FFFFFF", text: "#0b1220" },

  // THE tech_ NAMES.
  // suite.procedures.color stores tech_emergency, tech_estimate and so on,
  // and the procedure page uses the URL for BOTH the skin lookup and the
  // database query. Strip the prefix and the row is not found; keep it and
  // the skin was not found - which is why every card redirected to "/".
  // Widening the map fixes it without renaming a single database row.
  tech_emergency: { label: "Emergency", bg: "#F0302A", text: "#ffffff" },
  tech_estimate: { label: "Proposal", bg: "#1BBF55", text: "#0b1220" },
  tech_service_call: { label: "Service Call", bg: "#2183E8", text: "#ffffff" },
  tech_warranty_call: { label: "Warranty", bg: "#FF9012", text: "#0b1220" },
  tech_concern: { label: "Concern / Complaint", bg: "#F2BE00", text: "#0b1220" },
  tech_question: { label: "Question", bg: "#9B44CE", text: "#ffffff" },
  tech_material: { label: "Material", bg: "#6E6E6E", text: "#ffffff" },
  tech_absence: { label: "Absence", bg: "#FF2E9A", text: "#ffffff" },
  tech_clockin: { label: "Clock In / Clock Out", bg: "#FFFFFF", text: "#0b1220" },
};

export function colorFor(key: string): CallColor | null {
  return (
    (CALL_COLORS as Record<string, CallColor>)[key] ||
    NON_CALL_COLORS[key] ||
    null
  );
}
