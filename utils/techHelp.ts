// HELP for the tech phone view. Same shape as the office one: how the app
// works, then the questions people actually ask, then how to reach ReyGuild
// if neither answered it. Edit the text here and nowhere else.

export type GuideSection = { heading: string; steps: string[] };
export type QA = { q: string; a: string };

export const TECH_GUIDE: GuideSection[] = [
  {
    heading: "What is on this screen",
    steps: [
      "Along the top: JOBS, PROCEDURES, MY HOURS, TIME OFF and MESSAGES.",
      "Your name is in the header with your title under it - Supervisor, Tech / Estimator, or Apprentice. That title decides what you can see.",
      "SETTINGS is top right. Help, Preferences, and Sign out live in there.",
      "The crest behind everything is your company logo. It is meant to be there.",
    ],
  },
  {
    heading: "Jobs",
    steps: [
      "Your list. Today first, then what is coming, then anything without a date yet.",
      "Open a job for the customer, the address, the problem in their words, the approved scope and price, and how you get your material.",
      "Clock in when you set off, press Arrived at the door, and Job Done when you are finished.",
      "Clocking in records where you are. That is what makes your hours right.",
      "A blank line on a job is not the same as none. It means nobody asked - call the office before you drive.",
    ],
  },
  {
    heading: "Procedures",
    steps: [
      "Eight truck cards, one per kind of visit, in the same colours the office uses.",
      "ONE PAGE is the short version - what you read in the driveway.",
      "CHECKLIST is what you tick as you work. It saves itself, so you can lock your phone and come back.",
      "The count on the tab shows how far through you are.",
      "START FRESH clears the ticks when you begin the next job of that type.",
    ],
  },
  {
    heading: "Hours and time off",
    steps: [
      "MY HOURS shows what you have clocked. Check it before payday, not after.",
      "Something missing or wrong? Tell the office the same day. A week later it is guesswork.",
      "TIME OFF is where you request days. Requesting is not approving - if it is not on the calendar, it is not approved.",
    ],
  },
  {
    heading: "Messages",
    steps: [
      "Your contacts are built in. You do not add anybody.",
      "A tech or an apprentice messages the owner, the administrators and the supervisors. That is who can actually change a job.",
      "Techs cannot message each other. Two people agreeing something between themselves is how a customer gets told two different things.",
      "Supervisors, administrators and the owner can message anybody.",
      "A number on the Messages tab means something is waiting for you.",
    ],
  },
  {
    heading: "The rules that never change",
    steps: [
      "You never buy material. Call the office.",
      "You never quote a price. Not a guess, not a range.",
      "You never promise a date. You cannot see the schedule.",
      "Damage or a mark? Say so immediately. Reporting it is not the problem. Hiding it is.",
      "Not safe to work? That call is yours, and you will be supported.",
    ],
  },
]

export const TECH_QUESTIONS: QA[] = [
  {
    q: "I clocked in but it says I am not on site.",
    a: "Clock-in checks your location against the job address. Let your phone find you before you press it, and make sure the browser is allowed to use your location. If the address on the job is wrong, that is the real problem - call the office and get it fixed rather than working around it.",
  },
  {
    q: "My checklist ticks disappeared.",
    a: "They are saved per card, not per job. Opening the same card on your next job of that type shows the same ticks, which is why there is a Start fresh button at the top. If you meant to keep them, they are still there - you may be looking at a different card.",
  },
  {
    q: "A procedure says it has not been loaded yet.",
    a: "Nothing is broken and it is not your phone. Your office has not added the wording for that card yet. Everything else in the app still works.",
  },
  {
    q: "There are words in [SQUARE BRACKETS] in the middle of a card.",
    a: "That is a company setting nobody has filled in yet - a fee, a deadline, a warranty length. It shows rather than printing a blank so you never read a card with a hole in it. Ask the office to fill it in and it fills in for everybody at once.",
  },
  {
    q: "The customer wants extra work while I am there.",
    a: "Write it down in their words, photograph it, and tell the office the same day. Do not price it and do not start it, even if it is small. Open Procedures and read the Questions card - it is the whole procedure.",
  },
  {
    q: "The customer is asking me how much something costs.",
    a: "You never give a number, not even a range, because it becomes the figure they remember. Say you want to give them the right answer rather than a fast one, and get the office to come back to them.",
  },
  {
    q: "My hours look wrong.",
    a: "Tell the office the same day. Every correction records who authorized it, so it needs to go through them rather than being edited quietly.",
  },
  {
    q: "I asked for time off and I cannot tell if it is approved.",
    a: "Look at the calendar. If the days are not on it, they are not approved yet, no matter what was said out loud.",
  },
  {
    q: "I cannot find Sign out.",
    a: "It is at the bottom of Settings, top right. It was moved off the header on purpose so nobody signs themselves out with a stray thumb halfway through a job.",
  },
  {
    q: "Why can I not message another tech?",
    a: "Your contact list is built from your role. Techs and apprentices message the office - the owner, administrators and supervisors - because those are the people who can actually change a job or a schedule. If two people on site need to agree something, it goes through the office so the customer only ever hears one answer.",
  },
  {
    q: "The text is too small to read on a job.",
    a: "Settings, then Preferences. Text size has Normal, Large and Extra large, and it applies to every screen in the app on that phone.",
  },
  {
    q: "The app looks out of date after I was told something changed.",
    a: "Check the address bar. If it has a random string of letters in the middle of it you are on a frozen old copy. Go to the clean address your office gave you, and try a private window the first time.",
  },
];
