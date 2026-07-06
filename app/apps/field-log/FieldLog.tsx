"use client";

import dynamic from "next/dynamic";
import { type ComponentType } from "react";

// FieldLog saves through window.storage (a Claude-artifact API). Back it with
// localStorage, using the SAME namespace as the invoicing app so the two share
// data (FieldLog logs visits/invoices, invoicing reads them).
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

// Match the estimating app: company name blue on white, role badge always gold
// with white text, let the top stat cards wrap on phones, and center the inner
// pages instead of pinning them to the left.
const STYLE_FIX = `
.fl-actas { background: #FFFFFF !important; }
.fl-actas select { color: #34507A !important; font-weight: 700 !important; }
.fl-rolebadge { background: #e0a82e !important; color: #FFFFFF !important; }
.fl-noprint { display: flex !important; flex-direction: column !important; }
.fl-header, .fl-nav { width: 100% !important; }
.fl-weekly, .fl-home, .fl-grid { margin-left: auto !important; margin-right: auto !important; }
@media (max-width: 620px) {
  .fl-stats { flex-wrap: wrap !important; row-gap: 8px !important; }
  .fl-stats > .fl-actas { flex: 1 1 100% !important; }
  .fl-stats > .fl-chip { flex: 1 1 28% !important; min-width: 0 !important; }
}
`;

const FieldLogApp = dynamic(() => import("./FieldLogCRM"), {
  ssr: false,
  loading: () => (
    <div className="p-10 text-center text-slate-400">Loading FieldLog…</div>
  ),
}) as ComponentType<any>;

export default function FieldLog() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLE_FIX }} />
      <FieldLogApp />
    </>
  );
}
