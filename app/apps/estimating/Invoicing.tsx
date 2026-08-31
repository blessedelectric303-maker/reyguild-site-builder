"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ComponentType } from "react";
import { createClient } from "@/utils/supabase/client";
import { buildTokenMap, fillTokens, type CompanyFacts } from "@/utils/tokens";

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
/* Reshape the invoicing app into the same dark-sidebar layout as T&M&P&L.
   The app's own markup is untouched; this positions it. */
.fl-root { background: #f8fafc; }
.fl-noprint { display: block !important; padding-left: 250px; min-height: 100vh; }

/* Sidebar: brand block on top, nav beneath, both fixed to the left edge. */
.fl-header {
  position: fixed !important; top: 0; left: 0; width: 250px; height: 132px;
  background: #0f172a !important; border-bottom: 1px solid #1e293b !important;
  display: flex !important; flex-direction: column !important; align-items: flex-start !important;
  justify-content: center !important; gap: 10px !important; padding: 0 18px !important; margin: 0 !important; z-index: 40;
}
.fl-header .fl-guild, .fl-header .fl-tagline, .fl-header .fl-brandname { color: #f1f5f9 !important; }
.fl-header .fl-tagline { letter-spacing: .18em !important; }
.fl-stats { flex-wrap: wrap !important; gap: 6px !important; }
.fl-stats .fl-chip { display: none !important; }
.fl-actas { background: #1e293b !important; border-radius: 6px !important; padding: 4px 8px !important; }
.fl-actas select { color: #f1f5f9 !important; background: transparent !important; font-weight: 700 !important; border: 0 !important; }
.fl-rolebadge { background: #e0a82e !important; color: #0f172a !important; }

.fl-nav3 {
  position: fixed !important; top: 132px; left: 0; width: 250px; bottom: 0;
  background: #0f172a !important; border: 0 !important; margin: 0 !important;
  display: flex !important; flex-direction: column !important; align-items: stretch !important;
  gap: 2px !important; padding: 14px 10px !important; overflow-y: auto; z-index: 40;
}
.fl-sideback {
  display: block; text-align: center; background: #e0a82e; color: #0f172a;
  font-weight: 800; font-size: 13px; border-radius: 6px; padding: 9px 10px;
  text-decoration: none; margin-bottom: 12px;
}
.fl-sidelink {
  display: block; width: 100%; text-align: left; background: transparent; border: 0;
  color: #cbd5e1; font-size: 14px; font-weight: 600; padding: 9px 12px;
  border-radius: 6px; cursor: pointer; font-family: inherit;
}
.fl-sidelink:hover { background: #1e293b; color: #fff; }
.fl-sidelink.on { background: #e0a82e; color: #0f172a; font-weight: 800; }

/* Content fills the page next to the sidebar. */
.fl-noprint > *:not(.fl-header):not(.fl-nav3) { max-width: none !important; margin-left: 0 !important; margin-right: 0 !important; width: auto !important; }
.fl-grid, .fl-weekly { max-width: none !important; margin-left: 0 !important; margin-right: 0 !important; }
.so-subnav { width: 100% !important; max-width: none !important; margin-left: 0 !important; }

/* The name selector already says who you are. Drop the second copy. */
.fl-rolebadge { display: none !important; }

/* Dashboard: greeting, then big cards two to a row. */
.fl-dashwrap { padding-top: 30px; }
.fl-dashhello { font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 34px; color: #16243F; margin: 0; letter-spacing: -0.01em; }
.fl-dashdate { font-family: 'Inter', sans-serif; font-size: 15px; color: #39415a; margin: 6px 0 26px; }
.fl-dash { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.fl-dashcard {
  display: flex; flex-direction: column; align-items: flex-start; gap: 14px;
  background: #fff; border: 1px solid #E4DECF; border-radius: 8px;
  padding: 30px 28px; min-height: 140px; cursor: pointer; font-family: inherit; text-align: left;
}
.fl-dashcard:hover { border-color: #C68A1E; }
.fl-dashcard.due { border-color: #C68A1E; box-shadow: inset 0 0 0 1px #C68A1E; }
.fl-dashcard.alert { border-color: #BC4A3C; box-shadow: inset 0 0 0 1px #BC4A3C; }
.fl-dashlbl { font-family: 'JetBrains Mono', monospace; font-size: 12px; text-transform: uppercase; letter-spacing: .12em; color: #39415a; }
.fl-dashnum { font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 46px; line-height: 1; color: #16243F; }

/* Phones: the same chrome as the T and M tech view. Dark slate bar, the
   crest, the name with the role under it, then ONE row of tabs. Everything
   below is a white card with a hairline border, same as the other side. */
@media (max-width: 860px) {
  .fl-header {
    background: #0f172a !important; color: #fff !important;
    display: flex !important; align-items: center !important;
    justify-content: space-between !important; gap: 8px;
  }
  .fl-header, .fl-header * { border-color: #1e293b !important; }
  .fl-tagline { color: #94a3b8 !important; font-size: 11px !important; }
  .fl-stats { gap: 6px !important; }
  /* The five counters were five full-width cards before any content. They
     are a desk screen, not a truck screen. */
  .fl-stats .fl-chip { display: none !important; }
  .fl-actas { margin: 0 !important; }
  .fl-nav3 {
    background: #0f172a !important; gap: 0 !important;
    justify-content: space-between !important; padding: 0 4px 8px !important;
  }
  .fl-nav3 .fl-sidelink, .fl-nav3 button {
    background: transparent !important; border: none !important;
    color: #94a3b8 !important; font-size: 13px !important;
    padding: 8px 6px !important; font-weight: 600 !important;
  }
  .fl-nav3 .fl-sidelink.active, .fl-nav3 button.active {
    color: #fff !important; border-bottom: 2px solid #e0a82e !important;
    border-radius: 0 !important;
  }
  .fl-dashwrap { padding-top: 16px; }
}

/* Settings footer: gold switch on the left, white box with red lettering on
   the right. Identical to the T and M tech settings, deliberately. */
.fl-footactions {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; margin: 24px 0 8px;
}
.fl-switchbtn {
  background: #e0a82e; color: #0f172a; font-weight: 700; font-size: 14px;
  padding: 10px 16px; border-radius: 6px; text-decoration: none;
}
.fl-signoutbtn {
  background: #fff; color: #dc2626; border: 1px solid #fca5a5;
  font-weight: 700; font-size: 14px; padding: 10px 16px; border-radius: 6px;
  text-decoration: none;
}
.fl-whoami { font-weight: 700; color: inherit; }

@media (max-width: 860px) {
  .fl-noprint { padding-left: 0; }
  .fl-header { position: static !important; width: auto; height: auto; padding: 14px 16px !important; }
  .fl-nav3 {
    position: static !important; width: auto; bottom: auto;
    flex-direction: row !important; flex-wrap: wrap !important; padding: 10px !important;
  }
  .fl-sideback { width: 100%; }
  .fl-dash { grid-template-columns: minmax(0, 1fr); }
  .fl-dashhello { font-size: 26px; }
  .fl-sidelink { width: auto; }
  .fl-stats .fl-chip { display: flex !important; }
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
  const [role, setRole] = useState("tech");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = createClient();
        // Scoped to THIS user. Without the filter, row security returns any
        // member of the company and limit(1) picks one at random.
        const {
          data: { user: su },
        } = await supabase.auth.getUser();
        const { data: mem } = await supabase
          .schema("suite")
          .from("memberships")
          .select("company_id,role")
          .eq("user_id", su?.id || "")
          .limit(1)
          .maybeSingle();
        const companyId = (mem as any)?.company_id || "";
        // THE ROLE COMES FROM THE MEMBERSHIP, NOT FROM A DROPDOWN.
        // Before this, the estimating app defaulted every visitor to "Owner"
        // and let them pick anybody from an "Acting as" menu - which handed a
        // tech cost, margin, the price list and CSV export of every client.
        const suiteRole = (mem as any)?.role || "tech";
        if (!companyId) {
          if (alive) setErr("No company found for this account. Open Settings and set up your company first.");
          return;
        }
        // The three standard proposal lines - labour and materials, the
        // warranty and the contract agreement - are written universal, with
        // [COMPANY NAME] standing in. They print on a customer's proposal, so
        // the substitution has to happen before anything is sent. Without it
        // a customer receives a contract with a bracket in it.
        try {
          const { data: co } = await supabase
            .schema("suite")
            .from("companies")
            .select("name,phone,email,website,address,city,state,zip,owner_name,trade,settings")
            .eq("id", companyId)
            .maybeSingle();
          const map = buildTokenMap(((co || {}) as unknown) as CompanyFacts);
          (window as any).fillCompanyTokens = (text: string) => fillTokens(text, map);
        } catch {
          (window as any).fillCompanyTokens = (text: string) => text;
        }

        installStorage(companyId);
        await migrateLegacy(companyId);
        if (alive) { setRole(suiteRole); setReady(true); }
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
      <InvoicingApp suiteRole={role} />
    </>
  );
}
