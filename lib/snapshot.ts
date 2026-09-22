import { createClient } from "@supabase/supabase-js";

// THE NIGHTLY SNAPSHOT, AS A FUNCTION RATHER THAN A ROUTE.
//
// It started life as its own cron job and never ran once: this project is on
// Vercel's free plan, which allows ONE cron job, so the second one was
// accepted into vercel.json and quietly ignored. Four days of backups that
// were never taken, and nothing anywhere said so.
//
// So the work lives here now, and the one cron job that DOES run calls it.
// One schedule, two jobs, no plan limit to fall foul of - and if the plan
// changes later, nothing needs rewriting.
//
// Every proposal a company has ever written lives in ONE row of app_storage,
// and the app rewrites that row on every save. That is fine until somebody
// deletes in bulk, or a stale browser tab writes an old copy over the current
// one - which has already cost this company a proposal once. Once a night,
// every one of those rows is copied into suite.storage_history and kept.
// Nothing in the app can write to that table: it goes in through the service
// role, and the app never holds the service role.

const KEYS = [
  "so_estimates",
  "so_invoices",
  "so_clients",
  "so_people",
  "so_price",
  "so_payouts",
  "so_audit",
];

function service() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export type SnapshotResult = { ok: boolean; saved: number; error?: string };

export async function runSnapshot(): Promise<SnapshotResult> {
  const sb = service();
  if (!sb) {
    return { ok: false, saved: 0, error: "Storage is not configured." };
  }

  const { data, error } = await sb
    .schema("suite")
    .from("app_storage")
    .select("company_id, key, value, updated_at")
    .in("key", KEYS);

  if (error) {
    return { ok: false, saved: 0, error: error.message };
  }

  const rows = (data as any[]) || [];
  if (!rows.length) {
    return { ok: true, saved: 0 };
  }

  // One row per company per key per run. A day with no changes still gets a
  // copy - storage is cheap and a gap in the history is not worth saving it.
  const stamp = new Date().toISOString();
  const batch = rows.map((r) => ({
    company_id: r.company_id,
    key: r.key,
    value: r.value,
    source_updated_at: r.updated_at,
    items: countItems(r.value),
    taken_at: stamp,
  }));

  const { error: insErr } = await sb.schema("suite").from("storage_history").insert(batch);
  if (insErr) {
    return { ok: false, saved: 0, error: insErr.message };
  }

  return { ok: true, saved: batch.length };
}

// How many records this copy holds. Stored alongside so the history can be read
// at a glance - a night where a company went from 118 proposals to 4 is the
// thing somebody needs to spot, and nobody spots it by reading JSON.
function countItems(value: any): number | null {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.length : null;
  } catch {
    return null;
  }
}
