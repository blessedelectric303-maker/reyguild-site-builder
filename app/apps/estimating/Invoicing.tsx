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


/* THE THREE-LINE MENU AND ITS DRAWER.
   These styles went missing when the stylesheet was rebuilt - the markup
   stayed, so the button rendered as three empty spans with no size and no
   colour, which looks exactly like nothing at all. */
.fl-burger{
  display:flex; flex-direction:column; justify-content:center; gap:4px;
  width:36px; height:36px; padding:8px; border:0; background:none;
  cursor:pointer; flex:none;
}
.fl-burger span{ display:block; height:2px; background:#e2e8f0; border-radius:2px; }
.fl-burger:hover span{ background:#fff; }

.fl-msgdot{
  position:absolute; top:-8px; right:-14px; min-width:17px; padding:0 5px;
  border-radius:9px; background:#dc2626; color:#fff;
  font-size:10px; font-weight:700; line-height:17px; text-align:center;
}
.fl-tmmsg{
  position:relative; background:none; border:none; cursor:pointer;
  font-family:inherit; font-size:11px; font-weight:600; color:#94a3b8;
  text-decoration:none; padding:2px 0;
}
.fl-tmmsg.on{ color:#fff; }

.fl-scrim{ position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:60; }
.fl-drawer{
  position:fixed; top:0; left:0; bottom:0; width:17rem; max-width:85%;
  background:#0f172a; color:#e2e8f0; z-index:70;
  display:flex; flex-direction:column; box-shadow:0 0 40px rgba(0,0,0,.5);
}

/* "Guild" is navy in the light lockup. Inside the navy drawer that makes it
   invisible - it read as "Rey" followed by a hole. */
.fl-drawer-wordmark .fl-guild{ color:#FCFCFC !important; }
.fl-drawer-wordmark .fl-rey{ color:#CC9000 !important; }
.fl-mobrand-word .fl-guild{ color:#FCFCFC !important; }
.fl-mobrand-word .fl-rey{ color:#CC9000 !important; }


/* THE TWO WAYS OUT, for somebody with no command centre to go back to.
   Even halves - neither is the safer choice, so neither gets to look like
   the default. */
.fl-leaverow .fl-btn-swap{
  background:var(--metal, linear-gradient(160deg,#F0CE7A,#CC9000 34%,#8A5E00 58%,#D89000 82%,#F0CE7A));
  color:#16243F !important; border:none;
  box-shadow:0 8px 22px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.45);
}
.fl-leaverow .fl-btn-signout{
  background:#fff; color:#DC2626 !important; border:1px solid #DC2626;
}

/* The text size picker. */
.fl-seg{ display:flex; gap:6px; }
.fl-seg-btn{
  flex:1; border:1px solid #16243F; background:#fff; color:#16243F;
  border-radius:6px; padding:10px 8px; cursor:pointer;
  font-family:inherit; font-size:13px; font-weight:600;
}
.fl-seg-btn.on{ background:#16243F; color:#fff; }

.fl-pagehead{
  display:none;
  text-align:center; font-size:16px; font-weight:700; color:#16243F;
  margin:14px auto 0; max-width:42rem;
}
@media (max-width: 860px){
  /* Phone only. On a desktop the sidebar already highlights the page. */
  .fl-hasmenu ~ .fl-pagehead,
  .fl-pagehead{ display:block; }
}

.fl-drawer-brand{
  display:flex; align-items:center; gap:10px;
  padding:18px 16px 14px; border-bottom:1px solid #1e293b;
}
.fl-drawer-crest{ line-height:0; flex:none; }
.fl-drawer-crest img{ height:42px; width:auto; }
.fl-drawer-brandtext{ display:flex; flex-direction:column; min-width:0; }
.fl-drawer-wordmark{ font-size:20px; font-weight:800; line-height:1.05; }
/* The subtitle is letter-spaced to sit the same width as the wordmark above
   it, the way T and M's "T&M & P&L" does - two lines that line up read as
   one mark rather than a label stuck underneath. */
.fl-drawer-sub{
  font-size:9px; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
  color:#94a3b8; margin-top:3px;
}
.fl-drawer-who{ padding:18px 16px; border-bottom:1px solid #1e293b; }
.fl-drawer-name{ font-size:15px; font-weight:600; color:#fff; }
.fl-drawer-role{
  font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#94a3b8;
}
.fl-drawer-nav{ flex:1; overflow-y:auto; padding:10px; }
.fl-drawer-link{
  display:block; width:100%; text-align:left; background:none; border:none;
  border-left:3px solid transparent; border-radius:6px; cursor:pointer;
  font-family:inherit; font-size:14px; font-weight:600; color:#cbd5e1;
  padding:11px 13px; text-decoration:none;
}
.fl-drawer-link:hover{ background:rgba(255,255,255,.05); color:#fff; }
.fl-drawer-link.on{
  background:rgba(255,255,255,.07); color:#fff; border-left-color:#CC9000;
}
.fl-drawer-foot{
  border-top:1px solid #1e293b; padding:14px; display:grid; gap:8px;
}
.fl-drawer-foot a{
  display:block; text-align:center; border-radius:6px; padding:10px 12px;
  font-size:12px; font-weight:700; text-decoration:none;
}

/* THE PHONE HEADER.
   Brand on one side and the name on the other were both wrapping onto three
   lines and colliding. On a phone the brand lives in the drawer, so the bar
   carries the burger and who you are - nothing else. */
.fl-mobrand{ display:none; }

@media (max-width: 860px) {
  /* Burger left, crest right, nothing between. Who you are is in the drawer,
     the way T and M does it - a name and title in the top bar is something
     you read once and then never again, and it was wrapping onto three lines
     to say it. */
  .fl-hasmenu .fl-tmleft{ display:none !important; }
  .fl-hasmenu .fl-tmwho{ display:none !important; }
  .fl-hasmenu .fl-tmtop{
    display:flex !important; align-items:center; justify-content:space-between;
    padding:10px 12px !important;
  }
  /* The crest sits in the MIDDLE of the bar with a word either side, so the
     mark reads as one thing across a single line. Absolutely positioned so
     it is centred on the BAR, not on whatever is left over after the
     burger - otherwise it drifts left by half a button. */
  .fl-hasmenu .fl-tmtop{ position:relative; }
  .fl-hasmenu .fl-mobrand{
    display:flex; align-items:center; gap:8px;
    position:absolute; left:50%; transform:translateX(-50%);
    line-height:0; white-space:nowrap;
  }
  .fl-hasmenu .fl-mobrand img{ height:30px; width:auto; }
  .fl-hasmenu .fl-mobrand-l,
  .fl-hasmenu .fl-mobrand-r{
    font-size:11px; font-weight:700; letter-spacing:.1em;
    text-transform:uppercase; color:#CC9000; line-height:1;
  }
  .fl-hasmenu .fl-mobrand-r{ color:#e2e8f0; }
  .fl-hasmenu .fl-tmright{ flex:none; }
}

/* The welcome, for an owner or admin with nothing in the app yet. It goes
   on its own once there is a proposal or an invoice - a banner you have to
   dismiss outstays its welcome, and one that never leaves teaches people to
   stop reading banners. */
.fl-welcome {
  max-width: 42rem; margin: 16px auto 0; padding: 18px 20px;
  border: 1px solid #16243F; border-left: 4px solid #CC9000;
  border-radius: 10px; background: #fff;
}
.fl-dashpanels{
  display:grid; gap:12px; margin-top:14px; max-width:42rem;
}
.fl-dashpanel{
  border:1px solid #16243F; border-radius:10px; background:#fff; padding:14px 16px;
}
.fl-dashpanel-head{
  display:flex; align-items:baseline; justify-content:space-between; gap:10px;
}
.fl-dashpanel-head h2{
  margin:0; font-size:15px; font-weight:700; color:#16243F;
}
.fl-dashpanel-head button{
  background:none; border:none; cursor:pointer; font-family:inherit;
  font-size:12px; font-weight:600; color:#16243F; text-decoration:underline;
}
/* "None" is information. It should read as a calm statement, not an error. */
.fl-dashnone{ margin:10px 0 0; font-size:13px; color:#64748b; }
.fl-dashlist{ list-style:none; margin:10px 0 0; padding:0; }
.fl-dashlist li{
  display:flex; justify-content:space-between; gap:12px;
  padding:7px 0; border-bottom:1px solid rgba(22,36,63,.12); font-size:13px;
}
.fl-dashlist li:last-child{ border-bottom:none; }
.fl-dashlist-name{ color:#39415a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.fl-dashlist-amt{ flex:none; font-weight:600; color:#16243F; }

@media (min-width: 861px){
  /* Two across on a desktop, like T and M. */
  .fl-dashpanels{ grid-template-columns:1fr 1fr; max-width:none; }
}

.fl-welcome-wave{ font-size:20px; margin-right:6px; }
.fl-welcome-hi { font-size: 17px; font-weight: 700; color: #16243F; }
.fl-welcome-p { font-size: 13px; color: #39415a; margin: 6px 0 0; line-height: 1.5; }
.fl-welcome-list { margin: 10px 0 0; padding-left: 18px; }
.fl-welcome-list li { font-size: 13px; color: #39415a; line-height: 1.5; margin-bottom: 6px; }
.fl-welcome-btns { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
/* The first one is what a new owner should press. */
.fl-welcome-btns a:first-child { background: #0F6E56 !important; color: #fff !important; border: none !important; }
.fl-welcome-btns button, .fl-welcome-btns a {
  border: none; border-radius: 6px; padding: 9px 14px; cursor: pointer;
  font-family: inherit; font-size: 13px; font-weight: 700; text-decoration: none;
  background: #CC9000; color: #16243F;
}
.fl-welcome-btns a { background: #fff; color: #16243F; border: 1px solid #16243F; }

/* THE SIDEBAR FURNITURE, matched to T and M and P and L. */
.fl-brandwrap { display: flex; flex-direction: column; line-height: 1.15; }
.fl-brandsub {
  font-size: 9px; font-weight: 700; letter-spacing: .16em;
  text-transform: uppercase; color: #94a3b8; margin-top: 3px;
}
.fl-portal { display: none; }
.fl-sidefoot { display: none; }
.fl-sideme { display: none; }

@media (min-width: 861px) {
  /* The sidebar is a column: header, nav, then the foot pinned to the bottom
     - which is where T and M puts leaving and who you are. */
  .fl-tmhead { display: flex !important; flex-direction: column; }
  .fl-tmnav { flex: 1 1 auto; }

  .fl-portal {
    display: block; padding: 0 18px 12px;
    font-size: 12px; color: #94a3b8; text-transform: capitalize;
  }

  .fl-sidefoot {
    display: grid; gap: 8px; padding: 14px;
    border-top: 1px solid #1e293b;
  }
  .fl-sidefoot a {
    display: block; text-align: center; border-radius: 6px;
    padding: 10px 12px; font-size: 12px; font-weight: 700; text-decoration: none;
  }

  .fl-sideme { display: block; padding: 12px 16px 4px; border-top: 1px solid #1e293b; }
  .fl-sideme-name { font-size: 13px; font-weight: 600; color: #e2e8f0; }
  .fl-sideme-mail { font-size: 11px; color: #94a3b8; word-break: break-all; }

  /* Messages sits with the navigation rather than floating in the corner of
     a column - small and quiet, because it is a place to go, not a heading. */
  .fl-tmright { padding: 0 18px 12px; justify-content: flex-start !important; }
  .fl-tmmsg { font-size: 12px !important; font-weight: 600; color: #cbd5e1; }
  .fl-tmmsg.on { color: #fff; }
  .fl-tmwho { padding: 0 18px; }
}

/* PHONE: one column at 42rem, like the T and M tech view.
   DESKTOP: a sidebar down the left and the content filling what is left,
   like T and M and P and L. Same app, two shapes - not one stretched. */
@media (max-width: 860px) {
  .fl-noprint > *:not(.fl-tmhead) { max-width: 42rem; margin-left: auto !important; margin-right: auto !important; }
  .fl-grid, .fl-weekly { max-width: 42rem !important; margin-left: auto !important; margin-right: auto !important; }
  .so-subnav { max-width: 42rem !important; margin-left: auto !important; margin-right: auto !important; }

  /* THE TAB ROW GOES BEHIND THE MENU.
     For an owner or admin that row is eleven items wide and wraps into three
     lines of tiny text on a phone - with the burger beside it offering the
     same links again. One way in, not two.
     A tech keeps the tabs: five items fit across a phone, and a menu would
     be an extra tap for nothing. */
  .fl-hasmenu .fl-tmnav { display: none !important; }
}

@media (min-width: 861px) {
  .fl-burger { display: none; }

  .fl-noprint {
    display: grid !important;
    grid-template-columns: 16rem minmax(0, 1fr);
    align-items: start;
    min-height: 100vh;
  }
  .fl-tmhead {
    grid-column: 1; grid-row: 1 / -1;
    position: sticky; top: 0; align-self: stretch;
    min-height: 100vh; padding: 20px 0;
  }
  .fl-tmtop {
    display: block !important; max-width: none;
    padding: 0 18px 18px; border-bottom: 1px solid #1e293b;
  }
  .fl-tmleft { margin-bottom: 14px; }
  .fl-tmwho { text-align: left !important; }
  .fl-tmright { justify-content: flex-start !important; margin-top: 10px; }

  .fl-tmnav { display: block !important; max-width: none; padding: 14px 10px; }
  .fl-tmtab {
    display: block; width: 100%; text-align: left !important;
    padding: 10px 12px !important; border-bottom: none !important;
    border-left: 3px solid transparent; border-radius: 6px; font-size: 14px !important;
  }
  .fl-tmtab.on { border-left-color: #CC9000 !important; background: rgba(255,255,255,.06); }

  .fl-noprint > *:not(.fl-tmhead) {
    grid-column: 2; max-width: 78rem; width: 100%;
    margin-left: auto !important; margin-right: auto !important;
    padding-left: 28px; padding-right: 28px;
  }
  .fl-grid, .fl-weekly, .so-subnav,
  .fl-leaverow, .fl-signoutrow, .fl-answers { max-width: none !important; }
  .fl-dash { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
  .fl-dashcard { min-height: 84px; }
}

/* A proposal on paper should not have a navigation bar down the side of it. */
@media print {
  .fl-tmhead, .fl-leaverow, .fl-signoutrow { display: none !important; }
  .fl-noprint { display: block !important; }
  .fl-noprint > *:not(.fl-tmhead) { max-width: none !important; padding: 0 !important; }
}

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
        let myName = String(meta.full_name || meta.name || "").trim();
        try {
          const { data: dn, error: dnErr } = await supabase
            .schema("suite")
            .rpc("my_display_name");
          // supabase-js RETURNS errors rather than throwing them, so a 404
          // from a function that is not deployed yet lands here silently.
          // Falling back is correct; pretending it worked is not.
          if (!dnErr && dn && String(dn).trim()) myName = String(dn).trim();
        } catch {
          // Network failure. Same fallback.
        }
        if (!myName) myName = String(su?.email || "").split("@")[0];
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
