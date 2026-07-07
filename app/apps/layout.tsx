import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/utils/supabase/server";
import { isStaff } from "@/utils/roles";
import SettingsMenu from "@/app/components/SettingsMenu";

// The shared shell every app room inherits. Built once here so every app
// (now and future) gets the same branded top bar — including Settings — automatically.
export default async function AppsLayout({ children }: { children: ReactNode }) {
  let email = "";
  let role = "owner";
  let companyName = "";
  let companyId = "";
  let armyMode = false;
  let ownerIsAdmin = true;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email || "";

    const { data: mem } = await supabase
      .schema("suite")
      .from("memberships")
      .select("role,company_id")
      .limit(1)
      .maybeSingle();
    if (mem) {
      role = (mem as any).role || "owner";
      companyId = (mem as any).company_id || "";
      const { data: co } = await supabase
        .schema("suite")
        .from("companies")
        .select("name,army_mode,owner_is_admin")
        .eq("id", companyId)
        .maybeSingle();
      companyName = (co as any)?.name || "";
      armyMode = (co as any)?.army_mode === true;
      ownerIsAdmin = (co as any)?.owner_is_admin !== false;
    }
  } catch (e) {
    // foundation not present yet — the app shell still works.
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-950">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><span aria-hidden>&larr;</span> Back to command center</Link>
        <div className="flex items-center gap-3">
          <SettingsMenu email={email} role={role} companyName={companyName} isStaff={isStaff(role)} companyId={companyId} armyMode={armyMode} ownerIsAdmin={ownerIsAdmin} />
          <div className="flex items-center gap-2">
            <img src="/crest.png" alt="" className="w-6 h-auto" />
            <span className="text-sm font-extrabold tracking-wide"><span style={{ color: "#e0a82e" }}>REY</span><span className="text-white">GUILD</span></span>
          </div>
        </div>
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
