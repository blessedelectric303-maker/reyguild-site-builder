"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { contextFromPath, sopFor, SUPPORT } from "@/utils/sops";

type Props = {
  email: string;
  role: string;
  companyName?: string;
  isStaff: boolean;
  companyId?: string;
  armyMode?: boolean;
  ownerIsAdmin?: boolean;
};

type Tab = "help" | "sops" | "account";

function roleLabel(role: string): string {
  if (role === "sales_rep") return "Sales Rep";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function SettingsMenu({ email, role, companyName, isStaff, companyId, armyMode, ownerIsAdmin }: Props) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("sops");
  const [army, setArmy] = useState(armyMode === true);
  const [ownerAdmin, setOwnerAdmin] = useState(ownerIsAdmin !== false);
  const [savingMode, setSavingMode] = useState(false);

  const sop = sopFor(contextFromPath(pathname));
  const showMode = isStaff && !!companyId;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function toggleArmy() {
    if (!companyId || savingMode) return;
    const next = !army;
    setArmy(next);
    setSavingMode(true);
    const { error } = await supabase.schema("suite").from("companies").update({ army_mode: next }).eq("id", companyId);
    setSavingMode(false);
    if (error) {
      setArmy(!next);
      alert("Couldn't save that change: " + error.message);
      return;
    }
    router.refresh();
  }

  async function toggleOwnerAdmin() {
    if (!companyId || savingMode) return;
    const next = !ownerAdmin;
    setOwnerAdmin(next);
    setSavingMode(true);
    const { error } = await supabase.schema("suite").from("companies").update({ owner_is_admin: next }).eq("id", companyId);
    setSavingMode(false);
    if (error) {
      setOwnerAdmin(!next);
      alert("Couldn't save that change: " + error.message);
      return;
    }
    router.refresh();
  }

  const tabBtn = (id: Tab, label: string) => {
    const active = tab === id;
    const cls =
      "flex-1 rounded-md px-3 py-2 text-sm font-semibold transition " +
      (active ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200");
    return (
      <button type="button" onClick={() => setTab(id)} className={cls}>{label}</button>
    );
  };

  const gearIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
  );

  const closeIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Settings" className="inline-flex items-center gap-1.5 rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800">
        {gearIcon}
        <span className="hidden sm:inline">Settings</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <div className="mt-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:mt-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <img src="/crest.png" alt="" className="h-5 w-auto" />
                <span className="text-sm font-bold text-white">Settings</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white">{closeIcon}</button>
            </div>

            <div className="flex gap-1 border-b border-slate-800 p-2">
              {tabBtn("sops", "SOPs")}
              {tabBtn("help", "Help")}
              {tabBtn("account", "Account")}
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              {tab === "sops" ? (
                <div>
                  <h3 className="text-base font-semibold text-white">{sop.title}</h3>
                  <ol className="mt-3 space-y-2.5">
                    {sop.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-slate-300">
                        <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] font-bold text-slate-900" style={{ background: "#e0a82e" }}>{i + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {tab === "help" ? (
                <div className="text-sm text-slate-300">
                  <h3 className="text-base font-semibold text-white">Need a hand?</h3>
                  <p className="mt-2">We are here to help you get the most out of ReyGuild.</p>
                  <div className="mt-4 space-y-1">
                    <div className="text-slate-200">Email: {SUPPORT.email}</div>
                    {SUPPORT.phone ? <div className="text-slate-200">Call: {SUPPORT.phone}</div> : null}
                  </div>
                  {SUPPORT.note ? <p className="mt-3 text-xs text-slate-500">{SUPPORT.note}</p> : null}
                  <p className="mt-4 text-xs text-slate-500">Tip: the SOPs tab has a quick guide for whichever screen you are on.</p>
                </div>
              ) : null}

              {tab === "account" ? (
                <div className="text-sm">
                  {companyName ? (
                    <div className="mb-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Company</div>
                      <div className="text-slate-200">{companyName}</div>
                    </div>
                  ) : null}
                  <div className="mb-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Signed in as</div>
                    <div className="break-all text-slate-200">{email}</div>
                  </div>
                  <div className="mb-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Role</div>
                    <div className="text-slate-200">{roleLabel(role)}</div>
                  </div>

                  {showMode ? (
                    <div className="mb-4 rounded-lg border border-slate-700 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-slate-100 text-sm font-medium">Mode</div>
                          <div className="text-slate-500 text-xs">One Man Army = just you. Army Mode = you and your team.</div>
                        </div>
                        <button type="button" onClick={toggleArmy} disabled={savingMode} className={"shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold " + (army ? "text-slate-900" : "text-slate-200 border border-slate-600")} style={army ? { background: "#34d399" } : undefined}>{army ? "Army Mode" : "One Man Army"}</button>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-3">
                        <div>
                          <div className="text-slate-100 text-sm font-medium">Owner and Admin</div>
                          <div className="text-slate-500 text-xs">Combined = the owner also has admin powers. Separate = two distinct roles.</div>
                        </div>
                        <button type="button" onClick={toggleOwnerAdmin} disabled={savingMode} className={"shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold " + (ownerAdmin ? "text-slate-900" : "text-slate-200 border border-slate-600")} style={ownerAdmin ? { background: "#e0a82e" } : undefined}>{ownerAdmin ? "Combined" : "Separate"}</button>
                      </div>
                    </div>
                  ) : null}

                  {isStaff ? (
                    <div className="mb-4 grid grid-cols-2 gap-2">
                      <Link href="/company" onClick={() => setOpen(false)} className="rounded-md border border-slate-600 px-3 py-2 text-center text-slate-200 hover:bg-slate-800">Company</Link>
                      <Link href="/team" onClick={() => setOpen(false)} className="rounded-md border border-slate-600 px-3 py-2 text-center text-slate-200 hover:bg-slate-800">Army</Link>
                    </div>
                  ) : null}

                  <form action="/auth/signout" method="post">
                    <button type="submit" className="w-full rounded-md border border-slate-600 px-3 py-2 text-slate-200 hover:bg-slate-800">Sign out</button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
