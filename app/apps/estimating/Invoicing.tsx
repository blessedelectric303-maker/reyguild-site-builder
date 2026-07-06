"use client";

import dynamic from "next/dynamic";
import { type ComponentType } from "react";

// The invoicing app saves through window.storage, which only exists in the
// Claude artifact environment. Back it with the browser's localStorage so data
// persists. (Next step: back this with Supabase for real account-based storage.)
if (typeof window !== "undefined" && !(window as any).storage) {
  const PREFIX = "reyguild_inv:";
  (window as any).storage = {
    async get(key: string) {
      const v = window.localStorage.getItem(PREFIX + key);
      return v == null ? null : { key, value: v };
    },
    async set(key: string, value: string) {
      window.localStorage.setItem(PREFIX + key, value);
      return { key, value };
    },
    async delete(key: string) {
      window.localStorage.removeItem(PREFIX + key);
      return { key, deleted: true };
    },
    async list(prefix = "") {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(PREFIX)) {
          const bare = k.slice(PREFIX.length);
          if (bare.startsWith(prefix)) keys.push(bare);
        }
      }
      return { keys, prefix };
    },
  };
}

// Company name blue on white; role badge always gold w/ white text;
// center the inner pages (Follow-ups, Royalties, Numbers, Help, SOPs, Audit)
// and the settings pill row; and wrap the top stat cards on phones.
const STYLE_FIX = `
.fl-actas { background: #FFFFFF !important; }
.fl-actas select { color: #34507A !important; font-weight: 700 !important; }
.fl-rolebadge { background: #e0a82e !important; color: #FFFFFF !important; }
.fl-weekly { margin-left: auto !important; margin-right: auto !important; }
.so-subnav { max-width: 880px !important; margin-left: auto !important; margin-right: auto !important; }
@media (max-width: 620px) {
  .fl-stats { flex-wrap: wrap !important; row-gap: 8px !important; }
  .fl-stats > .fl-actas { flex: 1 1 100% !important; }
  .fl-stats > .fl-chip { flex: 1 1 28% !important; min-width: 0 !important; }
}
`;

const InvoicingApp = dynamic(() => import("./ReyGuild-Invoicing"), {
  ssr: false,
  loading: () => (
    <div className="p-10 text-center text-slate-400">Loading invoicing…</div>
  ),
}) as ComponentType<any>;

export default function Invoicing() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLE_FIX }} />
      <InvoicingApp />
    </>
  );
}
