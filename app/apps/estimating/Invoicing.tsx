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

/* BOX OUTLINES.
   The panels were outlined in #E4DECF, a warm off-white that all but
   disappears against a white card - so a screen full of boxes read as one
   flat sheet. Navy makes each box a box. Same navy as the wordmark and the
   command centre button, so nothing new is introduced. */
.fl-root .fl-card,
.fl-root .fl-panel,
.fl-root .fl-box,
.fl-root .fl-guide,
.fl-root .fl-dashcard,
.fl-root table.fl-table,
.fl-root .fl-answer,
.fl-root .so-sup,
.fl-root .fl-weekly > div,
.fl-root .so-subnav .fl-pill {
  border-color: #16243F !important;
}

/* Table rules inside a card, so the grid lines match the outline. */
.fl-root table th,
.fl-root table td {
  border-color: rgba(22, 36, 63, 0.25) !important;
}

/* The input boxes too - a form inside a navy-outlined card looked unfinished
   with pale grey fields sitting in it. */
.fl-root input,
.fl-root select,
.fl-root textarea {
  border-color: rgba(22, 36, 63, 0.45) !important;
}
.fl-root input:focus,
.fl-root select:focus,
.fl-root textarea:focus {
  border-color: #16243F !important;
  outline: none;
}

/* Anything still carrying the old warm border. */
.fl-root [style*="E4DECF"],
.fl-root [style*="e4decf"] {
  border-color: #16243F !important;
}
/* The invoicing app used to be reshaped into a 250px fixed left sidebar.
   The header is now built to the same shape as T&M&P&L - a dark bar across
   the top - so the sidebar rules are gone. Leaving them behind is what
   squeezed the whole app into a narrow column on the right: the elements
   they positioned no longer existed, but the 250px padding-left survived. */
.fl-root { background: #f8fafc; }
.fl-noprint { display: block !important; padding-left: 0 !important; min-height: 100vh; }

/* Content is full width now. Nothing is pinned to a left edge. */
.fl-noprint > *:not(.fl-tmhead) { max-width: 42rem; margin-left: auto !important; margin-right: auto !important; }
.fl-grid, .fl-weekly { max-width: 42rem !important; margin-left: auto !important; margin-right: auto !important; }
.so-subnav { max-width: 42rem !important; margin-left: auto !important; margin-right: auto !important; }

/* The header, built to the same shape as T and M and P and L. */
.fl-tmhead { background: #0f172a; color: #fff; }
.fl-tmtop {
  max-width: 42rem; margin: 0 auto; padding: 12px 16px;
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
}
.fl-tmleft { flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; }
.fl-tmleft .fl-logo img { height: 24px; width: auto; }
.fl-tmleft .fl-brandname { font-size: 15px; font-weight: 800; letter-spacing: .02em; }
.fl-tmleft .fl-rey { color: #CC9000; }
.fl-tmleft .fl-guild { color: #fff; }
.fl-tmwho { flex: 1; min-width: 0; text-align: center; }
.fl-tmname { display: block; font-size: 14px; font-weight: 600; color: #e2e8f0; }
.fl-tmselect {
  background: transparent; border: none; color: #e2e8f0; max-width: 100%;
  font-size: 14px; font-weight: 600; text-align: center; font-family: inherit;
}
.fl-tmrole {
  display: block; font-size: 11px; text-transform: uppercase;
  letter-spacing: .06em; color: #94a3b8;
}
.fl-tmright { flex: 1; display: flex; justify-content: flex-end; }
.fl-tmset {
  background: none; border: none; cursor: pointer; font-family: inherit;
  font-size: 12px; color: #94a3b8; text-decoration: underline;
}
.fl-tmset.on, .fl-tmset:hover { color: #fff; }
.fl-tmnav { max-width: 42rem; margin: 0 auto; padding: 0 4px; display: flex; }
.fl-tmtab {
  flex: 1; min-width: 0; background: none; border: none; cursor: pointer;
  text-align: center; padding: 10px 2px; font-size: 12px; font-weight: 600;
  line-height: 1.2; color: #cbd5e1; border-bottom: 2px solid transparent;
  font-family: inherit;
}
.fl-tmtab:hover { color: #fff; border-bottom-color: #475569; }
.fl-tmtab.on { color: #fff; border-bottom-color: #CC9000; }

/* The price editor. Two prices side by side, then the three numbers that
   build them, then the one line the customer reads. */
.fl-pricepair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.fl-three { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.fl-warn { color: #7A3E00 !important; background: #FFF7E6; border: 1px solid #EFC46A;
           border-radius: 6px; padding: 8px 10px; }
.so-scope { font-size: 12px; color: #475569; line-height: 1.4; margin-top: 3px; max-width: 34rem; }
.so-scope.missing { color: #b45309; font-style: italic; }
.so-dash { color: #cbd5e1; }

/* The count on a tab. Small, red, and only there when it means something. */
.fl-badge {
  display: inline-block; margin-left: 5px; min-width: 16px; padding: 0 4px;
  border-radius: 8px; background: #dc2626; color: #fff;
  font-size: 10px; font-weight: 700; line-height: 16px; text-align: center;
}

/* Customer answers, at the top of Proposals. */
.fl-answers { max-width: 42rem; margin: 16px auto 0; }
.fl-answers-h {
  font-size: 12px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .06em; color: #16243F; margin-bottom: 8px;
}
.fl-answer {
  display: flex; align-items: flex-start; gap: 10px;
  background: #fff; border: 1px solid #16243F; border-left: 4px solid #94a3b8;
  border-radius: 8px; padding: 12px 14px; margin-bottom: 8px;
}
.fl-answer.yes { border-left-color: #0F6E56; background: #F3FBF8; }
.fl-answer-main { flex: 1; min-width: 0; }
.fl-answer-t { font-weight: 700; font-size: 14px; color: #16243F; }
.fl-answer-s { font-size: 12px; color: #64748b; margin-top: 2px; }
.fl-answer-r {
  font-size: 13px; color: #39415a; margin-top: 6px; font-style: italic;
  line-height: 1.45;
}
.fl-answer-d { font-size: 11px; color: #94a3b8; margin-top: 6px; }
.fl-answer-x {
  flex: none; background: #16243F; color: #CC9000; border: none;
  border-radius: 6px; padding: 8px 12px; font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: inherit;
}

/* Leaving the app: three buttons, in the app's own colours. */
/* Two buttons, exactly the same width, side by side. flex:1 with a shared
   basis is what makes them equal - space-between only pushed them apart and
   let the longer label be the wider button. */
.fl-leaverow {
  display: flex; align-items: stretch; gap: 10px;
  margin: 24px auto 10px; max-width: 42rem;
}
.fl-leaverow > a { flex: 1 1 0; text-align: center; }
.fl-signoutrow {
  display: flex; justify-content: center;
  margin: 0 auto 8px; max-width: 42rem;
}
.fl-btn-command, .fl-btn-swap, .fl-btn-signout {
  font-weight: 700; font-size: 13px; padding: 10px 14px;
  border-radius: 6px; text-decoration: none; white-space: nowrap;
}
.fl-btn-command { background: #16243F; color: #CC9000; }
.fl-btn-swap    { background: #CC9000; color: #16243F; }
.fl-btn-signout { background: #fff; color: #dc2626; border: 1px solid #fca5a5; }

/* Dashboard cards. */
.fl-dashwrap { padding-top: 20px; }
.fl-dashhello { font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 26px; color: #16243F; margin: 0; }
.fl-dashdate { font-family: 'Inter', sans-serif; font-size: 14px; color: #39415a; margin: 6px 0 20px; }
.fl-dash { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.fl-dashcard {
  display: flex; flex-direction: column; align-items: flex-start; gap: 10px;
  background: #fff; border: 1px solid #16243F; border-radius: 8px;
  padding: 18px 16px; min-height: 96px; cursor: pointer; font-family: inherit; text-align: left;
}
.fl-dashcard:hover { border-color: #C68A1E; }
.fl-dashcard.due { border-color: #C68A1E; }
.fl-dashcard.alert { border-color: #BC4A3C; }
.fl-dashlbl { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: #39415a; }
.fl-dashnum { font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 34px; line-height: 1; color: #16243F; }

/* Procedure guides: small boxes with a title you tap. */
.fl-guides { display: grid; gap: 8px; margin-top: 12px; }
.fl-guide {
  display: block; width: 100%; text-align: left; background: #fff;
  border: 1px solid #16243F; border-radius: 8px; padding: 14px 16px;
  text-decoration: none; cursor: pointer; font-family: inherit;
}
.fl-guide:hover { border-color: #C68A1E; }
.fl-guide-t { display: block; font-weight: 700; font-size: 14px; color: #16243F; }
.fl-guide-b { display: block; font-size: 12px; color: #64748b; margin-top: 3px; line-height: 1.4; }

.fl-whoami { font-weight: 700; font-size: 13px; color: #e2e8f0; }
.fl-rolebadge { display: none !important; }

@media (max-width: 640px) {
  .fl-tmtab { font-size: 11px; padding: 9px 1px; }
  .fl-tmtop { padding: 10px 12px; }
  .fl-dash { grid-template-columns: minmax(0, 1fr); }
  .fl-leaverow { gap: 8px; }
  .fl-btn-command, .fl-btn-swap, .fl-btn-signout { font-size: 12px; padding: 9px 11px; }
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
  const [who, setWho] = useState("");
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
        // The name shown above the role. The invoicing app only knew its own
        // "people" list, so anybody never added there showed a blank.
        const meta: any = (su as any)?.user_metadata || {};
        const myName = String(meta.full_name || meta.name || "").trim()
          || String(su?.email || "").split("@")[0];
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
        if (alive) { setRole(suiteRole); setWho(myName); setReady(true); }
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
      <InvoicingApp suiteRole={role} signedInName={who} />
    </>
  );
}
