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
// is the moment they set their password. The owner's account is older than a
// week, so an owner who has not signed is stopped straight away - which is
// right, because nothing should have been set up without it.
export const PAPERWORK_DAYS = 7;

export type PaperworkState = {
  outstanding: number;   // how many required documents are still unsigned
  daysLeft: number;      // whole days remaining, 0 once the week is up
  locked: boolean;       // the week is up and something is still unsigned
};

export async function paperworkState(): Promise<PaperworkState> {
  const none: PaperworkState = { outstanding: 0, daysLeft: PAPERWORK_DAYS, locked: false };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return none;

    const { data, error } = await supabase.schema("suite").rpc("my_documents");
    if (error) return none;
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

    const started = Date.parse(String(user.created_at || "")) || Date.now();
    const elapsed = (Date.now() - started) / 86400000;
    const daysLeft = Math.max(0, Math.ceil(PAPERWORK_DAYS - elapsed));

    return { outstanding, daysLeft, locked: daysLeft <= 0 };
  } catch (e) {
    return none;
  }
}

// The gate itself. It answers "no" whenever the question cannot be answered -
// a company that has loaded no documents, or a database hiccup, must not lock
// people out of their own app.
// Whole days left in the week, for the gates that measure "outstanding" their
// own way and only need the clock.
export async function paperworkDaysLeft(): Promise<number> {
  const s = await paperworkState();
  return s.outstanding === 0 ? PAPERWORK_DAYS : s.daysLeft;
}

export async function hasUnsignedDocuments(): Promise<boolean> {
  const s = await paperworkState();
  return s.locked;
}
