import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
const CREST = "data:image/png;base64,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";

// ─────────────────────────────────────────────────────────────────────────────
// FIELD LOG — Sales Rep outreach + weekly rollup (starter shell)
//
// Daily Logs : each visit captures the full Outreach Log + Follow-Up Notes.
// Weekly Logs: every rep's visits are auto-totaled into the Weekly Rep Summary,
//              one card per employee, for whatever week you pick.
//
// Data persists across sessions via window.storage (key: crm_visits).
// Everything here is meant to be edited — fields, statuses, the hot-lead rule, etc.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "crm_visits";
const PEOPLE_KEY = "crm_people";
const INVOICES_KEY = "crm_invoices";
const BUSINESS_KEY = "crm_business";
const MESSAGES_KEY = "crm_messages";
const defaultBusiness = () => ({
  name: "", email: "", phone: "", address: "", website: "", logo: "", signature: "",
  introSubject: "Following up from {business}",
  introBody: "Hi {contact},\n\nThanks for taking the time with us. {business} would love to help with your project — when's a good time to connect?\n\n{signature}",
  followSubject: "Checking back in — {business}",
  followBody: "Hi {contact},\n\nJust circling back to see if you'd like to move forward. Happy to answer any questions.\n\n{signature}",
});
function fillTemplate(str, v, biz) {
  return (str || "")
    .split("{business}").join(biz.name || "our team")
    .split("{rep}").join(v.rep || "")
    .split("{company}").join(v.company || "")
    .split("{contact}").join(v.dmName || "there")
    .split("{signature}").join(biz.signature || biz.name || "");
}
const COMMISSION_RATE = 0.10; // rep royalty: 10% on an approved job they walked in
const COMMISSION_BASE = "total"; // "profit" or "total" — what the 10% is calculated on
const BONUS_CONTACT = 10;     // $ paid when a rep captures the decision-maker's contact info
const BONUS_MEETING = 50;     // $ paid when a rep sets a meeting
const CAD_EMAIL1 = 5;   // days after email captured → send intro email
const CAD_EMAIL2 = 10;  // days after email captured → send follow-up email
const CAD_CALL = 15;    // days after email captured → notify rep to call in person
const CAD_WALKIN_AFTER_CALL = 5; // days after the logged call → notify rep to walk in
const MANAGER_SOP = {
  id: "manager", title: "Manager Daily SOP (you)",
  intro: "Your morning routine. Log in, open Home, and work top to bottom — this is how you keep the team on follow-ups and the money verified.",
  items: [
    { h: "1 · Check who's behind", p: "On the Home dashboard, look at “Follow-ups behind.” These reps are 3+ days late on a touch for a job." },
    { h: "2 · Ask why", p: "For each one, hit “Email rep” — it opens a pre-filled note asking why the follow-up is overdue and what the plan is." },
    { h: "3 · Clear dead leads", p: "If the prospect is no longer with us or not worth chasing, hit “Dismiss” to remove the notification so the board stays clean and accurate." },
    { h: "4 · Verify the money", p: "Go to Approvals and verify every pending commission, decision-maker contact, and meeting bonus. Nothing pays a rep until you check it off." },
    { h: "5 · Check quotas", p: "Back on Home, review “Team quota today.” Make sure each rep is on pace for their daily location count. Follow up with anyone falling short." },
    { h: "6 · Catch new meetings", p: "A scheduled meeting shows as a big alert at the top of Home — verify the bonus and make sure the meeting is on the calendar." },
  ],
};
const SUPPORT_EMAIL = "support@reyguild.com";
const NOREPLY_EMAIL = "noreply@reyguild.com";
const LEGAL = {
  terms: "https://reyguild.com/terms",
  privacy: "https://reyguild.com/privacy",
  conditions: "https://reyguild.com/terms-and-conditions",
  cookies: "https://reyguild.com/cookie-policy",
};
const BILLING_PORTAL = "https://billing.reyguild.com"; // swap for your Stripe customer-portal link
const HELP_ARTICLES = [
  { id: "start", title: "Getting started", body: "Use the “Acting as” menu at the top right to switch between Owner, Admin, and Sales Rep views. Owners add the team on the Employees tab. Everyone lands on Home, where you can search any address before heading out." },
  { id: "logging", title: "Logging a visit", body: "Open Daily Logs and fill in who went out, the type of contact (walk-in, call, or email), the business, the contact, and the outcome. Mark the payable items — decision-maker contact captured and meeting set — if you got them." },
  { id: "address", title: "Searching and claiming an address", body: "On Home, search any street address to see who's already been there and read their notes so you don't double up. “Put my name on it” claims the address; the most recent claim owns the 10% royalty when that job's invoice comes in." },
  { id: "commissions", title: "How commissions work", body: "A rep earns 10% of the total approved job for any address they own. Upload your invoices CSV (address + total) on the Commissions tab and each row links to the owning rep automatically. Commissions must be verified on the Approvals tab before they pay." },
  { id: "bonuses", title: "Contact and meeting bonuses", body: "Reps earn $10 for capturing a decision-maker's contact (needs their name plus a phone or email) and $50 for setting a meeting (needs who it's with and a date). Both must be verified by an Owner or Admin before they pay." },
  { id: "cadence", title: "The follow-up sequence", body: "When a job has an email, the sequence starts automatically: an intro email at day 5, a follow-up at day 10, a reminder to call in person at day 15, and a walk-in 5 days after that call. Each step must be logged with the date and what happened — not just dismissed." },
  { id: "approvals", title: "Verifying and approvals", body: "Owners and Admins verify commissions, contact bonuses, and meeting bonuses on the Approvals tab. Nothing pays until it's checked off. A scheduled meeting shows as a big alert on the Home dashboard." },
  { id: "quota", title: "Daily location quotas", body: "Owners and Admins set a daily location quota per rep on the Employees tab. Reps see their own progress on Home; admins see the whole team's progress for the day." },
  { id: "business", title: "Business profile and email templates", body: "Owners set the company name, logo, contact info, signature, and the intro/follow-up email templates on the Business tab. These brand the automated follow-up emails that go out on the cadence." },
  { id: "scripts", title: "Field scripts (SOPs)", body: "The SOPs tab has your walk-in script, cold-call script, and follow-up-call script, plus how to present yourself. Always write your name on the back of every card so the lead traces back to you and you get credit." },
  { id: "billing", title: "Subscription and billing", body: "Manage your plan on the Account tab — you can pause or cancel any time. Legal terms are linked in the footer at the bottom of every page." },
  { id: "manager", title: "Manager daily routine", body: "Owners and Admins: each morning, open Home and work the Follow-ups behind panel — email reps who are 3+ days late, or dismiss dead leads — then verify everything on Approvals and check Team quota. The full checklist is on the SOPs tab under Manager Daily SOP." },
  { id: "dismiss", title: "Dismissing a dead lead", body: "If a prospect is no longer worth chasing, an Owner or Admin can hit Dismiss on the Follow-ups behind panel on Home. The job stops sending notifications and drops off the active board." },
  { id: "theme", title: "Dark or light mode", body: "Open the Settings tab to switch between light mode (cream background) and dark mode (navy background). Your choice is remembered on this device." },
  { id: "support", title: "Contacting support", body: "Search this help center first. If you still need help, use the support form at the bottom of the Help tab — give us your name, email, and which app you're asking about — and it goes straight to support@reyguild.com." },
];
const APP_OPTIONS = ["ReyGuild CRM — Outreach & Commissions", "ReyGuild Invoicing", "Other"];
const STEP_KEY = { email1: "email1At", email2: "email2At", call: "calledAt", walkin: "walkinAt" };
const STEP_LABEL = { email1: "Intro email", email2: "Follow-up email", call: "Call", walkin: "Walk-in" };
const STEP_ACTION = { email1: "Log email sent", email2: "Log email sent", call: "Log the call", walkin: "Log the walk-in" };
const STEP_OUTCOMES = {
  email1: ["Sent", "Bounced / bad email"],
  email2: ["Sent", "Bounced / bad email"],
  call: ["No answer", "Left voicemail", "Spoke — interested", "Set a meeting", "Not interested"],
  walkin: ["Nobody available", "Spoke — interested", "Set a meeting", "Not interested"],
};
const SOP_SECTIONS = [
  {
    id: "prep", title: "Before You Walk In",
    intro: "How to show up. The goal is NOT to sell and NOT to pressure anyone — it's to introduce your company, gather information, build the relationship, and become a familiar name when service is needed.",
    items: [
      { h: "Arrive ready", p: "Dressed professionally · with a smile · confident and respectful · carrying business cards · carrying flyers for your target customer." },
      { h: "Write your name on every card", p: "Before you hand a card out, write your name on the back. If a prospect calls back later, that's how the lead is traced to you — and how you get your commission or royalty. No name = no way to verify the lead source. Make it a habit." },
      { h: "Keep it short", p: "Don't sell. Don't pressure. Introduce, gather information, build the relationship, and keep moving." },
    ],
  },
  {
    id: "walkin", title: "Walk-In Script",
    intro: "Your opener and exactly how to handle each response.",
    items: [
      { h: "Initial contact", say: `Hi, my name is ____ with ____. We provide ____ services in the area for businesses like yours. I was wondering if you could point me in the direction of whoever makes the decisions regarding your service vendors?` },
      { h: `If they say: "They're not here right now."`, say: `No problem at all. Would you happen to have their contact information so I can introduce myself personally and learn about your vendor application process?`, log: ["Name", "Phone number", "Email", "Position", "Follow-up date"], after: "Leave a business card and flyer. Thank them for their time." },
      { h: `If they say: "I can't give out that information."`, say: `I completely understand. Would you happen to know when they'll be available so I can stop by and introduce myself in person?`, log: ["Decision maker name (if available)", "Best time to return", "Follow-up date"], after: "Leave a business card and flyer. Thank them for their time." },
      { h: "If they bring out the decision maker", say: `Hi, my name is ____ with ____. We provide ____ services throughout the area. I just wanted to introduce myself and make our company available if you ever need us. I understand you may already have vendors you work with, and we're not here to replace anyone. We'd simply like the opportunity to introduce ourselves and be another reliable resource if you ever need support.`, after: "Hand them a business card and flyer. Pause and let them respond." },
      { h: `If the decision maker says: "We already have someone."`, say: `That's great. Most businesses do. I'd still love to leave my information in case you ever need another option, additional support, emergency service, or a second opinion down the road.`, after: "Hand them your card and flyer." },
      { h: `If they ask: "What makes you different?"`, say: `Reliable communication, professional service, and being available when our customers need us. We focus on building long-term relationships and helping our customers avoid downtime whenever possible.` },
      { h: "End every conversation", say: `Thank you for your time, I appreciate it. If you ever need anything, we'd be happy to help.`, after: "Leave your card and flyer. Log the interaction immediately in Daily Logs." },
    ],
  },
  {
    id: "call", title: "Cold / Intro Call Script",
    intro: "Same goal as the walk-in — introduce, get on the vendor list, gather contact info. Not a sales pitch.",
    items: [
      { h: "Opening", say: `Hi, this is ____ with ____. We provide ____ services for businesses in your area. I'm not calling to sell you anything — I just wanted to introduce our company and ask who handles your service vendors, so I can learn about your vendor application process?` },
      { h: "If you reach a gatekeeper", say: `No problem at all. Could I get the best name and email for whoever handles vendors? I'd like to introduce myself and ask about getting on your vendor list.`, log: ["Name", "Phone", "Email", "Position", "Follow-up date"] },
      { h: "If you reach the decision maker", say: `Thanks for taking a minute. We provide ____ services in the area and I wanted to introduce us as another reliable option if you ever need support. I know you likely have vendors already — we'd just like to be on your list for backup, emergencies, or a second opinion. Is there a vendor application I should complete?`, log: ["Decision maker name", "Vendor application requested?", "Follow-up date"] },
      { h: `If "We already have someone."`, say: `That's great — most businesses do. I'd still love to be on your list as a backup option. No pressure, just here if you ever need us.` },
      { h: "Close", say: `I appreciate your time. I'll follow up as we discussed. Have a great day.`, after: "Log the call and outcome in My Jobs." },
    ],
  },
  {
    id: "followup", title: "Follow-Up Call Script",
    intro: "When a scheduled follow-up comes due. Reference the last touch and move it one step forward.",
    items: [
      { h: "Opening", say: `Hi ____, this is ____ with ____. We connected on ____ when I stopped by. I'm just following up like I promised — wanted to make sure you had our information.` },
      { h: "Move it forward", say: `Is there a vendor application process I should complete to get on your approved list? I'm happy to send over anything you need.`, log: ["Vendor application requested?", "Next step", "Follow-up date"] },
      { h: "If it's not a good time", say: `Totally understand. When's a better time to circle back? I'll make a note and reach out then.`, log: ["Best time to follow up", "Follow-up date"] },
      { h: "Close", say: `Thanks again for your time. We're here whenever you need us.`, after: "Log the outcome so the next follow-up is scheduled." },
    ],
  },
];
const ROLES = ["Owner", "Admin", "Sales Rep"];
const ROLE_COLOR = { Owner: "var(--amber-deep)", Admin: "var(--blue)", "Sales Rep": "var(--ink-2)" };
const STATUSES = ["New", "Following up", "Quoted", "Won", "Lost"];
const FOLLOWUPS = ["None", "Call", "Email", "In-person"];
const CONTACT_TYPES = ["Walk-In", "Call", "Email"];
const HOT_LEAD_MIN = 8; // interest level at or above this counts as a hot lead

const STATUS_COLOR = {
  "New": "var(--blue)",
  "Following up": "var(--amber-deep)",
  "Quoted": "var(--ink-2)",
  "Won": "var(--gold)",
  "Lost": "var(--red)",
};

const emptyForm = () => ({
  id: null,
  visitDate: toLocalInput(new Date()),
  rep: "",
  contactType: "Walk-In",
  company: "",
  address: "",
  cityStateZip: "",
  industry: "",
  contact: "",
  position: "",
  phone: "",
  email: "",
  decisionMaker: "",
  decisionMakerReached: "",
  interested: "",
  interestLevel: "",
  vendorAppRequested: "",
  status: "New",
  followUpNeeded: "",
  followUpType: "None",
  followUpDate: "",
  nextAction: "",
  dmContactCaptured: "",
  dmName: "",
  dmPhone: "",
  dmEmail: "",
  contactApproved: false,
  meetingSet: "",
  meetingWith: "",
  meetingAt: "",
  meetingFor: "",
  meetingApproved: false,
  cadenceStart: "",
  email1At: "",
  email2At: "",
  calledAt: "",
  walkinAt: "",
  notes: "",
});

const emptyPerson = () => ({ id: null, name: "", role: "Sales Rep", address: "", email: "", quota: 0 });
const emptyInvoice = () => ({ id: null, invoiceNo: "", date: "", company: "", address: "", total: "", profit: "", repOverride: "", approved: false });

function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fmtVisit(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function fmtDate(s) {
  if (!s) return "";
  const d = new Date(s + "T00:00:00");
  if (isNaN(d)) return s;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function isDue(v) {
  if (!v.followUpDate || v.status === "Won" || v.status === "Lost") return false;
  return new Date(v.followUpDate + "T23:59:59") <= new Date();
}

// ── Red-flag rule ────────────────────────────────────────────────────────────
const FLAG_AFTER_DAYS = 3;   // flag a job once it's been this many days since last activity
const MAX_FOLLOWUPS = 5;     // after this many follow-ups, the flag stops showing
function toTs(s) {
  if (!s) return 0;
  const d = new Date(s.length <= 10 ? s + "T12:00:00" : s);
  return isNaN(d) ? 0 : d.getTime();
}
function followUps(v) { return Array.isArray(v.followUps) ? v.followUps : []; }
function followUpCount(v) { return followUps(v).length; }
function lastActivity(v) {
  const ts = [toTs(v.visitDate), ...followUps(v).map((f) => toTs(f.date))].filter(Boolean);
  return ts.length ? Math.max(...ts) : 0;
}
function daysSince(ts) { return ts ? Math.floor((Date.now() - ts) / 86400000) : 999; }
function isFlagged(v) {
  if (v.dismissed || v.status === "Won" || v.status === "Lost") return false;
  if (followUpCount(v) >= MAX_FOLLOWUPS) return false;
  return daysSince(lastActivity(v)) >= FLAG_AFTER_DAYS;
}
function money(n) { return "$" + (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function contactValid(v) { return v.dmContactCaptured === "Yes" && (v.dmName || "").trim() && ((v.dmPhone || "").trim() || (v.dmEmail || "").trim()); }
function meetingValid(v) { return v.meetingSet === "Yes" && (v.meetingWith || "").trim() && (v.meetingAt || "").trim(); }
function contactPaid(v) { return contactValid(v) && v.contactApproved === true; }
function meetingPaid(v) { return meetingValid(v) && v.meetingApproved === true; }
function jobEmail(v) { return (v.dmEmail || v.email || "").trim(); }
function cadenceAnchor(v) { return jobEmail(v) ? toTs(v.cadenceStart || v.visitDate) : 0; }
function cadenceStatus(v) {
  const anchor = cadenceAnchor(v);
  if (!anchor || v.dismissed || v.status === "Won" || v.status === "Lost") return null;
  const D = 86400000, now = Date.now(), at = (n) => anchor + n * D;
  if (!v.email1At) return { step: "email1", label: "Intro email", due: at(CAD_EMAIL1), ready: now >= at(CAD_EMAIL1) };
  if (!v.email2At) return { step: "email2", label: "Follow-up email", due: at(CAD_EMAIL2), ready: now >= at(CAD_EMAIL2) };
  if (!v.calledAt) return { step: "call", label: "Call the business in person", due: at(CAD_CALL), ready: now >= at(CAD_CALL), warn: true };
  if (!v.walkinAt) { const wd = toTs(v.calledAt) + CAD_WALKIN_AFTER_CALL * D; return { step: "walkin", label: "Walk-in visit", due: wd, ready: now >= wd, warn: true }; }
  return { step: "done", label: "Sequence complete" };
}
function normAddr(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln|court|ct|suite|ste|unit|apt|number|no)\b/g, " ")
    .replace(/\s+/g, " ").trim();
}
function cleanNum(v) { const n = parseFloat((v ?? "").toString().replace(/[^0-9.\-]/g, "")); return isNaN(n) ? "" : n; }
function toISODate(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return v;
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function guessMap(fields) {
  const find = (re) => fields.find((f) => re.test(f.toLowerCase())) || "";
  return {
    address: find(/address|addr|job ?site|location|street/),
    profit: find(/profit|margin|\bnet\b/),
    total: find(/total|amount|revenue|gross|price|sale/),
    invoice: fields.find((f) => /invoice|inv\b|inv #|inv#/.test(f.toLowerCase()) && !/total|amount|profit|price/.test(f.toLowerCase())) || "",
    date: find(/date/),
    company: find(/company|customer|client|business/),
  };
}
function weekBounds(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay()); // back to Sunday
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
function statsFor(list) {
  const c = (fn) => list.filter(fn).length;
  return {
    contacted: list.length,
    walkins: c((v) => v.contactType === "Walk-In"),
    calls: c((v) => v.contactType === "Call"),
    emails: c((v) => v.contactType === "Email"),
    dmReached: c((v) => v.decisionMakerReached === "Yes"),
    vendorApps: c((v) => v.vendorAppRequested === "Yes"),
    followUps: c((v) => v.followUpNeeded === "Yes"),
    hot: c((v) => Number(v.interestLevel) >= HOT_LEAD_MIN),
    closed: c((v) => v.status === "Won"),
  };
}
const METRICS = [
  ["contacted", "Businesses Contacted"],
  ["walkins", "Walk-Ins Completed"],
  ["calls", "Calls Made"],
  ["emails", "Emails Sent"],
  ["dmReached", "Decision Makers Reached"],
  ["vendorApps", "Vendor Apps Requested"],
  ["followUps", "Follow-Ups Needed"],
  ["hot", "Hot Leads"],
  ["closed", "Closed Jobs"],
];

export default function FieldLogCRM() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState("home");
  const [navOpen, setNavOpen] = useState(false);
  const [setOpen, setSetOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState("");
  const [form, setForm] = useState(emptyForm());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(true);
  const [confirmId, setConfirmId] = useState(null);
  const [weekAnchor, setWeekAnchor] = useState(toLocalInput(new Date()).slice(0, 10));
  const [openEmp, setOpenEmp] = useState(null);
  const [people, setPeople] = useState([]);
  const [pform, setPform] = useState(emptyPerson());
  const [pError, setPError] = useState("");
  const [pConfirmId, setPConfirmId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [fuOpen, setFuOpen] = useState(null);
  const [fuDraft, setFuDraft] = useState({ date: "", type: "Call", note: "" });
  const [invoices, setInvoices] = useState([]);
  const [invForm, setInvForm] = useState(emptyInvoice());
  const [invError, setInvError] = useState("");
  const [invConfirmId, setInvConfirmId] = useState(null);
  const [printTarget, setPrintTarget] = useState("ALL");
  const [csvData, setCsvData] = useState(null);
  const [csvMap, setCsvMap] = useState({ address: "", profit: "", total: "", invoice: "", date: "", company: "" });
  const [csvError, setCsvError] = useState("");
  const csvInputRef = useRef(null);
  const [addrQuery, setAddrQuery] = useState("");
  const [claimOpen, setClaimOpen] = useState(null);
  const [claimNote, setClaimNote] = useState("");
  const [claimRep, setClaimRep] = useState("");
  const [logOpen, setLogOpen] = useState(null);
  const [logDate, setLogDate] = useState("");
  const [logOutcome, setLogOutcome] = useState("");
  const [business, setBusiness] = useState(defaultBusiness());
  const [bizForm, setBizForm] = useState(defaultBusiness());
  const bizLogoRef = useRef(null);
  const [sopOpen, setSopOpen] = useState("prep");
  const [helpQuery, setHelpQuery] = useState("");
  const [helpOpen, setHelpOpen] = useState(null);
  const [billingNote, setBillingNote] = useState("");
  const [theme, setTheme] = useState("light");
  const [supName, setSupName] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supApp, setSupApp] = useState(APP_OPTIONS[0]);
  const [supMsg, setSupMsg] = useState("");
  const formRef = useRef(null);

  useEffect(() => {
    const id = "fieldlog-assets";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600&display=swap";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (window.storage) {
          try { const r = await window.storage.get(STORAGE_KEY, false); if (r && r.value) setVisits(JSON.parse(r.value)); } catch (e) {}
          try { const p = await window.storage.get(PEOPLE_KEY, false); if (p && p.value) setPeople(JSON.parse(p.value)); } catch (e) {}
          try { const mm = await window.storage.get(MESSAGES_KEY, false); if (mm && mm.value) setMessages(JSON.parse(mm.value)); } catch (e) {}
          try { const iv = await window.storage.get(INVOICES_KEY, false); if (iv && iv.value) setInvoices(JSON.parse(iv.value)); } catch (e) {}
          try { const bz = await window.storage.get(BUSINESS_KEY, false); if (bz && bz.value) { const b = { ...defaultBusiness(), ...JSON.parse(bz.value) }; setBusiness(b); setBizForm(b); } } catch (e) {}
          try { const th = await window.storage.get("crm_theme", false); if (th && th.value) setTheme(th.value === "dark" ? "dark" : "light"); } catch (e) {}
        }
      } catch (e) {
        /* first run, no data yet */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function persist(next) {
    setVisits(next);
    try {
      if (window.storage) await window.storage.set(STORAGE_KEY, JSON.stringify(next), false);
    } catch (e) {
      setError("Couldn't save to storage. Changes are held for this session but may not persist.");
    }
  }
  const setField = (k, val) => setForm((f) => ({ ...f, [k]: val }));
  const resetForm = () => { setForm(emptyForm()); setError(""); };

  function submit() {
    if (!form.company.trim() && !form.address.trim()) {
      setError("Add at least a company or an address before saving.");
      return;
    }
    if (form.dmContactCaptured === "Yes" && !contactValid(form)) {
      setError("To log a captured decision-maker contact, add their name and a phone or email.");
      return;
    }
    if (form.meetingSet === "Yes" && !meetingValid(form)) {
      setError("To log a meeting, add who it's with and the meeting date.");
      return;
    }
    setError("");
    const hasEmail = (form.dmEmail || form.email || "").trim();
    const cadenceStart = hasEmail ? (form.cadenceStart || toLocalInput(new Date()).slice(0, 10)) : form.cadenceStart;
    const rec = { ...form, cadenceStart };
    if (form.id) persist(visits.map((v) => (v.id === form.id ? rec : v)));
    else persist([{ ...rec, id: Date.now() + "-" + Math.random().toString(36).slice(2, 7) }, ...visits]);
    resetForm();
  }
  function edit(v) {
    setForm({ ...emptyForm(), ...v });
    setPage("daily");
    setFormOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
  function remove(id) { persist(visits.filter((v) => v.id !== id)); setConfirmId(null); }

  async function persistPeople(next) {
    setPeople(next);
    try {
      if (window.storage) await window.storage.set(PEOPLE_KEY, JSON.stringify(next), false);
    } catch (e) {
      setPError("Couldn't save the team list. Changes are held for this session but may not persist.");
    }
  }
  const setPField = (k, val) => setPform((f) => ({ ...f, [k]: val }));
  function submitPerson() {
    if (!pform.name.trim()) { setPError("Add a name before saving."); return; }
    setPError("");
    const rec = { ...pform, quota: Math.max(0, Number(pform.quota) || 0) };
    if (pform.id) persistPeople(people.map((p) => (p.id === pform.id ? rec : p)));
    else persistPeople([...people, { ...rec, id: Date.now() + "-" + Math.random().toString(36).slice(2, 7) }]);
    setPform(emptyPerson());
  }
  const editPerson = (p) => { setPform({ ...emptyPerson(), ...p }); setPError(""); };
  function removePerson(id) { persistPeople(people.filter((p) => p.id !== id)); setPConfirmId(null); }

  async function persistInvoices(next) {
    setInvoices(next);
    try {
      if (window.storage) await window.storage.set(INVOICES_KEY, JSON.stringify(next), false);
    } catch (e) { setInvError("Couldn't save invoices. Changes are held for this session but may not persist."); }
  }
  const setInvField = (k, val) => setInvForm((f) => ({ ...f, [k]: val }));
  // Match an invoice to the rep who first walked that address
  function matchRep(inv) {
    if (inv.repOverride) return inv.repOverride;
    const target = normAddr(inv.address);
    if (!target) return "";
    const hits = visits
      .filter((v) => { const a = normAddr(v.address); return a && (a === target || a.includes(target) || target.includes(a)); })
      .sort((a, b) => toTs(b.visitDate) - toTs(a.visitDate)); // most recent first — newest claim wins
    return hits.length ? (hits[0].rep || "").trim() : "";
  }
  function submitInvoice() {
    if (!invForm.address.trim() && !invForm.repOverride) { setInvError("Add the job address (or assign a rep) so the commission can be credited."); return; }
    setInvError("");
    if (invForm.id) persistInvoices(invoices.map((iv) => (iv.id === invForm.id ? { ...invForm } : iv)));
    else persistInvoices([{ ...invForm, id: Date.now() + "-" + Math.random().toString(36).slice(2, 7) }, ...invoices]);
    setInvForm(emptyInvoice());
  }
  const editInvoice = (iv) => { setInvForm({ ...emptyInvoice(), ...iv }); setInvError(""); };
  function removeInvoice(id) { persistInvoices(invoices.filter((iv) => iv.id !== id)); setInvConfirmId(null); }
  function toggleApproved(id) { persistInvoices(invoices.map((iv) => (iv.id === id ? { ...iv, approved: iv.approved === false } : iv))); }
  function toggleBonus(id, key) { persist(visits.map((v) => (v.id === id ? { ...v, [key]: !v[key] } : v))); }
  function markStep(id, key) { persist(visits.map((v) => (v.id === id ? { ...v, [key]: new Date().toISOString() } : v))); }
  function dismissNotification(id) { persist(visits.map((v) => (v.id === id ? { ...v, dismissed: true } : v))); }
  const repEmail = (name) => { const p = people.find((x) => (x.name || "").trim() === (name || "").trim()); return p ? (p.email || "") : ""; };
  function emailRepHref(v) {
    const subject = "Follow-up overdue — " + (v.company || v.address || "a job");
    const body = `Hi ${v.rep || ""},\n\nThe follow-up on ${v.company || v.address || "this job"} is ${daysSince(lastActivity(v))} days overdue. What's the status — can you get a touch in today, or should we close it out?\n\nThanks`;
    return `mailto:${encodeURIComponent(repEmail(v.rep))}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  function logStep(id, step, outcome, dateStr) {
    const key = STEP_KEY[step];
    persist(visits.map((v) => {
      if (v.id !== id) return v;
      const d = dateStr || toLocalInput(new Date()).slice(0, 10);
      const fu = { id: Date.now() + "", date: d, type: STEP_LABEL[step], note: (outcome || "").trim() };
      return { ...v, [key]: new Date(d + "T12:00:00").toISOString(), [key + "Outcome"]: (outcome || "").trim(), followUps: [...followUps(v), fu] };
    }));
    setLogOpen(null); setLogOutcome(""); setLogDate("");
  }
  function setQuota(id, n) { persistPeople(people.map((p) => (p.id === id ? { ...p, quota: Math.max(0, Number(n) || 0) } : p))); }
  const setBizField = (k, val) => setBizForm((f) => ({ ...f, [k]: val }));
  async function saveBusiness() {
    setBusiness(bizForm);
    try { if (window.storage) await window.storage.set(BUSINESS_KEY, JSON.stringify(bizForm), false); } catch (e) {}
  }
  function onBizLogo(e) {
    const f = e.target.files && e.target.files[0];
    if (e.target) e.target.value = "";
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setBizField("logo", r.result.toString());
    r.readAsDataURL(f);
  }
  const todayStart = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  function locationsToday(rep) {
    const set = new Set();
    visits.forEach((v) => { if ((v.rep || "").trim() === rep && toTs(v.visitDate) >= todayStart) { const a = normAddr(v.address); if (a) set.add(a); } });
    return set.size;
  }

  function onCsvFile(e) {
    const file = e.target.files && e.target.files[0];
    if (e.target) e.target.value = ""; // let the same file be re-picked
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const res = Papa.parse(reader.result.toString().trim(), { header: true, skipEmptyLines: true });
        const fields = (res.meta && res.meta.fields) || [];
        if (!fields.length) { setCsvError("Couldn't find column headers in that file."); return; }
        setCsvData({ fields, rows: res.data, fileName: file.name });
        setCsvMap(guessMap(fields));
        setCsvError("");
      } catch (err) { setCsvError("Couldn't read that CSV. Make sure it's a plain .csv export."); }
    };
    reader.readAsText(file);
  }
  function doImport() {
    if (!csvData) return;
    if (!csvMap.address && !csvMap.company) { setCsvError("Pick which column holds the job address so commissions can link to a rep."); return; }
    const base = Date.now();
    const rows = csvData.rows.map((r, i) => ({
      id: base + "-" + i,
      invoiceNo: csvMap.invoice ? (r[csvMap.invoice] || "").toString().trim() : "",
      date: csvMap.date ? toISODate(r[csvMap.date]) : "",
      company: csvMap.company ? (r[csvMap.company] || "").toString().trim() : "",
      address: csvMap.address ? (r[csvMap.address] || "").toString().trim() : "",
      total: csvMap.total ? cleanNum(r[csvMap.total]) : "",
      profit: csvMap.profit ? cleanNum(r[csvMap.profit]) : "",
      repOverride: "",
      approved: false,
    })).filter((r) => r.address || r.company || r.profit !== "");
    persistInvoices([...rows, ...invoices]);
    setCsvData(null);
    setCsvError("");
  }

  // ── Who's using it + what they can do ───────────────────────────────────────
  const currentUser = people.find((p) => p.id === currentUserId) || null;
  const role = currentUser ? currentUser.role : "Owner"; // default to Owner until a person is picked
  const myName = currentUser ? currentUser.name : "";

  async function postMessage() {
    const t = msgText.trim();
    if (!t) return;
    const next = [...messages, { id: Date.now() + "-" + Math.random().toString(36).slice(2), ts: Date.now(), fromName: myName || (business.name || "Owner"), fromRole: role, text: t }];
    setMessages(next);
    setMsgText("");
    try { if (window.storage) await window.storage.set(MESSAGES_KEY, JSON.stringify(next), false); } catch (e) {}
  }
  const can = {
    viewWeekly: role === "Owner" || role === "Admin",
    viewEmployees: role === "Owner" || role === "Admin",
    managePeople: role === "Owner",          // only the owner grants/changes roles
    manageInvoices: role === "Owner" || role === "Admin", // sales reps only view their own statement
    viewAllVisits: role === "Owner" || role === "Admin",
  };
  const TABS = [
    { key: "home", label: "Home", show: true },
    { key: "daily", label: "Daily Logs", show: true },
    { key: "jobs", label: "My Jobs", show: true },
    { key: "sops", label: "SOPs", show: true },
    { key: "weekly", label: "Weekly Logs", show: can.viewWeekly },
    { key: "commissions", label: "Commissions", show: true },
    { key: "approvals", label: "Approvals", show: can.manageInvoices },
    { key: "employees", label: "Employees", show: can.viewEmployees },
    { key: "business", label: "Business", show: can.managePeople },
    { key: "help", label: "Help", show: true },
    { key: "account", label: "Account", show: can.managePeople },
  ].filter((t) => t.show);
  const SETTINGS_KEYS = ["sops", "help", "account"];
  const MAIN_TABS = TABS.filter((t) => !SETTINGS_KEYS.includes(t.key));
  const SETTINGS_TABS = TABS.filter((t) => SETTINGS_KEYS.includes(t.key));

  useEffect(() => {
    if (page !== "messages" && !TABS.some((t) => t.key === page)) setPage("daily");
  }, [role]); // if the active role can't see the current tab, fall back to Daily

  // Sales Reps log under their own name
  useEffect(() => {
    if (role === "Sales Rep" && myName && !form.id) setForm((f) => ({ ...f, rep: myName }));
  }, [role, myName]);

  function logFollowUp(id) {
    if (!fuDraft.note.trim() && !fuDraft.date) { setFuOpen(null); return; }
    const entry = { id: Date.now() + "", date: fuDraft.date || toLocalInput(new Date()).slice(0, 10), type: fuDraft.type, note: fuDraft.note };
    persist(visits.map((v) => (v.id === id ? { ...v, followUps: [...followUps(v), entry] } : v)));
    setFuOpen(null);
    setFuDraft({ date: "", type: "Call", note: "" });
  }
  function setJobStatus(id, status) {
    persist(visits.map((v) => (v.id === id ? { ...v, status } : v)));
  }

  const visibleVisits = can.viewAllVisits ? visits : visits.filter((v) => (v.rep || "").trim() === myName);
  const flagCount = visibleVisits.filter(isFlagged).length;
  const behindList = visibleVisits.filter(isFlagged).sort((a, b) => daysSince(lastActivity(b)) - daysSince(lastActivity(a)));
  const dueCount = flagCount;
  const shown = visibleVisits.filter((v) => {
    if (filter === "Follow-up due" && !isFlagged(v)) return false;
    if (filter !== "All" && filter !== "Follow-up due" && v.status !== filter) return false;
    if (query.trim()) {
      const hay = [v.company, v.address, v.cityStateZip, v.contact, v.rep, v.decisionMaker, v.notes].join(" ").toLowerCase();
      if (!hay.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  // Jobs worklist (sales reps see their own; owner/admin see all), flagged first
  const cadReady = (v) => { const cs = cadenceStatus(v); return cs && cs.step !== "done" && cs.ready ? 1 : 0; };
  const myJobs = visibleVisits
    .filter((v) => v.status !== "Won" && v.status !== "Lost" && !v.dismissed)
    .sort((a, b) => cadReady(b) - cadReady(a) || (isFlagged(b) ? 1 : 0) - (isFlagged(a) ? 1 : 0) || lastActivity(a) - lastActivity(b));
  const cadenceDueCount = myJobs.filter(cadReady).length;

  // ── Commissions: match invoices to reps, total the 10% royalty + activity bonuses ──
  const matchedInv = invoices.map((iv) => {
    const rep = matchRep(iv);
    const approved = iv.approved !== false;
    const base = COMMISSION_BASE === "total" ? (Number(iv.total) || 0) : (Number(iv.profit) || 0);
    return { ...iv, rep, approved, commission: approved ? base * COMMISSION_RATE : 0 };
  });
  const unmatchedInv = matchedInv.filter((m) => !m.rep);
  const potentialCommission = (iv) => (COMMISSION_BASE === "total" ? Number(iv.total) || 0 : Number(iv.profit) || 0) * COMMISSION_RATE;
  const pendingMeetings = visits.filter((v) => meetingValid(v) && !v.meetingApproved && v.status !== "Lost");
  const pendingContacts = visits.filter((v) => contactValid(v) && !v.contactApproved && v.status !== "Lost");
  const pendingComm = matchedInv.filter((m) => m.rep && m.approved === false);
  const pendingCount = pendingMeetings.length + pendingContacts.length + pendingComm.length;
  const repsWithInv = matchedInv.map((m) => m.rep).filter(Boolean);
  const repsWithActivity = visits.map((v) => (v.rep || "").trim()).filter(Boolean);
  function bonusFor(rep) {
    const rv = visits.filter((v) => (v.rep || "").trim() === rep);
    const contacts = rv.filter(contactPaid).length;
    const meetings = rv.filter(meetingPaid).length;
    return { contacts, meetings, contactPay: contacts * BONUS_CONTACT, meetingPay: meetings * BONUS_MEETING, total: contacts * BONUS_CONTACT + meetings * BONUS_MEETING };
  }
  const repUniverse = Array.from(new Set([...repsWithInv, ...repsWithActivity])).sort();
  const allStatements = repUniverse.map((rep) => {
    const rows = matchedInv.filter((m) => m.rep === rep).sort((a, b) => toTs(a.date) - toTs(b.date));
    const totalProfit = rows.reduce((s, r) => s + (Number(r.profit) || 0), 0);
    const totalCommission = rows.reduce((s, r) => s + r.commission, 0);
    const bonus = bonusFor(rep);
    return { rep, rows, totalProfit, totalCommission, bonus, totalOwed: totalCommission + bonus.total };
  }).filter((s) => s.totalCommission > 0 || s.bonus.total > 0 || s.rows.length > 0);
  const statements = can.manageInvoices ? allStatements : allStatements.filter((s) => s.rep === myName);
  const printList = printTarget === "ALL" ? statements : statements.filter((s) => s.rep === printTarget);
  function printStatement(rep) { setPrintTarget(rep); setTimeout(() => window.print(), 80); }
  const knownAddresses = Array.from(new Set(visits.map((v) => v.address).filter(Boolean)));
  const knownCompanies = Array.from(new Set(visits.map((v) => v.company).filter(Boolean)));
  const previewRep = matchRep(invForm);

  // ── Address book: group every visit by address; newest claim = owner ────────
  const addrGroups = {};
  visits.forEach((v) => { const k = normAddr(v.address); if (!k) return; (addrGroups[k] = addrGroups[k] || []).push(v); });
  const addressList = Object.values(addrGroups).map((rows) => {
    rows = rows.slice().sort((a, b) => toTs(b.visitDate) - toTs(a.visitDate));
    return { address: rows[0].address, owner: (rows[0].rep || "").trim(), rows };
  }).sort((a, b) => toTs(b.rows[0].visitDate) - toTs(a.rows[0].visitDate));
  const addrMatches = addrQuery.trim()
    ? addressList.filter((g) => normAddr(g.address).includes(normAddr(addrQuery)))
    : [];

  function saveClaim(address) {
    const addr = (address || "").trim();
    if (!addr) return;
    const rep = (claimRep || myName || "").trim();
    const entry = { ...emptyForm(), id: Date.now() + "-" + Math.random().toString(36).slice(2, 7), visitDate: toLocalInput(new Date()), address: addr, rep, notes: claimNote.trim(), kind: "note" };
    persist([entry, ...visits]);
    setClaimOpen(null); setClaimNote(""); setClaimRep("");
  }
  function exportOwnersCsv() {
    const rows = addressList.map((g) => ({ Address: g.address, "Owner Tech": g.owner || "", "Last Activity": g.rows[0].visitDate ? g.rows[0].visitDate.slice(0, 10) : "", Records: g.rows.length }));
    const csv = Papa.unparse(rows.length ? rows : [{ Address: "", "Owner Tech": "", "Last Activity": "", Records: "" }]);
    try {
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "address-owners.csv";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) { /* download may be blocked in preview sandbox */ }
  }

  function exportActivityCsv() {
    const rows = visits
      .filter((v) => v.dmContactCaptured === "Yes" || v.meetingSet === "Yes")
      .map((v) => ({
        Rep: v.rep || "",
        Date: v.visitDate ? v.visitDate.slice(0, 10) : "",
        Company: v.company || "",
        Address: v.address || "",
        "DM Name": v.dmName || "",
        "DM Phone": v.dmPhone || "",
        "DM Email": v.dmEmail || "",
        "Contact Approved": contactPaid(v) ? "Yes" : (contactValid(v) ? "Pending" : ""),
        "Meeting With": v.meetingWith || "",
        "Meeting Time": v.meetingAt || "",
        "Meeting For": v.meetingFor || "",
        "Meeting Approved": meetingPaid(v) ? "Yes" : (meetingValid(v) ? "Pending" : ""),
        "Contact Bonus": contactPaid(v) ? BONUS_CONTACT : 0,
        "Meeting Bonus": meetingPaid(v) ? BONUS_MEETING : 0,
      }));
    const csv = Papa.unparse(rows.length ? rows : [{ Rep: "", Date: "", Company: "", Address: "", "DM Name": "", "DM Phone": "", "DM Email": "", "Contact Approved": "", "Meeting With": "", "Meeting Time": "", "Meeting For": "", "Meeting Approved": "", "Contact Bonus": "", "Meeting Bonus": "" }]);
    try {
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "activity-bonuses.csv";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) { /* download may be blocked in preview sandbox */ }
  }

  // ── Weekly rollup ──────────────────────────────────────────────────────────
  const { start, end } = weekBounds(weekAnchor);
  const weekRange = `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  const inWeek = (v) => { const t = new Date(v.visitDate); return t >= start && t <= end; };
  const repName = (v) => (v.rep && v.rep.trim() ? v.rep.trim() : "(no rep)");
  const rosterNames = people.map((p) => p.name.trim()).filter(Boolean);
  const allReps = Array.from(new Set([...rosterNames, ...visits.map(repName)])).sort();
  const weekVisits = visits.filter(inWeek);
  const teamStats = statsFor(weekVisits);
  function shiftWeek(days) {
    const d = new Date(weekAnchor + "T00:00:00");
    d.setDate(d.getDate() + days);
    setWeekAnchor(toLocalInput(d).slice(0, 10));
    setOpenEmp(null);
  }

  return (
    <div className="fl-root">
      <div className="fl-noprint">
      <header className="fl-header">
        <div className="fl-wordmark">
          <img className="fl-crest" src={CREST} alt="ReyGuild" />
          <div className="fl-lock">
            <span className="fl-brand"><span className="fl-brand-rey">Rey</span><span className="fl-brand-guild">Guild</span></span>
            <span className="fl-tagline">Client Outreach &amp; Commissions Tracking</span>
          </div>
        </div>
        <div className="fl-stats">
          <label className="fl-actas">
            <span className="fl-actas-co">{business.name || "Your company"}</span>
            <span className="fl-rolebadge" style={{ "--accent": ROLE_COLOR[role] || "var(--ink-2)" }}>{role}</span>
            <select className="fl-actas-switch" value={currentUserId} onChange={(e) => setCurrentUserId(e.target.value)} title="Switch view">
              <option value="">Owner</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.role}</option>)}
            </select>
          </label>
          <div className="fl-chip"><span className="fl-chip-num">{visibleVisits.length}</span><span className="fl-chip-lbl">visits</span></div>
          {can.manageInvoices && (
            <div className={"fl-chip fl-chip-btn" + (pendingCount ? " due" : "")} onClick={() => setPage("approvals")}><span className="fl-chip-num">{pendingCount}</span><span className="fl-chip-lbl">to verify</span></div>
          )}
          <div className={"fl-chip" + (dueCount ? " due" : "")}><span className="fl-chip-num">{dueCount}</span><span className="fl-chip-lbl">need follow-up</span></div>
        </div>
      </header>

      <nav className="fl-nav">
        <div className="fl-menuwrap">
          <button className="fl-menubtn" onClick={() => setNavOpen(!navOpen)}>
            <span className="fl-menu-ic">☰</span> {(MAIN_TABS.find((t) => t.key === page) || {}).label || "Menu"} <span className="fl-menu-car">▾</span>
          </button>
          {navOpen && <div className="fl-menu-overlay" onClick={() => setNavOpen(false)} />}
          {navOpen && (
            <div className="fl-menu">
              {MAIN_TABS.map((t) => (
                <button key={t.key} className={"fl-menu-item" + (page === t.key ? " on" : "")} onClick={() => { setPage(t.key); setNavOpen(false); }}>{t.label}</button>
              ))}
            </div>
          )}
        </div>
        <button className={"fl-msgtab" + (page === "messages" ? " on" : "")} onClick={() => { setPage("messages"); setNavOpen(false); setSetOpen(false); }}>Messages</button>
        <div className="fl-setwrap">
          <button className={"fl-setbtn" + (SETTINGS_TABS.some((t) => t.key === page) ? " on" : "")} onClick={() => setSetOpen(!setOpen)}>Settings <span className="fl-menu-car">▾</span></button>
          {setOpen && <div className="fl-menu-overlay" onClick={() => setSetOpen(false)} />}
          {setOpen && (
            <div className="fl-menu fl-setmenu">
              {SETTINGS_TABS.map((t) => (
                <button key={t.key} className={"fl-menu-item" + (page === t.key ? " on" : "")} onClick={() => { setPage(t.key); setSetOpen(false); }}>{t.label}</button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* ════════════════════ HOME / ADDRESS SEARCH ════════════════════ */}
      {page === "home" && (
        <div className="fl-home">
          {can.manageInvoices && pendingMeetings.length > 0 && (
            <div className="fl-bignote" onClick={() => setPage("approvals")} style={{ cursor: "pointer" }}>
              🔔 {pendingMeetings.length} meeting{pendingMeetings.length > 1 ? "s" : ""} scheduled and awaiting your verification — tap to review.
            </div>
          )}
          <div className="fl-hero">
            <h2>Look up an address</h2>
            <p>Search before you roll out — see who's already been there, read their notes, and avoid doubling up.</p>
            <input className="fl-bigsearch" value={addrQuery} placeholder="Type a street address…" onChange={(e) => setAddrQuery(e.target.value)} />
            {can.manageInvoices && addressList.length > 0 && (
              <button className="fl-job-btn" style={{ marginTop: 12 }} onClick={exportOwnersCsv}>⬇ Export address owners CSV</button>
            )}
          </div>

          {currentUser && currentUser.quota > 0 && (
            <div className="fl-quota">
              <div className="fl-quota-head"><span>Your locations today</span><strong>{locationsToday(myName)} / {currentUser.quota}{locationsToday(myName) >= currentUser.quota ? " ✓ met" : ""}</strong></div>
              <div className="fl-quota-bar"><div style={{ width: Math.min(100, locationsToday(myName) / currentUser.quota * 100) + "%" }} /></div>
            </div>
          )}
          {can.manageInvoices && people.some((p) => p.quota > 0) && (
            <div className="fl-quota-team">
              <p className="fl-sub">Team quota today</p>
              {people.filter((p) => p.quota > 0).map((p) => {
                const done = locationsToday(p.name);
                return (
                  <div className="fl-quota-row" key={p.id}>
                    <span className="fl-quota-name">{p.name}</span>
                    <div className="fl-quota-bar small"><div style={{ width: Math.min(100, done / p.quota * 100) + "%" }} /></div>
                    <span className="fl-quota-n">{done}/{p.quota}{done >= p.quota ? " ✓" : ""}</span>
                  </div>
                );
              })}
            </div>
          )}
          {can.manageInvoices && behindList.length > 0 && (
            <div className="fl-quota-team">
              <p className="fl-sub">Follow-ups behind · {behindList.length}</p>
              {behindList.map((v) => (
                <div className="fl-behind-row" key={v.id}>
                  <div>
                    <strong>{v.company || v.address || "(job)"}</strong>
                    <p className="fl-pmeta">{v.rep || "no rep"} · {daysSince(lastActivity(v))} days behind</p>
                  </div>
                  <div className="fl-behind-actions">
                    {repEmail(v.rep) && <a className="fl-link" href={emailRepHref(v)}>Email rep</a>}
                    <button className="fl-link" onClick={() => dismissNotification(v.id)}>Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {addrQuery.trim() && addrMatches.length === 0 ? (
            <div className="fl-empty">
              No records for "{addrQuery.trim()}". This address looks untouched.
              <div style={{ marginTop: 12 }}>
                {claimOpen === addrQuery.trim() ? (
                  <div className="fl-claim">
                    <input value={claimRep} placeholder="Your name" onChange={(e) => setClaimRep(e.target.value)} />
                    <input value={claimNote} placeholder="Note (optional)" onChange={(e) => setClaimNote(e.target.value)} />
                    <button className="fl-primary" onClick={() => saveClaim(addrQuery.trim())}>Save &amp; claim</button>
                    <button className="fl-ghost" onClick={() => setClaimOpen(null)}>Cancel</button>
                  </div>
                ) : (
                  <button className="fl-job-btn" onClick={() => { setClaimOpen(addrQuery.trim()); setClaimRep(myName); setClaimNote(""); }}>+ Put my name on this address</button>
                )}
              </div>
            </div>
          ) : (
            <>
              {!addrQuery.trim() && <p className="fl-sub">Recent addresses</p>}
              {addressList.length === 0 ? (
                <div className="fl-empty">No addresses logged yet. Once visits are logged, anyone can search them here.</div>
              ) : (
                (addrQuery.trim() ? addrMatches : addressList.slice(0, 6)).map((g) => (
                  <div className="fl-addr-card" key={g.address}>
                    <div className="fl-addr-top">
                      <div>
                        <h3>{g.address}</h3>
                        <p className="fl-addr-owner">{g.owner ? <>Owned by <strong>{g.owner}</strong></> : "Unclaimed"} · {g.rows.length} record{g.rows.length > 1 ? "s" : ""}</p>
                      </div>
                      {claimOpen !== g.address && (
                        <button className="fl-job-btn" onClick={() => { setClaimOpen(g.address); setClaimRep(myName); setClaimNote(""); }}>Put my name on it</button>
                      )}
                    </div>
                    {claimOpen === g.address && (
                      <div className="fl-claim">
                        <input value={claimRep} placeholder="Your name" onChange={(e) => setClaimRep(e.target.value)} />
                        <input value={claimNote} placeholder="Note (optional)" onChange={(e) => setClaimNote(e.target.value)} />
                        <button className="fl-primary" onClick={() => saveClaim(g.address)}>Save &amp; claim</button>
                        <button className="fl-ghost" onClick={() => setClaimOpen(null)}>Cancel</button>
                      </div>
                    )}
                    <div className="fl-fu-list">
                      {g.rows.map((r) => (
                        <div className="fl-fu-row" key={r.id}>
                          <span className="fl-fu-meta">{fmtVisit(r.visitDate)} · {r.rep || "no rep"}</span>
                          <span className="fl-fu-note">{r.kind === "note" ? "📝 " : ""}{r.notes || r.nextAction || r.status || r.company || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
          <p className="fl-foot-note">Whoever logs an address most recently owns it — a new tech putting their name on it takes over the 10% royalty when that job's invoice comes in. Anyone can search and leave a note; the newest name wins.</p>
        </div>
      )}

      {/* ════════════════════ DAILY ════════════════════ */}
      {page === "daily" && (
        <div className="fl-grid">
          <section className="fl-panel" ref={formRef}>
            <div className="fl-panel-head">
              <h2>{form.id ? "Edit visit" : "Log a visit"}</h2>
              <button className="fl-collapse" onClick={() => setFormOpen((o) => !o)}>{formOpen ? "Hide" : "Show"}</button>
            </div>

            {formOpen && (
              <div className="fl-form">
                <p className="fl-sub">Visit</p>
                <Field label="Date & time of visit">
                  <input type="datetime-local" value={form.visitDate} onChange={(e) => setField("visitDate", e.target.value)} />
                </Field>
                <Field label="Sales Rep who went out (logged by)">
                  <input list="fl-reps" value={form.rep} readOnly={role === "Sales Rep"} placeholder="Your name — who gets the credit" onChange={(e) => setField("rep", e.target.value)} />
                  <datalist id="fl-reps">{people.map((p) => <option key={p.id} value={p.name} />)}</datalist>
                </Field>
                <Field label="Type of contact">
                  <Seg value={form.contactType} options={CONTACT_TYPES} onChange={(v) => setField("contactType", v)} clearable />
                </Field>

                <p className="fl-sub">Business</p>
                <Field label="Company"><input value={form.company} placeholder="Acme Manufacturing" onChange={(e) => setField("company", e.target.value)} /></Field>
                <Field label="Business address"><input value={form.address} placeholder="123 Industrial Rd" onChange={(e) => setField("address", e.target.value)} /></Field>
                <div className="fl-two">
                  <Field label="City / State / Zip"><input value={form.cityStateZip} placeholder="Denver, CO 80233" onChange={(e) => setField("cityStateZip", e.target.value)} /></Field>
                  <Field label="Industry type"><input value={form.industry} placeholder="Electrical, plumbing, HVAC" onChange={(e) => setField("industry", e.target.value)} /></Field>
                </div>

                <p className="fl-sub">Contact</p>
                <div className="fl-two">
                  <Field label="Contact person"><input value={form.contact} placeholder="Who you met" onChange={(e) => setField("contact", e.target.value)} /></Field>
                  <Field label="Position / title"><input value={form.position} placeholder="Owner, manager…" onChange={(e) => setField("position", e.target.value)} /></Field>
                </div>
                <div className="fl-two">
                  <Field label="Phone"><input value={form.phone} onChange={(e) => setField("phone", e.target.value)} /></Field>
                  <Field label="Email"><input value={form.email} onChange={(e) => setField("email", e.target.value)} /></Field>
                </div>
                <Field label="Decision maker name"><input value={form.decisionMaker} placeholder="Who actually decides" onChange={(e) => setField("decisionMaker", e.target.value)} /></Field>
                <div className="fl-two">
                  <Field label="Reached decision maker?"><Seg value={form.decisionMakerReached} options={["Yes", "No"]} onChange={(v) => setField("decisionMakerReached", v)} clearable /></Field>
                  <Field label="Interested?"><Seg value={form.interested} options={["Yes", "No"]} onChange={(v) => setField("interested", v)} clearable /></Field>
                </div>

                <p className="fl-sub">Outcome &amp; follow-up</p>
                <div className="fl-two">
                  <Field label="Interest level (1–10)">
                    <select value={form.interestLevel} onChange={(e) => setField("interestLevel", e.target.value)}>
                      <option value="">—</option>
                      {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </Field>
                  <Field label="Status">
                    <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="fl-two">
                  <Field label="Vendor application requested?"><Seg value={form.vendorAppRequested} options={["Yes", "No"]} onChange={(v) => setField("vendorAppRequested", v)} clearable /></Field>
                  <Field label="Follow-up needed?"><Seg value={form.followUpNeeded} options={["Yes", "No"]} onChange={(v) => setField("followUpNeeded", v)} clearable /></Field>
                </div>
                <Field label="Follow-up by"><Seg value={form.followUpType} options={FOLLOWUPS} onChange={(v) => setField("followUpType", v)} /></Field>
                <Field label="Next follow-up date"><input type="date" value={form.followUpDate} onChange={(e) => setField("followUpDate", e.target.value)} /></Field>
                <Field label="Next action step"><input value={form.nextAction} placeholder="Send quote, call back Tues…" onChange={(e) => setField("nextAction", e.target.value)} /></Field>

                <p className="fl-sub">Meeting &amp; decision-maker contact <span className="fl-paytag">payable</span></p>
                <Field label="Got decision-maker's contact info?"><Seg value={form.dmContactCaptured} options={["Yes", "No"]} onChange={(v) => setField("dmContactCaptured", v)} clearable /></Field>
                {form.dmContactCaptured === "Yes" && (
                  <div className="fl-subblock">
                    <Field label="Decision-maker name (required)"><input value={form.dmName} placeholder="Full name" onChange={(e) => setField("dmName", e.target.value)} /></Field>
                    <div className="fl-two">
                      <Field label="Phone"><input value={form.dmPhone} placeholder="(303) 555-0142" onChange={(e) => setField("dmPhone", e.target.value)} /></Field>
                      <Field label="Email"><input value={form.dmEmail} placeholder="name@gmail.com" onChange={(e) => setField("dmEmail", e.target.value)} /></Field>
                    </div>
                    <p className="fl-hint">Name plus a phone <em>or</em> email is required to qualify for the {money(BONUS_CONTACT)} bonus.</p>
                  </div>
                )}
                <Field label="Set up a meeting?"><Seg value={form.meetingSet} options={["Yes", "No"]} onChange={(v) => setField("meetingSet", v)} clearable /></Field>
                {form.meetingSet === "Yes" && (
                  <div className="fl-subblock">
                    <Field label="Meeting with (required)"><input value={form.meetingWith} placeholder="Who they're meeting" onChange={(e) => setField("meetingWith", e.target.value)} /></Field>
                    <div className="fl-two">
                      <Field label="Meeting date & time (required)"><input type="datetime-local" value={form.meetingAt} onChange={(e) => setField("meetingAt", e.target.value)} /></Field>
                      <Field label="Meeting for"><input value={form.meetingFor} placeholder="Subscription, proposal…" onChange={(e) => setField("meetingFor", e.target.value)} /></Field>
                    </div>
                    <p className="fl-hint">Who it's with and the date are required to qualify for the {money(BONUS_MEETING)} bonus.</p>
                  </div>
                )}

                <Field label="Detailed notes / outcome"><textarea rows={3} value={form.notes} placeholder="What was pitched, gate codes, who to ask for…" onChange={(e) => setField("notes", e.target.value)} /></Field>

                {error && <p className="fl-error">{error}</p>}
                <div className="fl-actions">
                  <button className="fl-primary" onClick={submit}>{form.id ? "Update visit" : "Log visit"}</button>
                  {form.id && <button className="fl-ghost" onClick={resetForm}>Cancel</button>}
                </div>
              </div>
            )}
          </section>

          <section className="fl-list">
            <div className="fl-toolbar">
              <input className="fl-search" value={query} placeholder="Search company, address, rep, contact…" onChange={(e) => setQuery(e.target.value)} />
              <div className="fl-filters">
                {["All", "Follow-up due", ...STATUSES].map((f) => (
                  <button key={f} className={"fl-pill" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>{f}</button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="fl-empty">Loading saved visits…</div>
            ) : shown.length === 0 ? (
              <div className="fl-empty">
                {visibleVisits.length === 0 ? "No visits logged yet. Fill out the form to record your first stop." : "No visits match this filter. Clear the search or pick a different tab."}
              </div>
            ) : (
              <div className="fl-cards">
                {shown.map((v) => (
                  <article key={v.id} className="fl-card" style={{ "--accent": STATUS_COLOR[v.status] || "var(--ink-2)" }}>
                    <div className="fl-card-top">
                      <div>
                        <h3>{v.company || "(no company)"}</h3>
                        <p className="fl-addr">{[v.address, v.cityStateZip].filter(Boolean).join(", ") || "no address on file"}</p>
                      </div>
                      <span className="fl-status">{v.status}</span>
                    </div>
                    {isFlagged(v) && <span className="fl-flag">⚑ Follow-up needed · {followUpCount(v)}/{MAX_FOLLOWUPS} done · {daysSince(lastActivity(v))}d quiet</span>}
                    <div className="fl-meta">
                      <span className="fl-ts">{fmtVisit(v.visitDate)}</span>
                      {v.contactType && <span>{v.contactType}</span>}
                      {v.contact && <span>Met: {v.contact}{v.position ? ` (${v.position})` : ""}</span>}
                      {v.decisionMaker && <span>Decision: {v.decisionMaker}</span>}
                      {v.interestLevel && <span>Interest: {v.interestLevel}/10</span>}
                      {v.vendorAppRequested === "Yes" && <span>Vendor app ✓</span>}
                      {v.dmContactCaptured === "Yes" && <span className={"fl-paychip " + (contactPaid(v) ? "ok" : contactValid(v) ? "pend" : "bad")}>DM contact{contactPaid(v) ? ` ✓ ${money(BONUS_CONTACT)}` : contactValid(v) ? " · pending" : " · incomplete"}</span>}
                      {v.meetingSet === "Yes" && <span className={"fl-paychip " + (meetingPaid(v) ? "ok" : meetingValid(v) ? "pend" : "bad")}>Meeting{v.meetingAt ? " · " + fmtVisit(v.meetingAt) : ""}{meetingPaid(v) ? ` ✓ ${money(BONUS_MEETING)}` : meetingValid(v) ? " · pending" : " · incomplete"}</span>}
                      {v.followUpType !== "None" && <span>{v.followUpType}{v.followUpDate ? " · " + fmtDate(v.followUpDate) : ""}</span>}
                    </div>
                    {v.nextAction && <p className="fl-next">Next: {v.nextAction}</p>}
                    {v.notes && <p className="fl-notes">{v.notes}</p>}
                    {can.manageInvoices && (contactValid(v) || meetingValid(v)) && (
                      <div className="fl-approvals">
                        <span className="fl-appr-lbl">Bonuses</span>
                        {contactValid(v) && <button className={"fl-link" + (v.contactApproved ? " on" : "")} onClick={() => toggleBonus(v.id, "contactApproved")}>{v.contactApproved ? `✓ Contact ${money(BONUS_CONTACT)}` : `Approve contact ${money(BONUS_CONTACT)}`}</button>}
                        {meetingValid(v) && <button className={"fl-link" + (v.meetingApproved ? " on" : "")} onClick={() => toggleBonus(v.id, "meetingApproved")}>{v.meetingApproved ? `✓ Meeting ${money(BONUS_MEETING)}` : `Approve meeting ${money(BONUS_MEETING)}`}</button>}
                      </div>
                    )}
                    <div className="fl-card-foot">
                      <span className="fl-stamp">{v.rep ? "Logged by " + v.rep : "No rep recorded"}</span>
                      <div className="fl-card-actions">
                        <button className="fl-link" onClick={() => edit(v)}>Edit</button>
                        {confirmId === v.id ? (
                          <>
                            <button className="fl-link danger" onClick={() => remove(v.id)}>Delete</button>
                            <button className="fl-link" onClick={() => setConfirmId(null)}>Keep</button>
                          </>
                        ) : (
                          <button className="fl-link" onClick={() => setConfirmId(v.id)}>Remove</button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ════════════════════ MY JOBS ════════════════════ */}
      {page === "jobs" && (
        <div className="fl-weekly">
          <p className="fl-foot-note" style={{ marginTop: 0, marginBottom: 14 }}>
            {can.viewAllVisits ? "Every open job across the team" : "Your open jobs"} — flagged ones need attention first. A job gets a ⚑ after {FLAG_AFTER_DAYS} quiet days and clears once {MAX_FOLLOWUPS} follow-ups are logged.
          </p>
          {cadenceDueCount > 0 && (
            <div className="fl-cad-banner">⚑ {cadenceDueCount} job{cadenceDueCount > 1 ? "s have" : " has"} a follow-up step due — handle the ones at the top first.</div>
          )}
          {myJobs.length === 0 ? (
            <div className="fl-empty">No open jobs right now. Log a visit on the Daily Logs tab and it'll show up here with its follow-up plan.</div>
          ) : (
            myJobs.map((v) => (
              <div className={"fl-job" + (isFlagged(v) ? " flag" : "")} key={v.id} style={{ "--accent": STATUS_COLOR[v.status] || "var(--ink-2)" }}>
                <div className="fl-job-top">
                  <div>
                    <h3>{v.company || "(no company)"}</h3>
                    <p className="fl-addr">{[v.address, v.cityStateZip].filter(Boolean).join(", ") || "no address"}</p>
                  </div>
                  <div className="fl-job-right">
                    <span className="fl-status">{v.status}</span>
                    {isFlagged(v) && <span className="fl-flag">⚑ {daysSince(lastActivity(v))}d quiet</span>}
                  </div>
                </div>

                {(() => {
                  const cs = cadenceStatus(v);
                  if (!cs) return null;
                  if (cs.step === "done") return <div className="fl-cad done">✓ Follow-up sequence complete</div>;
                  const dueStr = fmtDate(new Date(cs.due).toISOString().slice(0, 10));
                  const isEmail = cs.step === "email1" || cs.step === "email2";
                  const tSub = cs.step === "email1" ? business.introSubject : business.followSubject;
                  const tBody = cs.step === "email1" ? business.introBody : business.followBody;
                  const mailto = `mailto:${encodeURIComponent(jobEmail(v))}?subject=${encodeURIComponent(fillTemplate(tSub, v, business))}&body=${encodeURIComponent(fillTemplate(tBody, v, business))}`;
                  return (
                    <div className={"fl-cad " + (cs.ready ? (cs.warn ? "warn" : "due") : "wait")}>
                      <div className="fl-cad-row">
                        <span className="fl-cad-step">{isEmail ? "📧 " : cs.step === "call" ? "📞 " : "🚶 "}{cs.label} · {cs.ready ? "DUE NOW" : "due " + dueStr}</span>
                        {cs.ready && isEmail && jobEmail(v) && <a className="fl-cad-mail" href={mailto}>Open email to {jobEmail(v)}</a>}
                      </div>
                      {cs.ready && (
                        logOpen && logOpen.id === v.id && logOpen.step === cs.step ? (
                          <div className="fl-log">
                            <div className="fl-log-chips">
                              {STEP_OUTCOMES[cs.step].map((o) => (
                                <button key={o} className={"fl-chip2" + (logOutcome === o ? " on" : "")} onClick={() => setLogOutcome(o)}>{o}</button>
                              ))}
                            </div>
                            <div className="fl-log-row">
                              <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
                              <input value={logOutcome} placeholder="What happened?" onChange={(e) => setLogOutcome(e.target.value)} />
                              <button className="fl-primary" onClick={() => logStep(v.id, cs.step, logOutcome, logDate)}>Log it</button>
                              <button className="fl-ghost" onClick={() => setLogOpen(null)}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="fl-cad-actions">
                            <button className="fl-job-btn" onClick={() => { setLogOpen({ id: v.id, step: cs.step }); setLogDate(toLocalInput(new Date()).slice(0, 10)); setLogOutcome(""); }}>{STEP_ACTION[cs.step]}</button>
                          </div>
                        )
                      )}
                    </div>
                  );
                })()}

                <div className="fl-job-bar">
                  <span>{followUpCount(v)}/{MAX_FOLLOWUPS} follow-ups</span>
                  <div className="fl-track">
                    {Array.from({ length: MAX_FOLLOWUPS }).map((_, i) => (
                      <span key={i} className={"fl-pip" + (i < followUpCount(v) ? " on" : "")} />
                    ))}
                  </div>
                  {can.viewAllVisits && v.rep && <span className="fl-job-rep">{v.rep}</span>}
                </div>

                {v.nextAction && <p className="fl-next"><strong>To do:</strong> {v.nextAction}</p>}
                {v.notes && <p className="fl-notes">{v.notes}</p>}

                {followUpCount(v) > 0 && (
                  <div className="fl-fu-list">
                    {followUps(v).map((f) => (
                      <div className="fl-fu-row" key={f.id}>
                        <span className="fl-fu-meta">{fmtDate(f.date)} · {f.type}</span>
                        <span className="fl-fu-note">{f.note}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="fl-job-foot">
                  {fuOpen === v.id ? (
                    <div className="fl-fu-form">
                      <input type="date" value={fuDraft.date} onChange={(e) => setFuDraft((d) => ({ ...d, date: e.target.value }))} />
                      <Seg value={fuDraft.type} options={FOLLOWUPS.slice(1)} onChange={(t) => setFuDraft((d) => ({ ...d, type: t }))} />
                      <input value={fuDraft.note} placeholder="What happened / what's next" onChange={(e) => setFuDraft((d) => ({ ...d, note: e.target.value }))} />
                      <button className="fl-primary" onClick={() => logFollowUp(v.id)}>Save follow-up</button>
                      <button className="fl-ghost" onClick={() => setFuOpen(null)}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <button className="fl-job-btn" onClick={() => { setFuOpen(v.id); setFuDraft({ date: toLocalInput(new Date()).slice(0, 10), type: "Call", note: "" }); }}>+ Log follow-up</button>
                      <button className="fl-link" onClick={() => setJobStatus(v.id, "Won")}>Mark won</button>
                      <button className="fl-link" onClick={() => setJobStatus(v.id, "Lost")}>Mark lost</button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ════════════════════ WEEKLY ════════════════════ */}
      {page === "weekly" && (
        <div className="fl-weekly">
          <div className="fl-weekbar">
            <button className="fl-wk-nav" onClick={() => shiftWeek(-7)}>‹ Prev</button>
            <div className="fl-wk-label">
              <span className="fl-wk-eyebrow">Week of</span>
              <strong>{weekRange}</strong>
            </div>
            <button className="fl-wk-nav" onClick={() => shiftWeek(7)}>Next ›</button>
            <button className="fl-wk-today" onClick={() => { setWeekAnchor(toLocalInput(new Date()).slice(0, 10)); setOpenEmp(null); }}>This week</button>
          </div>

          {visits.length === 0 ? (
            <div className="fl-empty">No visits logged yet. Log some on the Daily Logs tab and they'll total up here by rep.</div>
          ) : (
            <>
              <div className="fl-emp-card team">
                <div className="fl-emp-head">
                  <h3>Team total</h3>
                  <span className="fl-emp-count">{teamStats.contacted} contacted</span>
                </div>
                <MetricGrid stats={teamStats} />
              </div>

              <p className="fl-sub" style={{ marginTop: 6 }}>By employee</p>
              {allReps.map((rep) => {
                const rv = weekVisits.filter((v) => repName(v) === rep);
                const st = statsFor(rv);
                const open = openEmp === rep;
                return (
                  <div className="fl-emp-card" key={rep}>
                    <button className="fl-emp-head btn" onClick={() => setOpenEmp(open ? null : rep)}>
                      <h3>{rep}</h3>
                      <span className="fl-emp-count">{st.contacted} this week {open ? "▾" : "▸"}</span>
                    </button>
                    <MetricGrid stats={st} />
                    {open && (
                      <div className="fl-emp-detail">
                        {rv.length === 0 ? (
                          <p className="fl-emp-none">No visits logged in this week.</p>
                        ) : (
                          rv.map((v) => (
                            <div className="fl-emp-row" key={v.id}>
                              <span className="fl-emp-co">{v.company || "(no company)"}</span>
                              <span className="fl-emp-tags">
                                {v.contactType} · {v.status}
                                {v.interestLevel ? ` · interest ${v.interestLevel}` : ""}
                                {v.followUpNeeded === "Yes" ? " · follow-up" : ""}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
          <p className="fl-foot-note">Totals update automatically from every visit logged that week. A "hot lead" is interest level {HOT_LEAD_MIN}+; a "closed job" is status Won.</p>
        </div>
      )}

      {/* ════════════════════ COMMISSIONS ════════════════════ */}
      {page === "commissions" && (
        <div className={can.manageInvoices ? "fl-grid" : "fl-weekly"}>
          {can.manageInvoices && (
            <section className="fl-panel">
              <div className="fl-panel-head"><h2>{invForm.id ? "Edit invoice" : "Add invoice"}</h2></div>
              <div className="fl-form">
                <p className="fl-sub" style={{ marginTop: 0 }}>From the invoices app</p>
                <input type="file" accept=".csv,text/csv" ref={csvInputRef} onChange={onCsvFile} style={{ display: "none" }} />
                <button className="fl-job-btn" style={{ width: "100%", marginBottom: 6 }} onClick={() => csvInputRef.current && csvInputRef.current.click()}>⬆ Upload invoices CSV</button>
                <p className="fl-hint">Export a CSV from your invoices app with the address and profit per job, then upload it here. Or enter one below.</p>
                {csvError && <p className="fl-error">{csvError}</p>}
                <div className="fl-two">
                  <Field label="Invoice #"><input value={invForm.invoiceNo} placeholder="1042" onChange={(e) => setInvField("invoiceNo", e.target.value)} /></Field>
                  <Field label="Date"><input type="date" value={invForm.date} onChange={(e) => setInvField("date", e.target.value)} /></Field>
                </div>
                <Field label="Company"><input list="fl-companies" value={invForm.company} placeholder="Acme Manufacturing" onChange={(e) => setInvField("company", e.target.value)} /></Field>
                <Field label="Job address (links to the rep)">
                  <input list="fl-addrs" value={invForm.address} placeholder="123 Industrial Rd" onChange={(e) => setInvField("address", e.target.value)} />
                </Field>
                <div className="fl-two">
                  <Field label="Invoice total ($)"><input value={invForm.total} inputMode="decimal" placeholder="0.00" onChange={(e) => setInvField("total", e.target.value)} /></Field>
                  <Field label="Profit ($)"><input value={invForm.profit} inputMode="decimal" placeholder="0.00" onChange={(e) => setInvField("profit", e.target.value)} /></Field>
                </div>
                <Field label="Assign rep (leave blank to auto-match by address)">
                  <select value={invForm.repOverride} onChange={(e) => setInvField("repOverride", e.target.value)}>
                    <option value="">Auto-match by address</option>
                    {Array.from(new Set([...people.map((p) => p.name), ...visits.map((v) => v.rep)].map((s) => (s || "").trim()).filter(Boolean))).sort().map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>

                <Field label="Approved? (10% pays only when approved)">
                  <Seg value={invForm.approved === false ? "No" : "Yes"} options={["Yes", "No"]} onChange={(v) => setInvField("approved", v === "Yes")} />
                </Field>

                <div className={"fl-match" + (previewRep ? " ok" : " none")}>
                  {previewRep
                    ? <>Royalty → <strong>{previewRep}</strong> · 10% of job total = <strong>{money(((COMMISSION_BASE === "total" ? Number(invForm.total) : Number(invForm.profit)) || 0) * COMMISSION_RATE)}</strong></>
                    : "No matching visit yet — pick the address from the list or assign a rep above."}
                </div>

                {invError && <p className="fl-error">{invError}</p>}
                <div className="fl-actions">
                  <button className="fl-primary" onClick={submitInvoice}>{invForm.id ? "Update invoice" : "Add invoice"}</button>
                  {invForm.id && <button className="fl-ghost" onClick={() => { setInvForm(emptyInvoice()); setInvError(""); }}>Cancel</button>}
                </div>
              </div>
            </section>
          )}

          <section className="fl-list">
            {can.manageInvoices && csvData && (
              <div className="fl-import">
                <div className="fl-import-head">
                  <strong>{csvData.fileName}</strong>
                  <span>{csvData.rows.length} rows — match the columns, then import</span>
                </div>
                <div className="fl-map">
                  {[["address", "Address"], ["profit", "Profit"], ["total", "Total"], ["invoice", "Invoice #"], ["date", "Date"], ["company", "Company"]].map(([k, label]) => (
                    <label key={k} className="fl-map-field">
                      <span>{label}</span>
                      <select value={csvMap[k]} onChange={(e) => setCsvMap((m) => ({ ...m, [k]: e.target.value }))}>
                        <option value="">— none —</option>
                        {csvData.fields.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                <table className="fl-prev">
                  <thead><tr><th>Address</th><th className="r">Job total</th><th>Links to rep</th><th className="r">10%</th></tr></thead>
                  <tbody>
                    {csvData.rows.slice(0, 6).map((r, i) => {
                      const addr = csvMap.address ? r[csvMap.address] : "";
                      const baseAmt = COMMISSION_BASE === "total"
                        ? (csvMap.total ? cleanNum(r[csvMap.total]) : "")
                        : (csvMap.profit ? cleanNum(r[csvMap.profit]) : "");
                      const rep = matchRep({ address: addr, repOverride: "" });
                      return (
                        <tr key={i}>
                          <td>{addr || "—"}</td>
                          <td className="r">{baseAmt === "" ? "—" : money(baseAmt)}</td>
                          <td className={rep ? "ok" : "no"}>{rep || "no match"}</td>
                          <td className="r">{baseAmt === "" ? "—" : money((Number(baseAmt) || 0) * COMMISSION_RATE)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {csvData.rows.length > 6 && <p className="fl-hint">…and {csvData.rows.length - 6} more rows.</p>}
                <div className="fl-actions">
                  <button className="fl-primary" onClick={doImport}>Import {csvData.rows.length} invoices</button>
                  <button className="fl-ghost" onClick={() => { setCsvData(null); setCsvError(""); }}>Cancel</button>
                </div>
              </div>
            )}
            {!can.manageInvoices && (
              <p className="fl-readonly">Your commission statement, <strong>{myName || "sales rep"}</strong> — 10% of profit on every job you walked in. Use Print for a copy.</p>
            )}

            {statements.length === 0 ? (
              <div className="fl-empty">
                {can.manageInvoices
                  ? "Nothing to pay out yet. Upload invoices for the 10% commission, and reps earn bonuses automatically when they log a captured decision-maker contact or a meeting set."
                  : "No earnings credited to you yet."}
              </div>
            ) : (
              <>
                {can.manageInvoices && (
                  <div className="fl-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <p className="fl-sub" style={{ margin: 0, border: "none" }}>Earnings by rep</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="fl-job-btn" onClick={exportActivityCsv}>⬇ Export activity CSV</button>
                      <button className="fl-job-btn" onClick={() => printStatement("ALL")}>Print all statements</button>
                    </div>
                  </div>
                )}
                {statements.map((s) => (
                  <div className="fl-emp-card" key={s.rep} style={{ borderTopColor: "var(--gold)" }}>
                    <div className="fl-emp-head">
                      <h3>{s.rep}</h3>
                      <button className="fl-link" onClick={() => printStatement(s.rep)}>Print statement</button>
                    </div>
                    <div className="fl-comm-summary">
                      <div><span className="fl-comm-num">{money(s.totalCommission)}</span><span className="fl-comm-lbl">commission (10%)</span></div>
                      <div><span className="fl-comm-num">{money(s.bonus.total)}</span><span className="fl-comm-lbl">{s.bonus.contacts} contacts · {s.bonus.meetings} meetings</span></div>
                      <div className="hot"><span className="fl-comm-num">{money(s.totalOwed)}</span><span className="fl-comm-lbl">total owed</span></div>
                    </div>
                    <div className="fl-fu-list">
                      {s.rows.map((r) => (
                        <div className="fl-fu-row" key={r.id}>
                          <span className="fl-fu-meta">{r.date ? fmtDate(r.date) : "—"}{r.invoiceNo ? ` · #${r.invoiceNo}` : ""}</span>
                          <span className="fl-fu-note">{r.company || r.address}</span>
                          <span className="fl-comm-amt">{money(r.commission)}</span>
                        </div>
                      ))}
                      {s.bonus.contacts > 0 && (
                        <div className="fl-fu-row"><span className="fl-fu-meta">Decision-maker contacts</span><span className="fl-fu-note">{s.bonus.contacts} × {money(BONUS_CONTACT)}</span><span className="fl-comm-amt">{money(s.bonus.contactPay)}</span></div>
                      )}
                      {s.bonus.meetings > 0 && (
                        <div className="fl-fu-row"><span className="fl-fu-meta">Meetings set</span><span className="fl-fu-note">{s.bonus.meetings} × {money(BONUS_MEETING)}</span><span className="fl-comm-amt">{money(s.bonus.meetingPay)}</span></div>
                      )}
                    </div>
                  </div>
                ))}

                {can.manageInvoices && unmatchedInv.length > 0 && (
                  <div className="fl-emp-card" style={{ borderTopColor: "var(--red)" }}>
                    <div className="fl-emp-head"><h3>Unmatched ({unmatchedInv.length})</h3><span className="fl-emp-count">no rep credited</span></div>
                    <div className="fl-fu-list">
                      {unmatchedInv.map((r) => (
                        <div className="fl-fu-row" key={r.id}>
                          <span className="fl-fu-meta">{r.date ? fmtDate(r.date) : "—"}{r.invoiceNo ? ` · #${r.invoiceNo}` : ""}</span>
                          <span className="fl-fu-note">{r.company || r.address || "(no address)"}</span>
                          <button className="fl-link" onClick={() => editInvoice(r)}>Assign</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {can.manageInvoices && (
                  <>
                    <p className="fl-sub">All invoices · {invoices.length}</p>
                    <div className="fl-cards">
                      {matchedInv.map((r) => (
                        <article className="fl-person" key={r.id} style={{ "--accent": !r.rep ? "var(--red)" : (r.approved ? "var(--gold)" : "var(--amber)") }}>
                          <div>
                            <h3>{r.company || r.address || "(no address)"}{r.invoiceNo ? ` · #${r.invoiceNo}` : ""}{!r.approved && <span className="fl-hold"> ON HOLD</span>}</h3>
                            <p className="fl-pmeta">{r.address} · {r.rep ? `→ ${r.rep} · ${money(r.commission)}` : "no rep matched"} · total {money(r.total)} · profit {money(r.profit)}</p>
                          </div>
                          <div className="fl-card-actions">
                            <button className="fl-link" onClick={() => toggleApproved(r.id)}>{r.approved ? "Hold" : "Approve"}</button>
                            <button className="fl-link" onClick={() => editInvoice(r)}>Edit</button>
                            {invConfirmId === r.id ? (
                              <>
                                <button className="fl-link danger" onClick={() => removeInvoice(r.id)}>Delete</button>
                                <button className="fl-link" onClick={() => setInvConfirmId(null)}>Keep</button>
                              </>
                            ) : (
                              <button className="fl-link" onClick={() => setInvConfirmId(r.id)}>Remove</button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            <p className="fl-foot-note">Commission is {Math.round(COMMISSION_RATE * 100)}% of the total approved job, credited to whichever rep most recently logged that address (the newest claim wins). Pick the address from the list when entering an invoice and it links automatically; otherwise assign the rep by hand.</p>
          </section>

          <datalist id="fl-addrs">{knownAddresses.map((a, i) => <option key={i} value={a} />)}</datalist>
          <datalist id="fl-companies">{knownCompanies.map((c, i) => <option key={i} value={c} />)}</datalist>
        </div>
      )}

      {/* ════════════════════ APPROVALS (verify everything) ════════════════════ */}
      {page === "approvals" && (
        <div className="fl-weekly">
          {pendingMeetings.length > 0 && (
            <div className="fl-bignote">🔔 {pendingMeetings.length} meeting{pendingMeetings.length > 1 ? "s" : ""} scheduled — verify the {money(BONUS_MEETING)} bonus{pendingMeetings.length > 1 ? "es" : ""} below.</div>
          )}
          <p className="fl-foot-note" style={{ marginTop: 0, marginBottom: 14 }}>Verify each item to release it. Anything you approve here flows straight onto the rep's commission statement; nothing pays until it's checked off.</p>

          {pendingCount === 0 ? (
            <div className="fl-empty">Nothing waiting to verify — you're all caught up.</div>
          ) : (
            <>
              {pendingMeetings.length > 0 && (
                <>
                  <p className="fl-sub">Meetings · {money(BONUS_MEETING)} each</p>
                  {pendingMeetings.map((v) => (
                    <div className="fl-appr-row" key={"m" + v.id}>
                      <div>
                        <strong>{v.rep || "(no rep)"}</strong> — meeting with {v.meetingWith || "—"}
                        <p className="fl-pmeta">{[v.company, v.address].filter(Boolean).join(" · ")}{v.meetingAt ? " · " + fmtVisit(v.meetingAt) : ""}</p>
                      </div>
                      <div className="fl-appr-right">
                        <span className="fl-appr-amt">{money(BONUS_MEETING)}</span>
                        <button className="fl-job-btn" onClick={() => toggleBonus(v.id, "meetingApproved")}>Verify</button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {pendingContacts.length > 0 && (
                <>
                  <p className="fl-sub">Decision-maker contacts · {money(BONUS_CONTACT)} each</p>
                  {pendingContacts.map((v) => (
                    <div className="fl-appr-row" key={"c" + v.id}>
                      <div>
                        <strong>{v.rep || "(no rep)"}</strong> — contact: {v.dmName || "—"}
                        <p className="fl-pmeta">{[v.company, v.address].filter(Boolean).join(" · ")}{(v.dmPhone || v.dmEmail) ? " · " + [v.dmPhone, v.dmEmail].filter(Boolean).join(" / ") : ""}</p>
                      </div>
                      <div className="fl-appr-right">
                        <span className="fl-appr-amt">{money(BONUS_CONTACT)}</span>
                        <button className="fl-job-btn" onClick={() => toggleBonus(v.id, "contactApproved")}>Verify</button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {pendingComm.length > 0 && (
                <>
                  <p className="fl-sub">Commissions · {Math.round(COMMISSION_RATE * 100)}% of approved job total</p>
                  {pendingComm.map((m) => (
                    <div className="fl-appr-row" key={"i" + m.id}>
                      <div>
                        <strong>{m.rep}</strong> — {m.company || m.address || "(job)"}{m.invoiceNo ? ` · #${m.invoiceNo}` : ""}
                        <p className="fl-pmeta">{m.address} · job total {money(m.total)}</p>
                      </div>
                      <div className="fl-appr-right">
                        <span className="fl-appr-amt">{money(potentialCommission(m))}</span>
                        <button className="fl-job-btn" onClick={() => toggleApproved(m.id)}>Verify</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ════════════════════ SOPs / SCRIPTS ════════════════════ */}
      {page === "sops" && (
        <div className="fl-weekly">
          <p className="fl-foot-note" style={{ marginTop: 0, marginBottom: 14 }}>Field scripts and how to present yourself. Tap a section to open it. Remember: log every interaction in Daily Logs, and write your name on every card so the lead traces back to you.</p>
          {can.manageInvoices && (
            <div className="fl-sop" style={{ borderLeft: "4px solid var(--amber-deep)" }}>
              <button className="fl-sop-head" onClick={() => setSopOpen(sopOpen === MANAGER_SOP.id ? null : MANAGER_SOP.id)}>
                <span>{MANAGER_SOP.title}</span><span className="fl-sop-toggle">{sopOpen === MANAGER_SOP.id ? "−" : "+"}</span>
              </button>
              {sopOpen === MANAGER_SOP.id && (
                <div className="fl-sop-body">
                  <p className="fl-sop-intro">{MANAGER_SOP.intro}</p>
                  {MANAGER_SOP.items.map((it, i) => (
                    <div className="fl-sop-item" key={i}><h4>{it.h}</h4><p>{it.p}</p></div>
                  ))}
                </div>
              )}
            </div>
          )}
          {SOP_SECTIONS.map((sec) => (
            <div className="fl-sop" key={sec.id}>
              <button className="fl-sop-head" onClick={() => setSopOpen(sopOpen === sec.id ? null : sec.id)}>
                <span>{sec.title}</span><span className="fl-sop-toggle">{sopOpen === sec.id ? "−" : "+"}</span>
              </button>
              {sopOpen === sec.id && (
                <div className="fl-sop-body">
                  {sec.intro && <p className="fl-sop-intro">{sec.intro}</p>}
                  {sec.items.map((it, i) => (
                    <div className="fl-sop-item" key={i}>
                      <h4>{it.h}</h4>
                      {it.p && <p>{it.p}</p>}
                      {it.say && <blockquote className="fl-sop-say">"{it.say}"</blockquote>}
                      {it.log && <p className="fl-sop-log"><strong>Log:</strong> {it.log.join("  ·  ")}</p>}
                      {it.after && <p className="fl-sop-after">{it.after}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════ BUSINESS PROFILE ════════════════════ */}
      {page === "business" && (
        <div className="fl-grid">
          <section className="fl-panel">
            <div className="fl-panel-head"><h2>Business profile</h2></div>
            <div className="fl-form">
              <p className="fl-hint">Your company's identity and branding — this is what goes out on your automated emails and statements (not the ReyGuild platform name).</p>
              <Field label="Business name"><input value={bizForm.name} placeholder="Acme Service Co." onChange={(e) => setBizField("name", e.target.value)} /></Field>
              <Field label="Logo (for emails)">
                <input type="file" accept="image/*" ref={bizLogoRef} onChange={onBizLogo} style={{ display: "none" }} />
                <div className="fl-bizlogo">
                  {bizForm.logo ? <img src={bizForm.logo} alt="logo" /> : <span className="fl-bizlogo-empty">No logo yet</span>}
                  <button className="fl-job-btn" onClick={() => bizLogoRef.current && bizLogoRef.current.click()}>Upload logo</button>
                  {bizForm.logo && <button className="fl-ghost" onClick={() => setBizField("logo", "")}>Remove</button>}
                </div>
              </Field>
              <div className="fl-two">
                <Field label="Sending / reply email"><input value={bizForm.email} placeholder="hello@acme.com" onChange={(e) => setBizField("email", e.target.value)} /></Field>
                <Field label="Phone"><input value={bizForm.phone} placeholder="(303) 555-0100" onChange={(e) => setBizField("phone", e.target.value)} /></Field>
              </div>
              <Field label="Address"><input value={bizForm.address} placeholder="123 Main St, Denver, CO" onChange={(e) => setBizField("address", e.target.value)} /></Field>
              <Field label="Website"><input value={bizForm.website} placeholder="acmeservice.com" onChange={(e) => setBizField("website", e.target.value)} /></Field>
              <Field label="Email signature"><textarea rows={2} value={bizForm.signature} placeholder="The Acme Team" onChange={(e) => setBizField("signature", e.target.value)} /></Field>

              <p className="fl-sub">Automated email templates</p>
              <Field label="Intro email — subject (day 5)"><input value={bizForm.introSubject} onChange={(e) => setBizField("introSubject", e.target.value)} /></Field>
              <Field label="Intro email — body"><textarea rows={4} value={bizForm.introBody} onChange={(e) => setBizField("introBody", e.target.value)} /></Field>
              <Field label="Follow-up email — subject (day 10)"><input value={bizForm.followSubject} onChange={(e) => setBizField("followSubject", e.target.value)} /></Field>
              <Field label="Follow-up email — body"><textarea rows={4} value={bizForm.followBody} onChange={(e) => setBizField("followBody", e.target.value)} /></Field>
              <p className="fl-hint">Placeholders fill in automatically: {"{business}"}, {"{contact}"}, {"{company}"}, {"{rep}"}, {"{signature}"}.</p>

              <div className="fl-actions"><button className="fl-primary" onClick={saveBusiness}>Save business profile</button></div>
            </div>
          </section>

          <section className="fl-list">
            <p className="fl-sub">Email preview — intro</p>
            <div className="fl-emailprev">
              {bizForm.logo && <img className="fl-emailprev-logo" src={bizForm.logo} alt="logo" />}
              <div className="fl-emailprev-sub">{fillTemplate(bizForm.introSubject, { rep: "Alex", company: "Sample Co.", dmName: "Jordan" }, bizForm)}</div>
              <pre className="fl-emailprev-body">{fillTemplate(bizForm.introBody, { rep: "Alex", company: "Sample Co.", dmName: "Jordan" }, bizForm)}</pre>
              <div className="fl-emailprev-foot">{[bizForm.name, bizForm.phone, bizForm.email, bizForm.website].filter(Boolean).join("  ·  ") || "Fill in your business info to brand this footer"}</div>
            </div>
            <p className="fl-foot-note">When the email backend is connected, these templates send automatically on the cadence from your business address. Until then, each due email opens pre-filled from this template on the rep's My Jobs page.</p>
          </section>
        </div>
      )}

      {/* ════════════════════ HELP CENTER ════════════════════ */}
      {page === "messages" && (
        <div className="fl-weekly">
          <div className="fl-hero">
            <h2>Team Messages</h2>
            <p>Messages for your company. Everyone on your team can post and read here; the owner sees everything.</p>
          </div>
          <div className="fl-panel" style={{ padding: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {messages.length === 0 ? (
                <div className="fl-empty">No messages yet. Post the first one below.</div>
              ) : (
                messages.slice().sort((a, b) => a.ts - b.ts).map((m) => (
                  <div key={m.id} style={{ borderLeft: "3px solid var(--amber-deep)", padding: "6px 12px", background: "var(--paper-2)", borderRadius: 2 }}>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 3 }}>
                      <strong style={{ color: "var(--ink)" }}>{m.fromName || "Owner"}</strong> · {m.fromRole} · {new Date(m.ts).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 14, color: "var(--ink)", whiteSpace: "pre-wrap" }}>{m.text}</div>
                  </div>
                ))
              )}
            </div>
            <textarea rows={3} value={msgText} onChange={(e) => setMsgText(e.target.value)} placeholder="Write a message to your team…" style={{ width: "100%", boxSizing: "border-box", border: "1px solid var(--line)", borderRadius: 2, padding: 10, fontFamily: "inherit", fontSize: 14, resize: "vertical" }} />
            <div style={{ marginTop: 10 }}>
              <button className="fl-primary" onClick={postMessage} disabled={!msgText.trim()}>Send message</button>
            </div>
          </div>
        </div>
      )}

      {page === "help" && (
        <div className="fl-weekly">
          <div className="fl-hero">
            <h2>How can we help?</h2>
            <p>Search the help center below. If you can't find what you need, email our team.</p>
            <input className="fl-bigsearch" value={helpQuery} placeholder="Search help…" onChange={(e) => setHelpQuery(e.target.value)} />
          </div>
          {(() => {
            const matches = HELP_ARTICLES.filter((a) => !helpQuery.trim() || (a.title + " " + a.body).toLowerCase().includes(helpQuery.toLowerCase()));
            return matches.length === 0 ? (
              <div className="fl-empty">No articles match "{helpQuery}". Email us and we'll help you directly.</div>
            ) : matches.map((a) => (
              <div className="fl-sop" key={a.id}>
                <button className="fl-sop-head" onClick={() => setHelpOpen(helpOpen === a.id ? null : a.id)}>
                  <span>{a.title}</span><span className="fl-sop-toggle">{helpOpen === a.id ? "−" : "+"}</span>
                </button>
                {helpOpen === a.id && <div className="fl-sop-body"><p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)" }}>{a.body}</p></div>}
              </div>
            ));
          })()}
          <div className="fl-support">
            <strong>Still need help?</strong>
            <p className="fl-hint" style={{ margin: "4px 0 10px" }}>Reach our support team and we'll get back to you.</p>
            <a className="fl-job-btn" href={`mailto:${SUPPORT_EMAIL}`}>Email {SUPPORT_EMAIL}</a>
          </div>
        </div>
      )}

      {/* ════════════════════ ACCOUNT / BILLING ════════════════════ */}
      {page === "account" && (
        <div className="fl-weekly">
          <div className="fl-acct-card">
            <p className="fl-sub" style={{ marginTop: 0 }}>Subscription</p>
            <p className="fl-acct-status">Plan: <strong>ReyGuild Pro</strong> · <span className="fl-acct-active">Active</span></p>
            <p className="fl-hint">Pause or cancel any time — no long-term contract.</p>
            <div className="fl-actions">
              <a className="fl-primary" href={BILLING_PORTAL} target="_blank" rel="noreferrer" style={{ textAlign: "center", textDecoration: "none" }}>Manage subscription</a>
              <button className="fl-ghost" onClick={() => setBillingNote("Pausing keeps your data but stops billing until you resume. This opens your secure billing portal once Stripe is connected — for now, email " + SUPPORT_EMAIL + " to pause.")}>Pause</button>
              <button className="fl-ghost" onClick={() => setBillingNote("Cancelling stops billing at the end of the current period; your data stays for 30 days. This opens your secure billing portal once Stripe is connected — for now, email " + SUPPORT_EMAIL + " to cancel.")}>Cancel</button>
            </div>
            {billingNote && <p className="fl-acct-note">{billingNote}</p>}
          </div>

          <div className="fl-acct-card">
            <p className="fl-sub" style={{ marginTop: 0 }}>Legal</p>
            <div className="fl-legal-links">
              <a href={LEGAL.terms} target="_blank" rel="noreferrer">Terms of Service</a>
              <a href={LEGAL.privacy} target="_blank" rel="noreferrer">Privacy Policy</a>
              <a href={LEGAL.conditions} target="_blank" rel="noreferrer">Terms &amp; Conditions</a>
              <a href={LEGAL.cookies} target="_blank" rel="noreferrer">Cookie Policy</a>
            </div>
          </div>

          <div className="fl-acct-card">
            <p className="fl-sub" style={{ marginTop: 0 }}>Support</p>
            <p className="fl-hint">Questions or an issue? We're here to help.</p>
            <a className="fl-job-btn" href={`mailto:${SUPPORT_EMAIL}`}>Email {SUPPORT_EMAIL}</a>
          </div>
        </div>
      )}

      {/* ════════════════════ EMPLOYEES ════════════════════ */}
      {page === "employees" && (
        <div className={can.managePeople ? "fl-grid" : "fl-weekly"}>
          {can.managePeople && (
            <section className="fl-panel">
              <div className="fl-panel-head">
                <h2>{pform.id ? "Edit person" : "Add person"}</h2>
              </div>
              <div className="fl-form">
                <Field label="Name"><input value={pform.name} placeholder="Full name" onChange={(e) => setPField("name", e.target.value)} /></Field>
                <Field label="Role"><Seg value={pform.role} options={ROLES} onChange={(v) => setPField("role", v)} /></Field>
                <Field label="Address"><input value={pform.address} placeholder="Home or office address" onChange={(e) => setPField("address", e.target.value)} /></Field>
                <Field label="Email"><input value={pform.email} placeholder="name@company.com" onChange={(e) => setPField("email", e.target.value)} /></Field>
                {pform.role === "Sales Rep" && (
                  <Field label="Daily location quota (0 = off)"><input value={pform.quota} inputMode="numeric" placeholder="e.g. 20" onChange={(e) => setPField("quota", e.target.value.replace(/[^0-9]/g, ""))} /></Field>
                )}
                {pError && <p className="fl-error">{pError}</p>}
                <div className="fl-actions">
                  <button className="fl-primary" onClick={submitPerson}>{pform.id ? "Update person" : "Add person"}</button>
                  {pform.id && <button className="fl-ghost" onClick={() => { setPform(emptyPerson()); setPError(""); }}>Cancel</button>}
                </div>
              </div>
            </section>
          )}

          <section className="fl-list">
            {!can.managePeople && (
              <p className="fl-readonly">You're viewing the team as <strong>{role}</strong>. You can see everyone, but only the Owner can add people or change roles.</p>
            )}
            {people.length === 0 ? (
              <div className="fl-empty">No one added yet. Add the owner, an admin, and your sales reps — these are the people who can use and control the system.</div>
            ) : (
              <div className="fl-cards">
                {ROLES.map((r) => {
                  const group = people.filter((p) => p.role === r);
                  if (group.length === 0) return null;
                  return (
                    <div key={r}>
                      <p className="fl-sub">{r}{group.length > 1 ? "s" : ""} · {group.length}</p>
                      {group.map((p) => (
                        <article className="fl-person" key={p.id} style={{ "--accent": ROLE_COLOR[p.role] || "var(--ink-2)" }}>
                          <div>
                            <h3>{p.name || "(no name)"}</h3>
                            <p className="fl-pmeta">{[p.email, p.address].filter(Boolean).join(" · ") || "no contact details"}</p>
                            {can.manageInvoices && p.role === "Sales Rep" && (
                              <div className="fl-pquota">Daily quota <input type="number" min="0" value={p.quota || 0} onChange={(e) => setQuota(p.id, e.target.value)} /> locations {p.quota > 0 ? "· on" : "· off"}</div>
                            )}
                          </div>
                          {can.managePeople && (
                            <div className="fl-card-actions">
                              <button className="fl-link" onClick={() => editPerson(p)}>Edit</button>
                              {pConfirmId === p.id ? (
                                <>
                                  <button className="fl-link danger" onClick={() => removePerson(p.id)}>Delete</button>
                                  <button className="fl-link" onClick={() => setPConfirmId(null)}>Keep</button>
                                </>
                              ) : (
                                <button className="fl-link" onClick={() => setPConfirmId(p.id)}>Remove</button>
                              )}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
      <footer className="fl-footer">
        <span>© ReyGuild</span>
        <a href={LEGAL.terms} target="_blank" rel="noreferrer">Terms</a>
        <a href={LEGAL.privacy} target="_blank" rel="noreferrer">Privacy</a>
        <a href={LEGAL.conditions} target="_blank" rel="noreferrer">Terms &amp; Conditions</a>
        <a href={LEGAL.cookies} target="_blank" rel="noreferrer">Cookies</a>
        <a href={`mailto:${SUPPORT_EMAIL}`}>Support</a>
      </footer>
      </div>

      {/* ════════════════════ PRINT AREA (only shows on print) ════════════════════ */}
      <div className="fl-print">
        {printList.length === 0 ? (
          <p>No commission to print for this selection.</p>
        ) : (
          printList.map((s) => (
            <div className="fl-stmt" key={s.rep}>
              <div className="fl-stmt-head">
                <div>
                  <h2>ReyGuild</h2>
                  <p>Commission Statement</p>
                </div>
                <div className="fl-stmt-meta">
                  <div><strong>{s.rep}</strong></div>
                  <div>Printed {new Date().toLocaleDateString()}</div>
                </div>
              </div>
              <table className="fl-stmt-table">
                <thead>
                  <tr><th>Date</th><th>Invoice</th><th>Company</th><th>Address</th><th className="r">Total</th><th className="r">Profit</th><th className="r">Commission</th></tr>
                </thead>
                <tbody>
                  {s.rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.date ? fmtDate(r.date) : "—"}</td>
                      <td>{r.invoiceNo || "—"}</td>
                      <td>{r.company || "—"}</td>
                      <td>{r.address || "—"}</td>
                      <td className="r">{money(r.total)}</td>
                      <td className="r">{money(r.profit)}</td>
                      <td className="r">{money(r.commission)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={5}></td><td className="r"><strong>{money(s.totalProfit)}</strong></td><td className="r"><strong>{money(s.totalCommission)}</strong></td></tr>
                </tfoot>
              </table>
              {s.bonus.total > 0 && (
                <table className="fl-stmt-table" style={{ marginTop: 14 }}>
                  <thead><tr><th>Activity bonus</th><th className="r">Count</th><th className="r">Rate</th><th className="r">Amount</th></tr></thead>
                  <tbody>
                    {s.bonus.contacts > 0 && <tr><td>Decision-maker contacts captured</td><td className="r">{s.bonus.contacts}</td><td className="r">{money(BONUS_CONTACT)}</td><td className="r">{money(s.bonus.contactPay)}</td></tr>}
                    {s.bonus.meetings > 0 && <tr><td>Meetings set</td><td className="r">{s.bonus.meetings}</td><td className="r">{money(BONUS_MEETING)}</td><td className="r">{money(s.bonus.meetingPay)}</td></tr>}
                  </tbody>
                </table>
              )}
              <p className="fl-stmt-note">Commission {Math.round(COMMISSION_RATE * 100)}% of approved job total ({money(s.totalCommission)}) plus activity bonuses ({money(s.bonus.total)}). <strong>Total due this statement: {money(s.totalOwed)}.</strong></p>
              <div className="fl-stmt-sign"><span>Rep signature</span><span>Approved by</span></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="fl-field"><span>{label}</span>{children}</label>;
}
function Seg({ value, options, onChange, clearable }) {
  return (
    <div className="fl-seg">
      {options.map((o) => (
        <button key={o} className={"fl-seg-btn" + (value === o ? " on" : "")}
          onClick={() => onChange(clearable && value === o ? "" : o)}>{o}</button>
      ))}
    </div>
  );
}
function MetricGrid({ stats }) {
  return (
    <div className="fl-metrics">
      {METRICS.map(([k, label]) => (
        <div className="fl-metric" key={k}>
          <span className="fl-metric-num">{stats[k]}</span>
          <span className="fl-metric-lbl">{label}</span>
        </div>
      ))}
    </div>
  );
}

const CSS = `
.fl-root *{box-sizing:border-box}
.fl-root{
  --ink:#16243F; --ink-2:#3c4a66; --paper:#F5F3EE; --paper-2:#FCFBF6;
  --field-bg:#ffffff;
  --line:#ddd6c4; --amber:#16243F; --amber-deep:#b9842a;
  --gold:#DFA63A; --red:#a83a30; --blue:#16243F; --muted:#7a7460;
  font-family:'Times New Roman',Times,serif; color:var(--ink);
  background:var(--paper); min-height:100%; padding:18px; color-scheme:light;
}
.fl-header{display:flex; justify-content:space-between; align-items:flex-end; gap:16px; flex-wrap:wrap; padding-bottom:14px; border-bottom:1px solid var(--line)}
.fl-wordmark{display:flex; align-items:center; gap:14px}
.fl-crest{height:60px; width:auto; display:block}
.fl-lock{display:flex; flex-direction:column; align-items:center; line-height:1}
.fl-brand{font-family:'Times New Roman',Times,serif; font-weight:700; font-size:34px; letter-spacing:.01em; line-height:1}
.fl-brand-rey{color:var(--amber-deep)}
.fl-brand-guild{color:var(--ink)}
.fl-tagline{margin:5px 0 0; font-size:10px; color:var(--ink-2); letter-spacing:.22em; text-transform:uppercase; white-space:nowrap}
@media(max-width:560px){.fl-crest{height:46px}.fl-brand{font-size:26px}.fl-tagline{font-size:8px; letter-spacing:.16em}}
.fl-stats{display:flex; gap:10px}
.fl-chip{background:var(--paper-2); border:1px solid var(--line); border-radius:2px; padding:8px 14px; min-width:88px; text-align:center}
.fl-chip.due{background:var(--amber); border-color:var(--amber)}
.fl-chip-num{display:block; font-family:'Times New Roman',Times,serif; font-weight:800; font-size:24px; line-height:1}
.fl-chip-lbl{font-family:'Times New Roman',Times,serif; font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:var(--muted)}
.fl-chip.due .fl-chip-lbl{color:#fff}
.fl-chip.due .fl-chip-num{color:#fff}

.fl-nav{display:flex; gap:4px; margin:16px 0 18px; border-bottom:1px solid var(--line)}
.fl-tab{background:none; border:none; border-bottom:3px solid transparent; padding:10px 16px; font-family:'Times New Roman',Times,serif; font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); cursor:pointer; margin-bottom:-1px}
.fl-tab.on{color:var(--ink); border-bottom-color:var(--amber-deep)}
.fl-menuwrap{position:relative}
.fl-menubtn{background:var(--ink); color:var(--paper-2); border:none; border-radius:3px 3px 0 0; padding:11px 16px; font-family:'Times New Roman',Times,serif; font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:.06em; cursor:pointer; margin-bottom:-1px; white-space:nowrap}
.fl-menu-ic{font-size:14px} .fl-menu-car{font-size:10px; opacity:.8}
.fl-menu-overlay{position:fixed; inset:0; z-index:40}
.fl-menu{position:absolute; top:calc(100% + 4px); left:0; z-index:41; background:var(--paper-2); border:1px solid var(--line); border-radius:4px; box-shadow:0 8px 28px rgba(0,0,0,.18); min-width:210px; padding:6px; display:flex; flex-direction:column}
.fl-menu-item{text-align:left; background:none; border:none; padding:11px 14px; font-family:'Times New Roman',Times,serif; font-weight:700; font-size:13px; color:var(--ink); cursor:pointer; border-radius:3px; text-transform:uppercase; letter-spacing:.04em}
.fl-menu-item:hover{background:var(--paper)}
.fl-menu-item.on{background:var(--ink); color:var(--gold)}
.fl-msgtab{background:none; border:none; border-bottom:3px solid transparent; padding:11px 16px; font-family:'Times New Roman',Times,serif; font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); cursor:pointer; margin-bottom:-1px; margin-left:auto; white-space:nowrap}
.fl-msgtab.on{color:var(--ink); border-bottom-color:var(--amber-deep)}
.fl-setwrap{position:relative}
.fl-setbtn{background:none; border:none; border-bottom:3px solid transparent; padding:11px 16px; font-family:'Times New Roman',Times,serif; font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); cursor:pointer; margin-bottom:-1px; white-space:nowrap}
.fl-setbtn.on{color:var(--ink); border-bottom-color:var(--amber-deep)}
.fl-setmenu{left:auto; right:0}
@media(max-width:560px){.fl-menu{min-width:64vw}}

.fl-grid{display:grid; grid-template-columns:380px 1fr; gap:20px; align-items:start}
@media(max-width:860px){.fl-grid{grid-template-columns:1fr}}
.fl-panel{background:var(--paper-2); border:1px solid var(--line); border-top:3px solid var(--ink); border-radius:2px; position:sticky; top:18px}
@media(max-width:860px){.fl-panel{position:static}}
.fl-panel-head{display:flex; justify-content:space-between; align-items:center; padding:14px 16px; border-bottom:1px solid var(--line)}
.fl-panel-head h2{font-family:'Times New Roman',Times,serif; font-weight:700; font-size:15px; text-transform:uppercase; letter-spacing:.08em; margin:0}
.fl-collapse{background:none; border:none; font-family:'Times New Roman',Times,serif; font-size:11px; color:var(--muted); cursor:pointer; text-transform:uppercase; letter-spacing:.08em}
.fl-form{padding:16px}
.fl-sub{font-family:'Times New Roman',Times,serif; font-size:11px; text-transform:uppercase; letter-spacing:.12em; color:var(--amber-deep); margin:18px 0 10px; padding-bottom:5px; border-bottom:1px dotted var(--line)}
.fl-form .fl-sub:first-child{margin-top:0}
.fl-two{display:grid; grid-template-columns:1fr 1fr; gap:12px}
.fl-field{display:block; margin-bottom:13px}
.fl-field > span{display:block; font-family:'Times New Roman',Times,serif; font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); margin-bottom:5px}
.fl-field input, .fl-field select, .fl-field textarea{width:100%; padding:9px 10px; border:1px solid var(--line); border-radius:2px; background:var(--field-bg); font-family:'Times New Roman',Times,serif; font-size:14px; color:var(--ink)}
.fl-field input:focus, .fl-field select:focus, .fl-field textarea:focus{outline:none; border-color:var(--gold); box-shadow:0 0 0 2px rgba(223,166,58,.30)}
.fl-field textarea{resize:vertical}
.fl-seg{display:flex; border:1px solid var(--line); border-radius:2px; overflow:hidden}
.fl-seg-btn{flex:1; background:var(--field-bg); border:none; border-right:1px solid var(--line); padding:9px 6px; font-family:'Times New Roman',Times,serif; font-size:11px; cursor:pointer; color:var(--muted); white-space:nowrap}
.fl-seg-btn:last-child{border-right:none}
.fl-seg-btn.on{background:var(--ink); color:var(--paper-2)}
.fl-error{color:var(--red); font-size:13px; margin:0 0 10px}
.fl-actions{display:flex; gap:10px; margin-top:4px}
.fl-primary{flex:1; background:var(--ink); color:var(--paper-2); border:none; border-radius:2px; padding:12px; font-family:'Times New Roman',Times,serif; font-weight:700; font-size:14px; text-transform:uppercase; letter-spacing:.08em; cursor:pointer}
.fl-primary:hover{background:var(--ink-2)}
.fl-ghost{background:none; border:1px solid var(--line); border-radius:2px; padding:12px 16px; font-family:'Times New Roman',Times,serif; font-size:12px; cursor:pointer; color:var(--muted)}

.fl-toolbar{margin-bottom:16px}
.fl-search{width:100%; padding:11px 14px; border:1px solid var(--line); border-radius:2px; background:var(--paper-2); font-family:'Times New Roman',Times,serif; font-size:14px; margin-bottom:10px}
.fl-search:focus{outline:none; border-color:var(--ink)}
.fl-filters{display:flex; flex-wrap:wrap; gap:6px}
.fl-pill{background:var(--paper-2); border:1px solid var(--line); border-radius:2px; padding:6px 11px; font-family:'Times New Roman',Times,serif; font-size:11px; cursor:pointer; color:var(--muted)}
.fl-pill.active{background:var(--ink); color:var(--paper-2); border-color:var(--ink)}

.fl-empty{border:1px dashed var(--line); border-radius:2px; padding:40px 20px; text-align:center; color:var(--muted); font-size:14px; background:var(--paper-2)}
.fl-cards{display:flex; flex-direction:column; gap:12px}
.fl-card{background:var(--paper-2); border:1px solid var(--line); border-left:4px solid var(--accent); border-radius:2px; padding:14px 16px}
.fl-card-top{display:flex; justify-content:space-between; align-items:flex-start; gap:12px}
.fl-card-top h3{font-family:'Times New Roman',Times,serif; font-weight:700; font-size:17px; margin:0}
.fl-addr{font-family:'Times New Roman',Times,serif; font-size:12px; color:var(--muted); margin:3px 0 0}
.fl-status{font-family:'Times New Roman',Times,serif; font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:#fff; background:var(--accent); padding:3px 8px; border-radius:2px; white-space:nowrap}
.fl-due{display:inline-block; margin-top:10px; background:var(--amber); color:var(--ink); font-family:'Times New Roman',Times,serif; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.1em; padding:3px 9px; border-radius:2px}
.fl-meta{display:flex; flex-wrap:wrap; gap:14px; margin-top:10px; font-size:13px; color:var(--ink-2)}
.fl-ts{font-family:'Times New Roman',Times,serif; font-size:12px; color:var(--muted)}
.fl-next{margin:10px 0 0; font-size:13px; color:var(--ink-2)}
.fl-notes{margin:8px 0 0; font-size:13px; line-height:1.5; color:var(--ink-2); border-top:1px dotted var(--line); padding-top:8px}
.fl-card-foot{display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:12px; padding-top:10px; border-top:1px solid var(--line)}
.fl-stamp{font-family:'Times New Roman',Times,serif; font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:var(--amber-deep); border:1px solid var(--amber-deep); padding:3px 7px; border-radius:2px}
.fl-card-actions{display:flex; gap:12px}
.fl-link{background:none; border:none; font-family:'Times New Roman',Times,serif; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); cursor:pointer; padding:0}
.fl-link:hover{color:var(--ink)}
.fl-link.danger{color:var(--red)}

.fl-weekly{max-width:880px}
.fl-weekbar{display:flex; align-items:center; gap:12px; flex-wrap:wrap; background:var(--paper-2); border:1px solid var(--line); border-radius:2px; padding:12px 14px; margin-bottom:16px}
.fl-wk-nav{background:none; border:1px solid var(--line); border-radius:2px; padding:7px 12px; font-family:'Times New Roman',Times,serif; font-size:12px; cursor:pointer; color:var(--ink)}
.fl-wk-label{display:flex; flex-direction:column; flex:1; text-align:center}
.fl-wk-eyebrow{font-family:'Times New Roman',Times,serif; font-size:10px; text-transform:uppercase; letter-spacing:.12em; color:var(--muted)}
.fl-wk-label strong{font-family:'Times New Roman',Times,serif; font-size:16px}
.fl-wk-today{background:var(--ink); color:var(--paper-2); border:none; border-radius:2px; padding:7px 12px; font-family:'Times New Roman',Times,serif; font-size:11px; cursor:pointer; text-transform:uppercase; letter-spacing:.06em}

.fl-emp-card{background:var(--paper-2); border:1px solid var(--line); border-top:3px solid var(--ink); border-radius:2px; padding:14px 16px; margin-bottom:12px}
.fl-emp-card.team{border-top-color:var(--amber-deep); background:#f3eedd}
.fl-emp-head{display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:12px; text-align:left}
.fl-emp-head.btn{background:none; border:none; cursor:pointer; padding:0}
.fl-emp-head h3{font-family:'Times New Roman',Times,serif; font-weight:700; font-size:16px; margin:0; text-transform:uppercase; letter-spacing:.04em}
.fl-emp-count{font-family:'Times New Roman',Times,serif; font-size:12px; color:var(--muted)}
.fl-metrics{display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--line); border:1px solid var(--line); border-radius:2px; overflow:hidden}
@media(min-width:620px){.fl-metrics{grid-template-columns:repeat(9,1fr)}}
.fl-metric{background:var(--paper-2); padding:10px 8px; text-align:center}
.fl-metric-num{display:block; font-family:'Times New Roman',Times,serif; font-weight:800; font-size:22px; line-height:1; color:var(--ink)}
.fl-metric-lbl{display:block; margin-top:4px; font-family:'Times New Roman',Times,serif; font-size:9px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); line-height:1.2}
.fl-emp-detail{margin-top:12px; border-top:1px dotted var(--line); padding-top:10px}
.fl-emp-none{font-size:13px; color:var(--muted); margin:0}
.fl-emp-row{display:flex; justify-content:space-between; gap:12px; padding:6px 0; border-bottom:1px dotted var(--line)}
.fl-emp-row:last-child{border-bottom:none}
.fl-emp-co{font-weight:600; font-size:13px}
.fl-emp-tags{font-family:'Times New Roman',Times,serif; font-size:11px; color:var(--muted); text-align:right}
.fl-foot-note{font-size:12px; color:var(--muted); margin-top:14px; line-height:1.5}
.fl-person{display:flex; justify-content:space-between; align-items:center; gap:12px; background:var(--paper-2); border:1px solid var(--line); border-left:4px solid var(--accent,var(--ink-2)); border-radius:2px; padding:12px 14px; margin-bottom:8px}
.fl-person h3{font-family:'Times New Roman',Times,serif; font-weight:700; font-size:16px; margin:0}
.fl-pmeta{font-family:'Times New Roman',Times,serif; font-size:12px; color:var(--muted); margin:3px 0 0; word-break:break-word}

.fl-actas{display:flex; align-items:center; gap:6px; background:var(--paper-2); border:1px solid var(--line); border-radius:2px; padding:6px 8px}
.fl-actas-lbl{font-family:'Times New Roman',Times,serif; font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:var(--muted)}
.fl-actas select{border:none; background:none; font-family:'Times New Roman',Times,serif; font-size:13px; color:var(--ink); max-width:150px}
.fl-actas-co{font-family:'Times New Roman',Times,serif; font-size:14px; font-weight:700; color:#34507A; white-space:nowrap}
.fl-actas-switch{max-width:118px; font-size:11px; opacity:.75}
.fl-actas select:focus{outline:none}
.fl-rolebadge{font-family:'Times New Roman',Times,serif; font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:#fff; background:var(--accent); padding:3px 7px; border-radius:2px}
.fl-readonly{background:var(--paper-2); border:1px solid var(--line); border-left:4px solid var(--blue); border-radius:2px; padding:10px 14px; font-size:13px; color:var(--ink-2); margin:0 0 14px}
.fl-flag{display:inline-flex; align-items:center; gap:4px; background:var(--red); color:#fff; font-family:'Times New Roman',Times,serif; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.06em; padding:3px 9px; border-radius:2px}
.fl-card .fl-flag{margin-top:10px}

.fl-job{background:var(--paper-2); border:1px solid var(--line); border-left:4px solid var(--accent); border-radius:2px; padding:14px 16px; margin-bottom:12px}
.fl-job.flag{border-left-color:var(--red); box-shadow:inset 3px 0 0 var(--red)}
.fl-cad-banner{background:#f6edd6; border:1px solid var(--amber-deep); border-radius:2px; padding:10px 14px; margin-bottom:14px; font-size:13px; color:var(--ink)}
.fl-cad{margin-top:12px; padding:10px 12px; border-radius:2px; border:1px solid var(--line)}
.fl-cad.wait{background:var(--paper-2); color:var(--muted)}
.fl-cad.due{background:#f6edd6; border-color:var(--amber-deep)}
.fl-cad.warn{background:#f7e3df; border-color:var(--red)}
.fl-cad.done{background:var(--paper-2); color:var(--amber-deep); font-size:13px}
.fl-cad-row{display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap}
.fl-cad-step{font-size:13px; font-weight:700}
.fl-cad-mail{font-size:12px; color:var(--ink); text-decoration:underline}
.fl-cad-actions{margin-top:8px}
.fl-log{margin-top:8px}
.fl-log-chips{display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px}
.fl-chip2{background:var(--field-bg); border:1px solid var(--line); border-radius:2px; padding:5px 9px; font-size:12px; cursor:pointer; color:var(--ink)}
.fl-chip2.on{background:var(--ink); color:var(--paper-2); border-color:var(--ink)}
.fl-log-row{display:flex; gap:8px; flex-wrap:wrap; align-items:center}
.fl-log-row input[type=date]{border:1px solid var(--line); border-radius:2px; padding:8px; font-size:13px; background:var(--field-bg); color:var(--ink)}
.fl-log-row input:not([type]){flex:1; min-width:160px; border:1px solid var(--line); border-radius:2px; padding:8px 10px; font-size:13px; background:var(--field-bg); color:var(--ink)}
.fl-log-row .fl-primary,.fl-log-row .fl-ghost{flex:0 0 auto; padding:9px 14px}
.fl-pquota{margin-top:6px; font-size:12px; color:var(--muted)}
.fl-pquota input{width:56px; border:1px solid var(--line); border-radius:2px; padding:4px 6px; font-size:13px; margin:0 4px; background:var(--field-bg); color:var(--ink)}
.fl-quota{background:var(--paper-2); border:1px solid var(--line); border-left:4px solid var(--amber-deep); border-radius:2px; padding:14px 16px; margin-bottom:16px}
.fl-quota-head{display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px}
.fl-quota-head span{font-size:13px; color:var(--muted); text-transform:uppercase; letter-spacing:.08em}
.fl-quota-head strong{font-size:18px}
.fl-quota-bar{height:10px; background:var(--line); border-radius:2px; overflow:hidden}
.fl-quota-bar.small{height:7px; flex:1}
.fl-quota-bar > div{height:100%; background:var(--amber-deep)}
.fl-quota-team{background:var(--paper-2); border:1px solid var(--line); border-radius:2px; padding:14px 16px; margin-bottom:16px}
.fl-quota-row{display:flex; align-items:center; gap:12px; padding:5px 0}
.fl-quota-name{min-width:110px; font-size:13px}
.fl-quota-n{font-family:'Times New Roman',Times,serif; font-size:13px; min-width:54px; text-align:right; color:var(--muted)}
.fl-behind-row{display:flex; justify-content:space-between; align-items:center; gap:12px; padding:8px 0; border-bottom:1px dotted var(--line)}
.fl-behind-row:last-child{border-bottom:none}
.fl-behind-row strong{font-size:14px}
.fl-behind-actions{display:flex; gap:14px; flex-shrink:0}
.fl-bignote{background:var(--ink); color:var(--paper-2); border-radius:2px; padding:16px 18px; margin-bottom:16px; font-size:16px; font-weight:700; border-left:5px solid var(--amber-deep)}
.fl-chip-btn{cursor:pointer}
.fl-appr-row{display:flex; justify-content:space-between; align-items:center; gap:12px; background:var(--paper-2); border:1px solid var(--line); border-left:4px solid var(--amber-deep); border-radius:2px; padding:12px 14px; margin-bottom:8px}
.fl-appr-row strong{font-size:15px}
.fl-appr-row .fl-pmeta{margin-top:3px}
.fl-appr-right{display:flex; align-items:center; gap:12px; flex-shrink:0}
.fl-appr-amt{font-family:'Times New Roman',Times,serif; font-weight:700; font-size:16px; color:var(--amber-deep)}
.fl-bizlogo{display:flex; align-items:center; gap:10px; flex-wrap:wrap}
.fl-bizlogo img{height:48px; width:auto; border:1px solid var(--line); border-radius:2px; background:#fff; padding:4px}
.fl-bizlogo-empty{font-size:12px; color:var(--muted)}
.fl-emailprev{background:#fff; border:1px solid var(--line); border-radius:2px; padding:18px}
.fl-emailprev-logo{max-height:46px; width:auto; display:block; margin-bottom:12px}
.fl-emailprev-sub{font-weight:700; font-size:15px; border-bottom:1px solid var(--line); padding-bottom:8px; margin-bottom:10px}
.fl-emailprev-body{font-family:'Times New Roman',Times,serif; font-size:14px; white-space:pre-wrap; margin:0; line-height:1.5; color:var(--ink)}
.fl-emailprev-foot{margin-top:14px; padding-top:10px; border-top:1px solid var(--line); font-size:12px; color:var(--muted)}
.fl-sop{border:1px solid var(--line); border-radius:2px; margin-bottom:10px; background:var(--paper-2); overflow:hidden}
.fl-sop-head{width:100%; display:flex; justify-content:space-between; align-items:center; background:none; border:none; padding:14px 16px; cursor:pointer; font-family:'Times New Roman',Times,serif; font-weight:700; font-size:16px; color:var(--ink); text-align:left}
.fl-sop-toggle{font-size:20px; color:var(--amber-deep)}
.fl-sop-body{padding:4px 16px 16px}
.fl-sop-intro{font-size:13px; color:var(--muted); border-bottom:1px solid var(--line); padding-bottom:10px; margin:0 0 12px; line-height:1.5}
.fl-sop-item{margin-bottom:16px}
.fl-sop-item h4{font-family:'Times New Roman',Times,serif; font-size:14px; margin:0 0 6px; color:var(--ink)}
.fl-sop-item p{margin:0; font-size:14px; line-height:1.5; color:var(--ink-2)}
.fl-sop-say{margin:6px 0; padding:10px 14px; border-left:3px solid var(--amber-deep); background:#fff; font-size:14px; line-height:1.55; color:var(--ink); font-style:italic}
.fl-sop-log{margin:6px 0 0 !important; font-size:13px !important; color:var(--amber-deep) !important}
.fl-sop-after{margin:6px 0 0 !important; font-size:13px !important; color:var(--muted) !important}
.fl-support{background:var(--paper-2); border:1px solid var(--line); border-left:4px solid var(--amber-deep); border-radius:2px; padding:16px; margin-top:14px}
.fl-support strong{font-size:15px}
.fl-acct-card{background:var(--paper-2); border:1px solid var(--line); border-radius:2px; padding:16px; margin-bottom:14px}
.fl-acct-status{font-size:15px; margin:0 0 4px}
.fl-acct-active{color:var(--amber-deep); font-weight:700}
.fl-acct-note{margin-top:10px; padding:10px 12px; background:#f6edd6; border:1px solid var(--amber-deep); border-radius:2px; font-size:13px; line-height:1.5}
.fl-legal-links{display:flex; flex-wrap:wrap; gap:8px 18px}
.fl-legal-links a{color:var(--ink); font-size:14px; text-decoration:underline}
.fl-footer{display:flex; flex-wrap:wrap; gap:8px 16px; align-items:center; margin-top:28px; padding-top:14px; border-top:1px solid var(--line); font-size:12px; color:var(--muted)}
.fl-footer a{color:var(--muted); text-decoration:none}
.fl-footer a:hover{color:var(--ink); text-decoration:underline}
.fl-job-top{display:flex; justify-content:space-between; align-items:flex-start; gap:12px}
.fl-job-top h3{font-family:'Times New Roman',Times,serif; font-weight:700; font-size:17px; margin:0}
.fl-job-right{display:flex; flex-direction:column; align-items:flex-end; gap:6px}
.fl-job-bar{display:flex; align-items:center; gap:12px; margin-top:12px; font-family:'Times New Roman',Times,serif; font-size:11px; color:var(--muted); flex-wrap:wrap}
.fl-track{display:flex; gap:4px}
.fl-pip{width:18px; height:8px; border-radius:1px; background:var(--line)}
.fl-pip.on{background:var(--gold)}
.fl-job-rep{margin-left:auto; color:var(--amber-deep)}
.fl-fu-list{margin-top:10px; border-top:1px dotted var(--line); padding-top:8px; display:flex; flex-direction:column; gap:6px}
.fl-fu-row{display:flex; gap:10px; font-size:13px}
.fl-fu-meta{font-family:'Times New Roman',Times,serif; font-size:11px; color:var(--muted); white-space:nowrap; min-width:130px}
.fl-fu-note{color:var(--ink-2)}
.fl-job-foot{display:flex; align-items:center; gap:14px; margin-top:12px; padding-top:10px; border-top:1px solid var(--line); flex-wrap:wrap}
.fl-job-btn{background:var(--ink); color:var(--paper-2); border:none; border-radius:2px; padding:8px 14px; font-family:'Times New Roman',Times,serif; font-size:12px; cursor:pointer; text-transform:uppercase; letter-spacing:.05em}
.fl-fu-form{display:flex; gap:8px; flex-wrap:wrap; align-items:center; width:100%}
.fl-fu-form input[type=date]{border:1px solid var(--line); border-radius:2px; padding:8px; font-family:'Times New Roman',Times,serif; font-size:13px; background:var(--field-bg); color:var(--ink)}
.fl-fu-form input:not([type]){flex:1; min-width:160px; border:1px solid var(--line); border-radius:2px; padding:8px 10px; font-family:'Times New Roman',Times,serif; font-size:13px; background:var(--field-bg); color:var(--ink)}
.fl-fu-form .fl-seg{flex:0 0 auto}
.fl-fu-form .fl-primary{flex:0 0 auto; padding:9px 14px}
.fl-fu-form .fl-ghost{flex:0 0 auto; padding:9px 14px}

.fl-match{margin:4px 0 12px; padding:9px 11px; border-radius:2px; font-size:13px; line-height:1.4}
.fl-match.ok{background:#f6edd6; border:1px solid var(--gold); color:#7a5712}
.fl-match.none{background:#fbeceb; border:1px solid var(--red); color:#8a3326}
.fl-comm-summary{display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--line); border:1px solid var(--line); border-radius:2px; overflow:hidden; margin-bottom:10px}
.fl-comm-summary > div{background:var(--paper-2); padding:10px 8px; text-align:center}
.fl-comm-summary > div.hot{background:#f6edd6}
.fl-comm-num{display:block; font-family:'Times New Roman',Times,serif; font-weight:800; font-size:18px; line-height:1.1; color:var(--ink)}
.fl-comm-lbl{display:block; margin-top:3px; font-family:'Times New Roman',Times,serif; font-size:9px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted)}
.fl-comm-amt{margin-left:auto; font-family:'Times New Roman',Times,serif; font-size:12px; color:var(--gold); font-weight:700; white-space:nowrap}
.fl-hint{font-size:12px; color:var(--muted); line-height:1.45; margin:0 0 10px}
.fl-paytag{display:inline-block; background:var(--gold); color:#fff; font-size:9px; letter-spacing:.06em; padding:2px 6px; border-radius:2px; margin-left:6px; vertical-align:middle}
.fl-paychip{font-weight:600}
.fl-paychip.ok{color:var(--gold)}
.fl-paychip.pend{color:var(--blue)}
.fl-paychip.bad{color:var(--red)}
.fl-subblock{border-left:2px solid var(--gold); padding-left:12px; margin:0 0 6px}
.fl-approvals{display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-top:10px; padding-top:10px; border-top:1px dotted var(--line)}
.fl-appr-lbl{font-family:'Times New Roman',Times,serif; font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:var(--muted)}
.fl-link.on{color:var(--gold)}
.fl-hold{font-family:'Times New Roman',Times,serif; font-size:10px; color:var(--blue); letter-spacing:.06em}
.fl-home{max-width:880px}
.fl-hero{background:var(--paper-2); border:1px solid var(--line); border-radius:2px; padding:22px; margin-bottom:18px; text-align:center}
.fl-hero h2{font-family:'Times New Roman',Times,serif; font-weight:800; font-size:22px; margin:0 0 6px; letter-spacing:.02em}
.fl-hero p{margin:0 0 14px; font-size:13px; color:var(--muted); max-width:520px; margin-left:auto; margin-right:auto}
.fl-bigsearch{width:100%; max-width:560px; padding:14px 16px; border:2px solid var(--ink); border-radius:2px; background:var(--field-bg); font-family:'Times New Roman',Times,serif; font-size:16px; color:var(--ink)}
.fl-bigsearch:focus{outline:none; border-color:var(--gold); box-shadow:0 0 0 3px rgba(223,166,58,.30)}
.fl-addr-card{background:var(--paper-2); border:1px solid var(--line); border-left:4px solid var(--gold); border-radius:2px; padding:14px 16px; margin-bottom:12px}
.fl-addr-top{display:flex; justify-content:space-between; align-items:flex-start; gap:12px}
.fl-addr-top h3{font-family:'Times New Roman',Times,serif; font-weight:700; font-size:17px; margin:0}
.fl-addr-owner{font-family:'Times New Roman',Times,serif; font-size:12px; color:var(--muted); margin:3px 0 0}
.fl-addr-owner strong{color:var(--gold)}
.fl-claim{display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin:10px 0; padding:10px; background:var(--field-bg); border:1px solid var(--line); border-radius:2px}
.fl-claim input{flex:1; min-width:140px; border:1px solid var(--line); border-radius:2px; padding:8px 10px; font-family:'Times New Roman',Times,serif; font-size:13px; background:var(--field-bg); color:var(--ink)}
.fl-claim .fl-primary{flex:0 0 auto; padding:9px 14px}
.fl-claim .fl-ghost{flex:0 0 auto; padding:9px 14px}
.fl-import{background:var(--paper-2); border:1px solid var(--line); border-radius:2px; padding:14px; margin-bottom:16px}
.fl-import-head{display:flex; justify-content:space-between; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:10px}
.fl-import-head strong{font-family:'Times New Roman',Times,serif; font-size:15px}
.fl-import-head span{font-family:'Times New Roman',Times,serif; font-size:11px; color:var(--muted)}
.fl-map{display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:12px}
@media(max-width:560px){.fl-map{grid-template-columns:repeat(2,1fr)}}
.fl-map-field{display:flex; flex-direction:column; gap:3px}
.fl-map-field > span{font-family:'Times New Roman',Times,serif; font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted)}
.fl-map-field select{border:1px solid var(--line); border-radius:2px; padding:7px; font-size:13px; background:var(--field-bg)}
.fl-prev{width:100%; border-collapse:collapse; font-size:12px; margin-bottom:8px}
.fl-prev th, .fl-prev td{border-bottom:1px solid var(--line); padding:6px 8px; text-align:left}
.fl-prev th{font-family:'Times New Roman',Times,serif; font-size:10px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted)}
.fl-prev .r{text-align:right}
.fl-prev td.ok{color:var(--gold); font-weight:600}
.fl-prev td.no{color:var(--red)}

/* ── Print ───────────────────────────────────────────────────────────────── */
.fl-print{display:none}
@media print{
  .fl-noprint{display:none !important}
  .fl-root{background:#fff !important; padding:0 !important; color-scheme:light}
  .fl-print{display:block; color:#000; font-family:'Times New Roman',Times,serif}
  .fl-stmt{page-break-after:always; padding:8px}
  .fl-stmt:last-child{page-break-after:auto}
  .fl-stmt-head{display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:14px}
  .fl-stmt-head h2{font-family:'Times New Roman',Times,serif; font-weight:800; letter-spacing:.12em; margin:0; font-size:24px}
  .fl-stmt-head p{margin:2px 0 0; font-size:12px; letter-spacing:.06em; text-transform:uppercase}
  .fl-stmt-meta{text-align:right; font-size:13px}
  .fl-stmt-meta strong{font-size:18px}
  .fl-stmt-table{width:100%; border-collapse:collapse; font-size:12px}
  .fl-stmt-table th, .fl-stmt-table td{border-bottom:1px solid #bbb; padding:7px 6px; text-align:left}
  .fl-stmt-table th{border-bottom:2px solid #000; text-transform:uppercase; font-size:10px; letter-spacing:.04em}
  .fl-stmt-table .r{text-align:right}
  .fl-stmt-table tfoot td{border-top:2px solid #000; border-bottom:none; padding-top:8px; font-size:13px}
  .fl-stmt-note{font-size:12px; margin-top:14px}
  .fl-stmt-sign{display:flex; gap:40px; margin-top:40px}
  .fl-stmt-sign span{flex:1; border-top:1px solid #000; padding-top:5px; font-size:11px; text-transform:uppercase; letter-spacing:.06em}
}
`;
