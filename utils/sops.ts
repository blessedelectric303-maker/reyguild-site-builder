// Central Help + SOP content for the whole suite.
// This is the ONE place to edit every guide. The command center and each app
// have their own entry, looked up automatically by the Settings menu based on
// which page you're on. To change any guide, edit the text below — nothing else.

export type Sop = {
  title: string; // shown as the heading on the SOPs tab
  steps: string[]; // short, plain-language points
};

// Support details shown on the Help tab everywhere.
// >>> EDIT THESE to your real support email / phone. <
// Leave phone as "" to hide the phone line.
export const SUPPORT = {
  email: "support@reyguild.com",
  phone: "",
  note: "We usually reply within one business day.",
};

// SOPs keyed by "context". The Settings menu picks the right one from the URL.
export const SOPS: Record<string, Sop> = {
  "command-center": {
    title: "Your Command Center — how it works",
    steps: [
      "This is home base. Each tile is one of your apps.",
      "The badge on a tile shows your access: green Active, amber Free trial, or gray Locked.",
      "Tap Open on any unlocked app to jump in.",
      "Your company logo sits in the center once you add it under Settings → Account → Company.",
      '"One Man Army" means solo; "Army Mode" means you have a team. Switch this and invite people under Team.',
      "Settings (this menu) sits in the top bar of every app, so it works the same everywhere.",
    ],
  },
  "site-builder": {
    title: "Site Builder — how to use it",
    steps: [
      "Build a simple website for your business — no coding.",
      "Fill in your business details, then pick the sections you want to show.",
      "Use the preview to see how it looks before you share it.",
      "Your company info flows in from your Company Profile, so you only type it once.",
      "Your work saves on this device. Use the same browser to pick up where you left off.",
    ],
  },
  estimating: {
    title: "Estimating & Invoicing — how to use it",
    steps: [
      "Create estimates and invoices for your jobs.",
      "Add line items with quantities and prices — totals add up for you.",
      "Save, print, or send the finished estimate or invoice to your customer.",
      "Turn an approved estimate into an invoice when the work is done.",
      "Your work saves on this device. Use the same browser to keep your history.",
    ],
  },
  "field-log": {
    title: "Client Outreach — how to use it",
    steps: [
      "Keep track of the clients and leads you're working.",
      "Log each visit or call so nothing slips through the cracks.",
      "Set follow-ups so you always know who to contact next.",
      "Review your list before the week starts to plan your outreach.",
      "Your work saves on this device. Use the same browser to keep your log.",
    ],
  },
  default: {
    title: "How to use this app",
    steps: [
      "Everything you need is on this screen.",
      "Your work saves on this device — use the same browser to keep it.",
      "Use the Help tab in this menu if you get stuck.",
    ],
  },
};

// Map a page path to a context key. Add future apps here.
export function contextFromPath(pathname: string): string {
  if (pathname.startsWith("/apps/site-builder")) return "site-builder";
  if (pathname.startsWith("/apps/estimating")) return "estimating";
  if (pathname.startsWith("/apps/field-log")) return "field-log";
  if (pathname === "/" || pathname === "") return "command-center";
  return "default";
}

export function sopFor(context: string): Sop {
  return SOPS[context] || SOPS.default;
}
