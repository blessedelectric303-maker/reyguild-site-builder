// HELP for the tech phone view. Same shape as the office one: how the app
// works, then the questions people actually ask, then how to reach ReyGuild
// if neither answered it. Edit the text here and nowhere else.

export type GuideSection = { heading: string; steps: string[] };
export type QA = { q: string; a: string };

export const TECH_GUIDE: GuideSection[] = [
  {
    heading: "Your day in this app",
    steps: [
      "JOBS is your list. Today first, then what's coming, then anything without a date yet.",
      "Open a job to see the customer, the address, the problem in their words, the approved scope and price, and how you get your material.",
      "Clock in when you set off, press Arrived at the door, and Job Done when you're finished.",
      "Clocking in records where you are. That is how your hours get paid correctly.",
      "A blank line on a job is not the same as none. It means nobody asked - call the office before you drive.",
    ],
  },
  {
    heading: "Procedures",
    steps: [
      "PROCEDURES holds your eight truck cards, one per kind of visit.",
      "Each card has ONE PAGE - the short version, the thing you read in the driveway.",
      "And a CHECKLIST you tick as you work. It saves itself, so you can lock your phone and come back to it.",
      "The count on the tab tells you how far through you are.",
      "START FRESH clears the ticks when you begin the next job of that type.",
    ],
  },
  {
    heading: "Hours and time off",
    steps: [
      "MY HOURS shows what you have clocked. Check it before payday, not after.",
      "Something missing or wrong? Tell the office the same day. It is much harder to reconstruct a week later.",
      "TIME OFF is where you request days. Requesting is not approving - if it is not on the calendar, it is not approved.",
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
];

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
    a: "Write it down in their words, photograph it, and tell the office the same day. Do not price it and do not start it, even if it is small. Open the Questions card - it is the whole procedure.",
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
    q: "The app looks out of date after I was told something changed.",
    a: "Check the address bar. If it has a random string of letters in the middle of it you are on a frozen old copy. Go to the clean address your office gave you, and try a private window the first time.",
  },
];
