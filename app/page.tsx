import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isStaff, homeFor } from "@/utils/roles";
import SettingsMenu from "@/app/components/SettingsMenu";

type AppRow = {
  key: string;
  name: string;
  description: string | null;
  sort_order: number;
};
type EntRow = { app_key: string; status: string; trial_ends_at: string | null };

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

const LIVE_APPS: Record<string, { href: string; external?: boolean }> = {
  site_builder: { href: "/apps/site-builder" },
  estimating: { href: "/apps/estimating" },
  app_four: { href: "/apps/field-log" },
  time_material: { href: "https://tm.serviceopspro.com", external: true },
};

const POS: Record<string, string> = {
  site_builder: "md:col-start-1 md:row-start-1",
  app_four: "md:col-start-3 md:row-start-1",
  time_material: "md:col-start-1 md:row-start-2",
  estimating: "md:col-start-3 md:row-start-2",
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-center p-8">
        <img src="/crest.png" alt="ReyGuild" className="w-28 h-auto mb-6" />
        <h1 className="text-5xl font-extrabold tracking-wide"><span style={{ color: "#e0a82e" }}>REY</span><span className="text-white">GUILD</span></h1>
        <p className="mt-4 text-slate-300 max-w-md">One login. Every ReyGuild app in one place.</p>
        <Link href="/login" className="mt-6 rounded-md px-5 py-2 text-sm font-semibold text-slate-900" style={{ background: "#e0a82e" }}>Sign in</Link>
        <div className="mt-10 h-[3px] w-16 rounded bg-[#e0a82e]" />
      </main>
    );
  }

  let companyName = "";
  let companyLogo = "";
  let myRole = "owner";
  let armyMode = false;
  try {
    await supabase.schema("suite").rpc("ensure_company");
    const { data: mem } = await supabase
      .schema("suite")
      .from("memberships")
      .select("role,company_id")
      .limit(1)
      .maybeSingle();
    if (mem) {
      myRole = (mem as any).role || "owner";
      const cid = (mem as any).company_id;
      const { data: co } = await supabase
        .schema("suite")
        .from("companies")
        .select("name,army_mode,logo")
        .eq("id", cid)
        .maybeSingle();
      companyName = (co as any)?.name || "";
      companyLogo = (co as any)?.logo || "";
      armyMode = (co as any)?.army_mode === true;
    }
  } catch (e) {
    // foundation not present yet — the command center still works.
  }
  const soloMode = !armyMode;

  // Role-based access: employees skip the command center and go straight to their app.
  if (!isStaff(myRole)) redirect(homeFor(myRole));

  const roleLabel =
    myRole === "sales_rep"
      ? "Sales Rep"
      : myRole.charAt(0).toUpperCase() + myRole.slice(1);

  const { data: apps } = await supabase
    .schema("suite")
    .from("apps")
    .select("key,name,description,sort_order")
    .order("sort_order");

  const { data: ents } = await supabase
    .schema("suite")
    .from("entitlements")
    .select("app_key,status,trial_ends_at");

  const entByApp = new Map<string, EntRow>(
    (ents ?? []).map((e: EntRow) => [e.app_key, e])
  );

  const trialing = (ents ?? []).filter((e: EntRow) => e.status === "trialing");
  const trialDaysLeft = trialing.length
    ? Math.max(...trialing.map((e: EntRow) => daysLeft(e.trial_ends_at) ?? 0))
    : null;

  const list = (apps ?? []) as AppRow[];

  return (
    <main className="min-h-screen flex flex-col p-6 md:p-10">
      <header className="flex items-center justify-end mb-6">
        <SettingsMenu email={user.email || ""} role={myRole} companyName={companyName} isStaff={isStaff(myRole)} />
      </header>

      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-wide text-white" style={{ WebkitTextStroke: "1px #e0a82e" }}>YOUR COMMAND CENTER</h1>
          {trialDaysLeft != null && (
            <p className="mt-2 text-sm font-semibold text-amber-300">Free trial · {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} left</p>
          )}
          <p className="mt-1 text-slate-400 text-sm">Every ReyGuild app, one login.</p>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs flex-wrap">
            {companyName && (
              <span className="rounded-full border border-slate-600 px-3 py-1 text-slate-200">{companyName}</span>
            )}
            <span className="rounded-full px-3 py-1 font-semibold text-slate-900" style={{ background: soloMode ? "#e0a82e" : "#34d399" }}>{soloMode ? "One Man Army" : "Army Mode"} · {roleLabel}</span>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-[1fr_auto_1fr] md:grid-rows-2 md:items-stretch">
          <div className="flex flex-col items-center justify-center px-6 py-4 md:col-start-2 md:row-start-1 md:row-span-2">
            {companyLogo ? (
              <>
                <img src={companyLogo} alt={companyName || "Company"} className="w-40 md:w-56 h-auto max-h-56 object-contain drop-shadow-lg" />
                <div className="mt-4 flex items-center gap-1.5 opacity-70">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">Powered by</span>
                  <img src="/crest.png" alt="" className="w-4 h-auto" />
                  <span className="text-[11px] font-extrabold tracking-wide"><span style={{ color: "#e0a82e" }}>REY</span><span className="text-white">GUILD</span></span>
                </div>
              </>
            ) : (
              <>
                <img src="/crest.png" alt="ReyGuild" className="w-32 md:w-44 h-auto drop-shadow-lg" />
                <div className="mt-3 text-2xl md:text-3xl font-extrabold tracking-wide"><span style={{ color: "#e0a82e" }}>REY</span><span className="text-white">GUILD</span></div>
              </>
            )}
          </div>

          {list.map((app: AppRow) => {
            const ent = entByApp.get(app.key);
            const status = ent?.status ?? "locked";
            const left = daysLeft(ent?.trial_ends_at ?? null);
            const entitled = status === "active" || status === "trialing";
            const live = LIVE_APPS[app.key];
            const canOpen = entitled && !!live;

            const badge =
              status === "active"
                ? "Active"
                : status === "trialing"
                ? "Free trial · " + (left ?? 0) + "d left"
                : "Locked";

            const badgeColor =
              status === "active"
                ? "text-emerald-400 border-emerald-700"
                : status === "trialing"
                ? "text-amber-300 border-amber-700"
                : "text-slate-400 border-slate-700";

            const cardCls =
              "rounded-xl border border-slate-700 bg-slate-900/50 p-5 flex flex-col items-center text-center " +
              (POS[app.key] ?? "");

            return (
              <div key={app.key} className={cardCls}>
                <span className={"rounded-full border px-2 py-0.5 text-[11px] " + badgeColor}>{badge}</span>
                <h2 className="mt-3 text-lg font-semibold text-white">{app.name}</h2>
                <p className="mt-1 text-sm text-slate-400 flex-1">{app.description}</p>
                <div className="mt-4">
                  {canOpen && live ? (
                    live.external ? (
                      <a href={live.href} target="_blank" rel="noopener noreferrer" className="inline-block rounded-md px-4 py-1.5 text-xs font-semibold text-slate-900" style={{ background: "#e0a82e" }}>Open ↗</a>
                    ) : (
                      <Link href={live.href} className="inline-block rounded-md px-4 py-1.5 text-xs font-semibold text-slate-900" style={{ background: "#e0a82e" }}>Open →</Link>
                    )
                  ) : (
                    <span className="inline-block rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-400">Coming soon — being built</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="mt-auto pt-10 text-center">
        <div className="mx-auto mb-3 h-[2px] w-24 rounded bg-[#e0a82e]" />
        <p className="text-xs md:text-sm tracking-[0.25em] text-slate-400 uppercase">Software for service companies — for the best of them</p>
      </footer>
    </main>
  );
}
