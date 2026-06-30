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

const FieldLogApp = dynamic(() => import("./FieldLogCRM"), {
  ssr: false,
  loading: () => (
    <div className="p-10 text-center text-slate-400">Loading FieldLog…</div>
  ),
}) as ComponentType<any>;

export default function FieldLog() {
  return <FieldLogApp />;
}
