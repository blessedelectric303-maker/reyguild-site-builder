import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// TAKE YOUR DATA WITH YOU
//
// One section, or all of it. CSV for the things a person will open in a
// spreadsheet, JSON for the whole bundle.
//
// Owner and admin only, and the database enforces that rather than this route
// - export_bundle() refuses anybody else outright, so a crafted request gets
// nothing.
//
// What is NOT in here: ReyGuild's own templates. The booklet, the safety
// procedure and the NDAs are ours and stay ours. Everything the company wrote
// itself leaves freely.

function csvCell(v: any): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  // A leading =, +, - or @ makes Excel treat a cell as a formula. Prefixing
  // an apostrophe stops an exported customer note from executing.
  const safe = /^[=+\-@]/.test(s) ? "'" + s : s;
  return '"' + safe.replace(/"/g, '""') + '"';
}

function toCsv(rows: any[]): string {
  if (!rows.length) return "";
  const cols: string[] = [];
  rows.forEach((r) => Object.keys(r || {}).forEach((k) => {
    if (!cols.includes(k)) cols.push(k);
  }));
  const head = cols.map(csvCell).join(",");
  const body = rows.map((r) => cols.map((c) => csvCell((r || {})[c])).join(",")).join("\n");
  // BOM so Excel opens UTF-8 correctly instead of mangling accented names.
  return "\uFEFF" + head + "\n" + body;
}

const SECTIONS: Record<string, string> = {
  clients: "so_clients",
  pricelist: "so_pricelist",
  proposals: "so_estimates",
  invoices: "so_invoices",
  people: "so_people",
  payouts: "so_payouts",
  messages: "so_messages",
};

export async function GET(req: NextRequest) {
  const section = req.nextUrl.searchParams.get("section") || "everything";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const { data: bundle, error } = await supabase.schema("suite").rpc("export_bundle");
  if (error) {
    return NextResponse.json(
      { error: error.message || "Export is not available on this account." },
      { status: 403 }
    );
  }

  const b: any = bundle || {};
  const stamp = new Date().toISOString().slice(0, 10);
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0].trim() : req.headers.get("x-real-ip");

  const log = async (rows: number) => {
    try {
      await supabase.schema("suite").rpc("record_export", {
        p_section: section,
        p_rows: rows,
        p_ip: ip,
      });
    } catch {
      // Never block an export because the log failed. The data is theirs.
    }
  };

  if (section === "everything") {
    await log(0);
    return new NextResponse(JSON.stringify(b, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="reyguild-export-' + stamp + '.json"',
      },
    });
  }

  let rows: any[] = [];

  if (section === "signatures") rows = b.signatures || [];
  else if (section === "documents") rows = b.own_documents || [];
  else if (section === "files") rows = b.uploaded_files || [];
  else if (section === "responses") rows = b.proposal_responses || [];
  else {
    const key = SECTIONS[section];
    if (!key) return NextResponse.json({ error: "Unknown section." }, { status: 400 });
    try {
      rows = JSON.parse(((b.app_data || {}) as any)[key] || "[]");
    } catch {
      rows = [];
    }
  }

  if (!Array.isArray(rows)) rows = [];
  await log(rows.length);

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="reyguild-' + section + "-" + stamp + '.csv"',
    },
  });
}
