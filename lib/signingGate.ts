import { createClient } from "@/utils/supabase/server";

// PAPERWORK: TWO KINDS, TWO RULES.
//
// This used to be one question - "does this person owe a signature?" - and one
// answer, which was to shut the door. That was wrong twice over, and it cost a
// day of testing to see why.
//
// There are two completely different piles of paper here:
//
//   THE FOUR REYGUILD DOCUMENTS. The terms, the privacy policy, the cookie
//   policy and the NDA. These are the agreement between the person and the
//   software itself, and nothing should happen before they are signed - not by
//   a new apprentice, not by the owner. No grace period, no skip button, no
//   role gets out of it. Sign them and you are done with them for ever.
//
//   THE COMPANY BOOKLET. Conduct, safety, drug and alcohol, harassment,
//   non-solicit, side work, the NDA, plus the ID and the photo. These belong
//   to the company, not to us. A man handed a phone at 7am on a job site
//   should not be stood in a driveway reading a drug and alcohol policy while
//   a customer waits. He gets SEVEN DAYS, the app tells him where they live
//   and how long is left every time he opens it, and on the eighth day the
//   door shuts.
//
// The old code treated both as the same wall, which is how somebody ended up
// in a loop: the front door sent him to the paperwork, the paperwork's only
// button sent him to the front door, and round he went. Two rules, asked in
// ONE place, is what stops that happening again - every door in the app asks
// this file and nothing counts days on its own.
export const PAPERWORK_DAYS = 7;

export type PaperworkState = {
  platformOutstanding: number;  // the four ReyGuild documents - no grace, ever
  companyOutstanding: number;   // the company booklet, the ID and the photo - seven days
  outstanding: number;          // the two added together
  daysLeft: number;             // whole days left in the week, 0 once it is up
  overdue: boolean;             // the week is up
  boss: boolean;                // owner or administrator
  locked: boolean;              // this person must be sent to /onboarding
  reason: "" | "platform" | "overdue";
};

const NONE: PaperworkState = {
  platformOutstanding: 0,
  companyOutstanding: 0,
  outstanding: 0,
  daysLeft: PAPERWORK_DAYS,
  overdue: false,
  boss: false,
  locked: false,
  reason: "",
};

export async function paperworkState(): Promise<PaperworkState> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NONE;

    // FAILS OPEN, LOUDLY. If the documents cannot be read, the app opens as it
    // always did - a database hiccup must never lock a company out of its own
    // software. But it says so in the server log, because the last time a read
    // failed silently it locked the owner out for a day and nothing anywhere
    // said why. supabase-js RETURNS errors rather than throwing them, so a
    // failed read and an empty one look identical unless you read the error.
    const { data, error } = await supabase.schema("suite").rpc("my_documents");
    if (error) {
      console.error("[paperwork] my_documents failed:", error.message);
      return NONE;
    }
    const docs = (data as any[]) || [];
    const unsigned = (platform: boolean) =>
      docs.filter(
        (d) => d && !!d.is_platform === platform && d.requires_signature && !d.signed
      ).length;

    const platformOutstanding = unsigned(true);
    let companyOutstanding = unsigned(false);

    // The ID and the photo are paperwork too, and they sit on the company side
    // of the line - they are for the employer's file, not for us.
    try {
      const { data: files, error: fErr } = await supabase
        .schema("suite")
        .rpc("my_required_files");
      if (fErr) {
        console.error("[paperwork] my_required_files failed:", fErr.message);
      } else {
        const rows = (files as any[]) || [];
        companyOutstanding += rows.filter((f) => f && f.required && !f.uploaded).length;
      }
    } catch (e: any) {
      console.error("[paperwork] my_required_files threw:", e && e.message);
    }

    const outstanding = platformOutstanding + companyOutstanding;
    if (outstanding === 0) return NONE;

    // WHO IS THIS, AND WHEN DOES THEIR WEEK START?
    //
    // Both answers come out of the same row, so they are read in one go.
    //
    // paperwork_from overrides the login date. Set it to now and that person
    // gets a fresh week: an owner granting an extension, a new man starting
    // late, or a company that has just loaded a document everybody must read.
    // Without it, an owner whose login is months old is out of time the
    // instant a new document lands, with nobody able to give him more.
    //
    // That column was once added to the database without reloading the API's
    // schema cache, so every read of it came back an error - and because
    // supabase-js returns errors instead of throwing them, a failed read
    // looked exactly like "no extension granted". The extension was sitting in
    // the database the whole time. So: the error is logged, and the role is
    // asked for a second time on its own, because a missing column must never
    // cost us the role as well.
    let startedFrom = String(user.created_at || "");
    let role = "";
    {
      const { data: mem, error: memErr } = await supabase
        .schema("suite")
        .from("memberships")
        .select("role,paperwork_from")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (memErr) {
        console.error("[paperwork] membership read failed:", memErr.message);
        const { data: alt, error: altErr } = await supabase
          .schema("suite")
          .from("memberships")
          .select("role")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (altErr) console.error("[paperwork] role read failed too:", altErr.message);
        role = String(((alt as any) || {}).role || "");
      } else {
        const row: any = (mem as any) || {};
        role = String(row.role || "");
        if (row.paperwork_from) startedFrom = String(row.paperwork_from);
      }
    }

    const started = Date.parse(startedFrom) || Date.now();
    const elapsed = (Date.now() - started) / 86400000;
    const daysLeft = Math.max(0, Math.ceil(PAPERWORK_DAYS - elapsed));
    const overdue = daysLeft <= 0;
    const boss = role === "owner" || role === "admin";

    // THE TWO RULES, IN ORDER.
    //
    // The four ReyGuild documents come first and admit no exceptions. Past
    // those, the company booklet is a countdown, and the owner is told rather
    // than blocked - he is the man who loaded those documents in the first
    // place, and shutting him out of his own command centre over his own
    // booklet is how a launch day goes wrong. It is the rule the tech layout
    // was already written to; the front door is now written to it as well.
    const lockedForPlatform = platformOutstanding > 0;
    const lockedForOverdue = companyOutstanding > 0 && overdue && !boss;

    return {
      platformOutstanding,
      companyOutstanding,
      outstanding,
      daysLeft,
      overdue,
      boss,
      locked: lockedForPlatform || lockedForOverdue,
      reason: lockedForPlatform ? "platform" : lockedForOverdue ? "overdue" : "",
    };
  } catch (e: any) {
    console.error("[paperwork] threw:", e && e.message);
    return NONE;
  }
}

// Whole days left in the week, for anything that only needs the clock.
export async function paperworkDaysLeft(): Promise<number> {
  const s = await paperworkState();
  return s.outstanding === 0 ? PAPERWORK_DAYS : s.daysLeft;
}

// THE ONE GATE. Every front door in the app asks this and nothing else.
//
// It answers "let them in" whenever the question cannot be answered - no
// documents loaded, a database fault, or the person being the owner with only
// his own booklet outstanding. None of those are a reason to shut somebody out
// of software they are paying for.
export async function hasUnsignedDocuments(): Promise<boolean> {
  const s = await paperworkState();
  return s.locked;
}
