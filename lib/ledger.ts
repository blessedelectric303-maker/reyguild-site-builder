import { createClient } from "@supabase/supabase-js";

// THE LEDGER. WRITE ONCE, NEVER CHANGE, NEVER DELETE.
//
// The nightly snapshot protects you to the day. This protects you to the
// minute, and it protects you against a different thing entirely: the
// snapshot copies whatever the app currently says, so if something is quietly
// rewritten at 2pm and copied at 2am, the copy is of the rewrite. The ledger
// is the record of what actually happened, written at the moment it happened,
// by the server, into a table nothing in the app can reach.
//
// Two rules make it worth having, and both are enforced in the database
// rather than here:
//   * only the service role can write, and the app never holds it
//   * nobody can update or delete a row, including the owner, including me
//
// So a proposal sent to a customer on Tuesday is still on record as sent on
// Tuesday, whatever happens to the proposal afterwards - and if somebody
// disputes what they agreed to, the answer is not "what does the app say now"
// but "what did the server write down at the time".
//
// It never throws. A ledger that can break a customer signing a proposal is
// worse than no ledger, so every failure here is logged to the server console
// and swallowed. The event is evidence, not a gate.

export type LedgerEvent =
  | "proposal.sent"
  | "proposal.opened"
  | "proposal.accepted"
  | "proposal.declined"
  | "invoice.created"
  | "document.signed";

type Entry = {
  companyId: string;
  event: LedgerEvent;
  refId?: string | null;      // the proposal or invoice this is about
  actor?: string | null;      // who did it - a name, an email, or "customer"
  amount?: number | null;     // money, where the event has any
  detail?: Record<string, any> | null;
  ip?: string | null;
  userAgent?: string | null;
};

function service() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function recordEvent(e: Entry): Promise<void> {
  try {
    if (!e.companyId || !e.event) return;
    const sb = service();
    if (!sb) {
      console.error("[ledger] no service role - event not recorded:", e.event);
      return;
    }
    const { error } = await sb.schema("suite").from("ledger").insert({
      company_id: e.companyId,
      event: e.event,
      ref_id: e.refId || null,
      actor: e.actor || null,
      amount: typeof e.amount === "number" && isFinite(e.amount) ? e.amount : null,
      detail: e.detail || null,
      ip_address: e.ip || null,
      user_agent: e.userAgent ? String(e.userAgent).slice(0, 400) : null,
    });
    if (error) console.error("[ledger] could not record", e.event, error.message);
  } catch (err: any) {
    console.error("[ledger] threw on", e.event, err && err.message);
  }
}
