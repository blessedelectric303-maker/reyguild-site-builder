import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// THE NIGHTLY SNAPSHOT
//
// Every proposal a company has ever written lives in ONE row of app_storage,
// and the app rewrites that row on every save. That is fine until somebody
// deletes in bulk, or a stale browser tab writes an old copy over the current
// one - which has already cost this company a proposal once.
//
// So once a night, every one of those rows is copied into suite.storage_history
// and kept. Nothing in the app can write to that table: it goes in through the
// service role, and the app never holds the service role. If a hundred invoices
// vanish on a Tuesday, Monday night is still sitting there.
//
// Restoring is deliberately manual. An automatic restore would be one more
// thing that can overwrite good data with old data, and the whole point of this
// table is that it never does that to anybody.

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

export async function GET(req: NextRequest) {
  // Vercel signs its cron calls. Without this, anybody who knew the URL could
  // make the database write copies of everything all day long.
  // REFUSE TO RUN UNGUARDED.
  // This used to skip the check entirely when CRON_SECRET was missing, so one
  // typo in an environment variable turned a job that touches every company on
  // the platform into a public URL anybody could fire. Unconfigured is a
  // failure, not permission.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 500 });
  }
  const auth = req.headers.get("authorization") || "";
  if (auth !== "Bearer " + secret) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const sb = service();
  if (!sb) {
    return NextResponse.json({ error: "Storage is not configured." }, { status: 500 });
  }

  const { data, error } = await sb
    .schema("suite")
    .from("app_storage")
    .select("company_id, key, value, updated_at")
    .in("key", KEYS);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data as any[]) || [];
  if (!rows.length) {
    return NextResponse.json({ ok: true, saved: 0, note: "nothing to copy" });
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
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, saved: batch.length, taken_at: stamp });
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
