"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export type SupplyHouse = { name: string; url: string };

// Every company buys from somewhere different. The two big boxes are here as
// a starting point, not as a rule - a company that never sets foot in either
// can remove them both and put its own wholesalers in their place.
export const DEFAULT_SUPPLY_HOUSES: SupplyHouse[] = [
  { name: "Home Depot", url: "https://www.homedepot.com" },
  { name: "Lowe's", url: "https://www.lowes.com" },
];

// "abcsupply.com" is what somebody actually types. Without this it becomes a
// broken relative link and nobody can tell why.
function tidyUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return "https://" + t.replace(/^\/+/, "");
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (e) {
    return url.replace(/^https?:\/\//i, "").replace(/^www\./, "").split("/")[0];
  }
}

export default function SupplyHouses({
  companyId, settings, canEdit,
}: {
  companyId: string;
  settings: Record<string, any> | null;
  canEdit: boolean;
}) {
  const supabase = createClient();
  const saved = Array.isArray(settings?.supply_houses)
    ? (settings!.supply_houses as SupplyHouse[])
    : null;

  const [list, setList] = useState<SupplyHouse[]>(saved || DEFAULT_SUPPLY_HOUSES);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(next: SupplyHouse[]) {
    setBusy(true);
    setErr(null);
    // Merge, never replace. settings holds the token values too and blowing
    // those away would empty every [BRACKET] in every procedure at once.
    const merged = { ...(settings || {}), supply_houses: next };
    const { error } = await supabase
      .schema("suite")
      .from("companies")
      .update({ settings: merged })
      .eq("id", companyId);
    setBusy(false);
    if (error) {
      setErr("That did not save: " + error.message);
      return false;
    }
    setList(next);
    return true;
  }

  async function add() {
    const n = name.trim();
    const u = tidyUrl(url);
    if (!n || !u) {
      setErr("Both a name and a web address are needed.");
      return;
    }
    const ok = await save([...list, { name: n, url: u }]);
    if (ok) {
      setName("");
      setUrl("");
      setAdding(false);
    }
  }

  async function remove(i: number) {
    await save(list.filter((_, n) => n !== i));
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">Supply houses</h2>
        {busy ? <span className="text-xs text-slate-500">Saving...</span> : null}
      </div>
      <p className="mb-3 text-xs text-slate-500">Check stock and prices before you approve the request. Opens in a new tab.</p>

      {err ? <p className="mb-3 rounded-md bg-red-950 px-3 py-2 text-xs text-red-300">{err}</p> : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {list.map((s, i) => (
          <div key={s.url + i} className="relative">
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex h-full min-h-[64px] flex-col justify-center rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-3 hover:border-slate-500 hover:bg-slate-800">
              <span className="truncate text-sm font-semibold text-slate-100">{s.name}</span>
              <span className="truncate text-[11px] text-slate-500">{hostOf(s.url)} &#8599;</span>
            </a>
            {canEdit ? (
              <button type="button" onClick={() => remove(i)} disabled={busy} aria-label={"Remove " + s.name} className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full border border-slate-600 bg-slate-900 text-xs text-slate-400 hover:text-white">&times;</button>
            ) : null}
          </div>
        ))}

        {canEdit && !adding ? (
          <button type="button" onClick={() => setAdding(true)} className="flex min-h-[64px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-600 px-3 py-3 text-slate-400 hover:border-slate-400 hover:text-slate-200">
            <span className="text-lg leading-none">+</span>
            <span className="mt-1 text-[11px] uppercase tracking-wide">Add your own</span>
          </button>
        ) : null}
      </div>

      {canEdit && adding ? (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800/40 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. City Electric Supply" className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Web address, e.g. cityelectricsupply.com" className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={add} disabled={busy} className="rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-900 disabled:opacity-60" style={{ background: "#CC9000" }}>Save</button>
            <button type="button" onClick={() => { setAdding(false); setErr(null); }} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300">Cancel</button>
          </div>
        </div>
      ) : null}

      {!canEdit ? (
        <p className="mt-3 text-[11px] text-slate-600">An owner or admin can add your own supply houses here.</p>
      ) : null}
    </div>
  );
}
