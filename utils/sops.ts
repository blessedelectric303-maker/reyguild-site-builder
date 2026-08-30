// HELP - the single tab under Settings.
//
// This file used to hold a different SOP per screen, auto-selected from the
// URL. That is gone. The company's real SOPs now live in the app itself,
// under the SOPs button on the command center, where they belong.
//
// What is left here is the thing Settings is actually for: how to drive the
// software. It reads top to bottom - the walkthrough, then the questions
// people actually ask, then how to reach a human if neither answered it.
// To change any wording, edit the text below - nothing else.

export type GuideSection = {
  heading: string;
  steps: string[];
};

// Support details shown on the Help tab.
// >>> EDIT THESE to your real support email / phone.
// Leave phone as "" to hide the phone line.
export const SUPPORT = {
  email: "support@reyguild.com",
  phone: "",
  note: "We usually reply within one business day.",
};

export const APP_GUIDE: GuideSection[] = [
  {
    heading: "The shape of the whole thing",
    steps: [
      "A call comes in. You press NEW CALL at the top and work down it. It ends by telling you which colour the call is.",
      "You press that colour. Its procedure opens - what to say, what to capture, what not to promise.",
      "If the procedure can create work, a Schedule button sits in its top right corner. It carries everything you already typed into Proposals so nobody gets asked twice.",
      "The customer approves. That becomes a T&M job. You add a date and a worker, and it lands on the calendar.",
      "The calendar in the middle of the command center is the same calendar the whole company sees.",
    ],
  },
  {
    heading: "The command center",
    steps: [
      "NEW CALL is the white button under your company name. Every call starts there.",
      "The eight colour buttons sit down both sides - four that can be scheduled on the left, four office-only ones on the right.",
      "The two tiles are your apps: T&M&P&L on the left, Proposals and Invoicing on the right. The badge shows Active, Free trial, or Locked.",
      "The row under the calendar is Email, Company Contacts, Messages, SOPs, Scripts and Client Contacts.",
    ],
  },
  {
    heading: "The eight colours",
    steps: [
      "RED Emergency, GREEN Proposal, BLUE Service Call and ORANGE Warranty can all be scheduled.",
      "YELLOW Concern, PURPLE Question, GRAY Material and PINK Absence are office work. They never create a job, so they have no Schedule button - that is deliberate, not a bug.",
      "A call can change colour halfway through. That is the system working. Back out to the command center and press the right one.",
      "Sort by what the caller describes, not by what they call it.",
    ],
  },
  {
    heading: "Inside a procedure",
    steps: [
      "ONE PAGE is the short version - the whole procedure on a single card. Press Print to pin it by the phone.",
      "CHECKLIST is the live version. Tick it while the caller is talking.",
      "The checklist saves by itself as you type. You can close the tab and come back hours later and it will still be there.",
      "Anything marked BEFORE DISPATCH has to be filled in before the job can go out.",
      "Wording in [SQUARE BRACKETS] fills itself in from your company profile. If you see brackets still showing, that value has not been set yet.",
    ],
  },
  {
    heading: "SOPs and Scripts",
    steps: [
      "SOPs is how the office runs - the administrator's day, scheduling, material, absences, invoicing, and the daily run cards.",
      "SCRIPTS is what to say, word for word, for every kind of call.",
      "Both are colour coded to match the eight call buttons. A red tag means it belongs to an emergency call, orange to a warranty, and so on.",
      "Use the colour chips along the top to show only one colour, or the search box to find a phrase.",
      "COPY on any card puts that wording on your clipboard, ready to paste into an email or a text.",
    ],
  },
  {
    heading: "Company Contacts",
    steps: [
      "COMPANY CONTACTS is your own team - everybody who works for you, with their name, role, phone and email.",
      "Nobody is added by hand. Somebody appears the moment they are invited, and their title updates when you change their role.",
      "Names and phone numbers come from the employee record in T&M&P&L. Roles come from Settings, then Army / Employees.",
      "CLIENT CONTACTS, further along the row, is the opposite - that is your customers.",
    ],
  },
  {
    heading: "Client Contacts",
    steps: [
      "CLIENT CONTACTS opens your customer list inside Proposals and Invoicing. One list, not a second copy.",
      "Each client holds company, contact name, phone, email, address and notes.",
      "IMPORT CSV brings a whole list in at once. It matches your column headings up itself, so an export from another system usually just works.",
      "EXPORT CSV takes it back out, which is also how you keep a backup.",
      "Importing and exporting is owner and admin only.",
    ],
  },
  {
    heading: "Proposals and Invoicing",
    steps: [
      "Open it from the tile on the right of the calendar, or let a procedure carry you into it with the Schedule button.",
      "Arriving from a call prefills the customer's name, address, phone and email, and shows a gold banner saying which call it came from.",
      "Prices come from your price book, so the numbers stay the same no matter who builds the proposal.",
      "Internal labour hours, your hourly cost, material cost and margin never appear on anything a customer sees.",
      "When a proposal is approved, create the job from it. One record - never build a second one by hand.",
    ],
  },
  {
    heading: "T&M&P&L",
    steps: [
      "Open it from the tile on the left. It signs you in automatically using the email you are already logged in with.",
      "Workers clock in and out on the job, with GPS on the clock-in.",
      "Timesheets, materials and costs all roll up per job, so you can see wages and margin on work you have actually done.",
      "Time off and the audit log live here too.",
    ],
  },
  {
    heading: "Settings and your company",
    steps: [
      "Settings is the gear in the top right, and it is the same menu on every screen.",
      "Account is where you sign out, switch light and dark, and reach Company and Army / Employees.",
      "Company is your name, logo, phone, address and trade. It fills in the [BRACKETS] everywhere at once, so type it once and it is done.",
      "One Man Army means it is just you. Army Mode means you have a team and can invite them.",
      "Roles: Owner and Admin see everything. Supervisor sees messages, the team and the calendar, but not HR documents. Estimators and techs see only their own work.",
    ],
  },
  {
    heading: "If something looks wrong",
    steps: [
      "Check the address bar first. The app lives at reyguild-site-builder.vercel.app - a web address with a random string of letters in it is a frozen old copy and will never update.",
      "A screen saying a procedure has not been set up yet means the wording has not been loaded for that colour. Nothing is broken.",
      "If a change you were told about is not showing, try a private or incognito window before assuming it failed.",
    ],
  },
];

// The questions people actually ask, in the order they tend to ask them.
// Each one here is a real thing that has caught somebody out.
export type QA = { q: string; a: string };

export const COMMON_QUESTIONS: QA[] = [
  {
    q: "I was told something changed, but the app looks exactly the same.",
    a: "Look at the address bar. The app lives at reyguild-site-builder.vercel.app. If the address has a random string of letters in the middle of it, you are looking at a frozen snapshot of an older version and it will never update, no matter how long you wait. Go to the clean address, and open it in a private or incognito window the first time to be sure you are not seeing a cached copy.",
  },
  {
    q: "A colour opens a page saying the procedure has not been set up yet.",
    a: "Nothing is broken. That colour simply has no wording loaded against it yet. An owner or admin adds it, and the colour starts working for everybody in the company at once.",
  },
  {
    q: "Why do some colours have no Schedule button?",
    a: "Because they must never create work. Yellow, purple, gray and pink are office jobs - a complaint, a question, a material request, somebody calling off. None of those are a job on the calendar, so the button is deliberately absent rather than hidden.",
  },
  {
    q: "I closed the tab in the middle of a checklist. Did I lose it?",
    a: "No. Checklists save themselves as you type, one per colour. Open that colour again, hours or days later, and everything you had typed is still sitting there.",
  },
  {
    q: "There are words in [SQUARE BRACKETS] showing on screen.",
    a: "That is a value nobody has filled in yet - a fee, a deadline, a role name. It stays visible on purpose rather than printing a blank, so you never read a script with a hole in it. Fill it in under Settings, then Account, then Company, and it fills in everywhere at once.",
  },
  {
    q: "How do I add my own supply house?",
    a: "Open the gray Material button and look at the top of the screen. Owners and admins get a dashed Add your own tile - put in the name and the web address and it saves for the whole company. You can remove any of them, including the ones that came as standard.",
  },
  {
    q: "How do I get a script into an email or a text?",
    a: "Open Scripts, find the one you want using the colour chips or the search box, and press Copy. It goes onto your clipboard ready to paste. Anything in square brackets still needs swapping for the real name, time or figure.",
  },
  {
    q: "Somebody on my team cannot see something I can see.",
    a: "That is their role. Owners and admins see everything including HR documents. Supervisors see messages, the team and the calendar but not HR documents. Estimators and techs see only their own work. Roles are set under Settings, then Account, then Army and Employees.",
  },
  {
    q: "How do I add my team?",
    a: "Settings, then Account. Switch One Man Army over to Army Mode, then open Army and Employees and send an invite. They get their own login and land on the screen that matches their role.",
  },
  {
    q: "A customer needs rescheduling and I do not know what to say.",
    a: "Open the pink Absence button. The customer reply script is the first card on it - the call, the text version, and what to do if that customer has already been moved once.",
  },
];
