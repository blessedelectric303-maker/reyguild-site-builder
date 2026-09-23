import { createClient } from "@/utils/supabase/server";

// HAS THIS PERSON SIGNED EVERYTHING THEY HAVE TO SIGN?
//
// The handbook, the safety rules and the platform terms are not optional, so
// the app asks this at every front door and sends anyone with paperwork
// outstanding to /onboarding first. It answers "no paperwork" whenever the
// question cannot be answered - a company that has not loaded any documents,
// or a database hiccup, must not lock people out of their own app.

// SEVEN DAYS TO DO THE PAPERWORK.
//
// Locking somebody out on their first morning is how a new man decides this
// company is a pain to work for before he has swung a hammer. He gets a week
// to sign everything, and the app tells him how long is left every time he
// opens it. On the eighth day he cannot get past it.
//
// The clock runs from when the account was made, which for an invited person
// is the moment they set their password.

// THE BOSS IS TOLD. THE BOSS IS NEVER BLOCKED.
//
// This is the rule the rest of the app was already written to - it is spelled
// out in app/tm/tech/layout.tsx in those words - and the gate on the front
// door was the one place that broke it. An owner or an administrator is the
// person who LOADS the documents in the first place. Walling him out of his
// own command centre until he has signed his own booklet is how a launch day
// goes wrong, and it is exactly what happened: the week ran out, the door
// closed, and the only button on the page led back to the same page.
//
// So owners and administrators are never locked, at any number of days. They
// get the banner, every screen, every time, getting louder as the week runs
// down - and the countdown still runs for them so the banner can say it.
// Everybody else is gated on day eight, which is the point of the week.
export const PAPERWORK_DAYS = 7;

export type PaperworkState = {
  outstanding: number;   // how many required documents are still unsigned
  daysLeft: number;      // whole days remaining, 0 once the week is up
  locked: boolean;       // the week is up, something is unsigned, and this person can be stopped
  boss: boolean;         // owner or administrator - told, never blocked
  overdue: boolean;      // the week is up, whether or not they can be stopped
};

export async function paperworkState(): Promise<PaperworkState> {
  const none: PaperworkState = {
    outstanding: 0,
    daysLeft: PAPERWORK_DAYS,
    locked: false,
    boss: false,
    overdue: false,
  };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return none;

    const { data, error } = await supabase.schema("suite").rpc("my_documents");
    if (error) {
      console.error("[paperwork] my_documents failed:", error.message);
      return none;
    }
    const docs = (data as any[]) || [];
    let outstanding = docs.filter((d) => d && d.requires_signature && !d.signed).length;

    // The phone side counts uploaded forms as paperwork too - an ID and a
    // photo are as required as a signature. One source of truth for both,
    // otherwise the banner says "all done" while the gate still says no.
    try {
      const { data: st } = await supabase.schema("suite").rpc("my_onboarding");
      const row: any = st && (st as any[]).length ? (st as any[])[0] : null;
      if (row && row.complete === false && outstanding === 0) outstanding = 1;
    } catch { /* the documents count stands on its own */ }

    if (outstanding === 0) return none;

    // WHO IS THIS, AND WHEN DOES THEIR WEEK START?
    //
    // Both answers come out of the same row, so they are read in one go.
    //
    // paperwork_from overrides the login date. Set it to now and that person
    // gets a fresh week: an owner granting an extension, a new man starting
    // late, or a company that has just loaded a document everybody has to
    // read. Without it, an owner whose login is months old is out of time the
    // instant a new document lands, with nobody able to give him more.
    //
    // NOTHING HERE IS SWALLOWED QUIETLY EVER AGAIN. That column was added to
    // the database without reloading the API's schema cache, so every read of
    // it came back an error - and supabase-js RETURNS errors instead of
    // throwing them, so a failed read looked exactly like "no extension
    // granted". The extension was sitting in the database the whole time and
    // the app locked the owner out anyway, saying nothing. Now a bad read is
    // printed to the server log, and the role is asked for a second time on
    // its own so that a missing column can never cost us the role as well.
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

    return { outstanding, daysLeft, locked: overdue && !boss, boss, overdue };
  } catch (e: any) {
    console.error("[paperwork] threw:", e && e.message);
    return none;
  }
}

// Whole days left in the week, for the gates that measure "outstanding" their
// own way and only need the clock.
export async function paperworkDaysLeft(): Promise<number> {
  const s = await paperworkState();
  return s.outstanding === 0 ? PAPERWORK_DAYS : s.daysLeft;
}

// The gate itself. It answers "no" whenever the question cannot be answered -
// a company that has loaded no documents, a database hiccup, or the person
// being the owner - because none of those are a reason to shut somebody out
// of their own app.
export async function hasUnsignedDocuments(): Promise<boolean> {
  const s = await paperworkState();
  return s.locked;
}
