"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ComponentType } from "react";
import { createClient } from "@/utils/supabase/client";

// The invoicing app saves through window.storage (a simple key/value API).
// We back that API with Supabase so proposals belong to the COMPANY instead of
// to one browser. Any device, any teammate, same data.
const LEGACY_PREFIX = "reyguild_inv:";

type Row = { key: string; value: string };

function installStorage(companyId: string) {
  const supabase = createClient();
  const table = () => supabase.schema("suite").from("app_storage");

  (window as any).storage = {
    async get(key: string) {
      const { data } = await table()
        .select("key,value")
        .eq("company_id", companyId)
        .eq("key", key)
        .maybeSingle();
      const row = data as Row | null;
      return row ? { key: row.key, value: row.value } : null;
    },
    async set(key: string, value: string) {
      await table().upsert(
        { company_id: companyId, key, value, updated_at: new Date().toISOString() },
        { onConflict: "company_id,key" }
      );
      return { key, value };
    },
    async delete(key: string) {
      await table().delete().eq("company_id", companyId).eq("key", key);
      return { key, deleted: true };
    },
    async list(prefix = "") {
      const { data } = await table()
        .select("key")
        .eq("company_id", companyId)
        .like("key", prefix + "%");
      const keys = ((data as Row[]) || []).map((r) => r.key);
      return { keys, prefix };
    },
  };
}

// One-time lift of anything already saved in this browser, so Ben's existing
// proposals survive the move. Runs only when the company has no rows yet.
async function migrateLegacy(companyId: string) {
  try {
    const supabase = createClient();
    const { count } = await supabase
      .schema("suite")
      .from("app_storage")
      .select("key", { count: "exact", head: true })
      .eq("company_id", companyId);
    if ((count || 0) > 0) return;

    const rows: { company_id: string; key: string; value: string }[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || !k.startsWith(LEGACY_PREFIX)) continue;
      const v = window.localStorage.getItem(k);
      if (v == null) continue;
      rows.push({ company_id: companyId, key: k.slice(LEGACY_PREFIX.length), value: v });
    }
    if (rows.length === 0) return;
    await supabase.schema("suite").from("app_storage").upsert(rows, { onConflict: "company_id,key" });
  } catch (e) {
    // A failed migration must never block the app from opening.
  }
}

// Company name blue on white; role badge always gold w/ white text.
// Make the content column a flex column so the inner pages actually center,
// then center them (Follow-ups, Royalties, Numbers, Help, SOPs, Audit + pills).
// Plus wrap the top stat cards on phones.
const STYLE_FIX = `
.fl-actas { background: #FFFFFF !important; }
.fl-actas select { color: #34507A !important; font-weight: 700 !important; }
.fl-rolebadge { background: #e0a82e !important; color: #FFFFFF !important; }
.fl-noprint { display: flex !important; flex-direction: column !important; }
.fl-header, .fl-nav3 { width: 100% !important; }
.fl-weekly { margin-left: auto !important; margin-right: auto !important; }
.fl-grid { margin-left: auto !important; margin-right: auto !important; }
.so-subnav { width: 100% !important; max-width: 880px !important; margin-left: auto !important; margin-right: auto !important; }
@media (max-width: 620px) {
  .fl-stats { flex-wrap: wrap !important; row-gap: 8px !important; }
  .fl-stats > .fl-actas { flex: 1 1 100% !important; }
  .fl-stats > .fl-chip { flex: 1 1 28% !important; min-width: 0 !important; }
}
`;

const InvoicingApp = dynamic(() => import("./ReyGuild-Invoicing"), {
  ssr: false,
  loading: () => (
    <div className="p-10 text-center text-slate-400">Loading proposals...</div>
  ),
}) as ComponentType<any>;

export default function Invoicing() {
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data: mem } = await supabase
          .schema("suite")
          .from("memberships")
          .select("company_id")
          .limit(1)
          .maybeSingle();
        const companyId = (mem as any)?.company_id || "";
        if (!companyId) {
          if (alive) setErr("No company found for this account. Open Settings and set up your company first.");
          return;
        }
        installStorage(companyId);
        await migrateLegacy(companyId);
        if (alive) setReady(true);
      } catch (e: any) {
        if (alive) setErr("Could not reach your company data. Check your connection and reload.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (err) {
    return <div className="p-10 text-center text-sm text-red-400">{err}</div>;
  }
  if (!ready) {
    return <div className="p-10 text-center text-slate-400">Loading proposals...</div>;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLE_FIX }} />
      <InvoicingApp />
    </>
  );
}
