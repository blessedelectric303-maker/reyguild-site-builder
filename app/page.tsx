import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isStaff, homeFor } from "@/utils/roles";
import SettingsMenu from "@/app/components/SettingsMenu";
import Messages from "@/app/components/Messages";
import Calendar from "@/app/components/Calendar";
import CallLinks from "@/app/components/CallLinks";
import { webmailFor } from "@/utils/webmail";

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

// Only these two apps show now (one on each side of the calendar).
const LIVE_APPS: Record<string, { href: string; external?: boolean }> = {
  estimating: { href: "/apps/estimating" },
  time_material: { href: "/tm/enter" },
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
        <h1 className="mil text-5xl tracking-wide"><span style={{ color: "#CC9000" }}>REY</span><span className="text-white">GUILD</span></h1>
        <p className="mt-4 text-slate-300 max-w-md">One login. Every ReyGuild app in one place.</p>
        <Link href="/login" className="mt-6 rounded-md px-5 py-2 text-sm font-semibold text-slate-900" style={{ background: "#CC9000" }}>Sign in</Link>
        <div className="mt-10 h-[3px] w-16 rounded bg-[#CC9000]" />
      </main>
    );
  }

  let companyName = "";
  let companyLogo = "";
  let companyEmail = "";
  let webmailOverride = "";
  let companyId = "";
  let myRole = "owner";
  let armyMode = false;
  let ownerIsAdmin = true;
  try {
    await supabase.schema("suite").rpc("ensure_company");
    const { data: mem } = await supabase
      .schema("suite")
      .from("memberships")
      .select("role,company_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (mem) {
      myRole = (mem as any).role || "owner";
      companyId = (mem as any).company_id || "";
      const { data: co } = await supabase
        .schema("suite")
        .from("companies")
        .select("name,army_mode,owner_is_admin,logo,email,settings")
        .eq("id", companyId)
        .maybeSingle();
      companyName = (co as any)?.name || "";
      companyLogo = (co as any)?.logo || "";
      companyEmail = (co as any)?.email || "";
      webmailOverride = (((co as any)?.settings || {}) as any).webmail_url || "";
      armyMode = (co as any)?.army_mode === true;
      ownerIsAdmin = (co as any)?.owner_is_admin !== false;
    }
  } catch (e) {
    // foundation not present yet - the command center still works.
  }
  const soloMode = !armyMode;

  // Paperwork, export and billing are owner and admin work. The functions
  // behind them refuse anybody else anyway, so this only decides whether a
  // supervisor sees three tiles that would turn him away.
  const isOffice = myRole === "owner" || myRole === "admin";

  // PAPERWORK GATE FOR THE OFFICE.
  //
  // The gate lives in the tech layout, and owners are redirected away from
  // that - so an owner signed up, was made owner, and was never asked to sign
  // anything at all. Correct for the employee booklet, which is not his to
  // sign. Wrong for the four ReyGuild documents that everybody agrees to:
  // the terms, the privacy policy, the cookie policy and the NDA.
  //
  // Fails OPEN. If the documents are not loaded, or the call errors, the
  // command centre opens exactly as it did before.
  //
  // NOTE ON THE FIRST VERSION OF THIS: supabase-js does NOT throw on an
  // error - it returns { data, error }. The first attempt read only `data`
  // and wrapped it in a try/catch, so a permission problem or a stale schema
  // cache came back as an error object, `data` was null, and the gate
  // silently decided there was no paperwork. It failed open on a fault it
  // never noticed. Read the error.
  let needsPaperwork = false;
  try {
    const { data: st, error: stErr } = await supabase
      .schema("suite")
      .rpc("my_onboarding");
    if (stErr) {
      console.error("[paperwork gate] my_onboarding failed:", stErr.message);
    } else {
      const row: any = Array.isArray(st) ? st[0] : st;
      needsPaperwork = !!row && row.complete === false;
    }
  } catch (e: any) {
    console.error("[paperwork gate] threw:", e?.message || e);
  }
  if (needsPaperwork) redirect("/onboarding");

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

  const allApps = (apps ?? []) as AppRow[];
  const estimatingApp = allApps.find((a) => a.key === "estimating");
  const tmApp = allApps.find((a) => a.key === "time_material");

  function tile(app: AppRow | undefined) {
    if (!app) return null;
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
        ? "Free trial \u00b7 " + (left ?? 0) + "d left"
        : "Locked";
    const badgeColor =
      status === "active"
        ? "text-emerald-400 border-emerald-700"
        : status === "trialing"
        ? "text-amber-300 border-amber-700"
        : "text-slate-400 border-slate-700";

    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 md:p-5 flex flex-col items-center text-center md:h-full md:min-h-[250px]">
        <span className={"rounded-full border px-2 py-0.5 text-[11px] " + badgeColor}>{badge}</span>
        <h2 className="mt-3 whitespace-nowrap text-base font-semibold text-white">{app.name}</h2>
        <p className="mt-1 text-sm text-slate-400 flex-1">{app.description}</p>
        <div className="mt-4">
          {canOpen && live ? (
            live.external ? (
              <a href={live.href} target="_blank" rel="noopener noreferrer" className="inline-block rounded-md px-4 py-1.5 text-xs font-semibold text-slate-900" style={{ background: "#CC9000" }}>Open &#8599;</a>
            ) : (
              <Link href={live.href} className="inline-block rounded-md px-4 py-1.5 text-xs font-semibold text-slate-900" style={{ background: "#CC9000" }}>Open &rarr;</Link>
            )
          ) : (
            <span className="inline-block rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-400">Coming soon &mdash; being built</span>
          )}
        </div>
      </div>
    );
  }

  // Every button in the row under the calendar uses this and nothing else.
  // The company inbox - the address customers actually write to.
  const mailHref = webmailFor(companyEmail, webmailOverride) || "https://mail.google.com";

  const tileCls =
    "flex h-full min-h-[60px] w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900/50 px-2 py-3 text-center text-sm text-slate-200 hover:bg-slate-800";

  return (
    <main className="min-h-screen flex flex-col p-4 md:p-10">
      <header className="flex items-center justify-end mb-6">
        <div className="flex items-center gap-3">
          <SettingsMenu email={user.email || ""} role={myRole} companyName={companyName} isStaff={isStaff(myRole)} companyId={companyId} armyMode={armyMode} ownerIsAdmin={ownerIsAdmin} />
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-center mb-5">
          {companyName ? (
            <div className="mil text-3xl md:text-4xl tracking-wide text-white text-center" style={{ WebkitTextStroke: "1.5px #CC9000" }}>{companyName}</div>
          ) : (
            <>
              <img src="/crest.png" alt="ReyGuild" className="w-16 md:w-20 h-auto drop-shadow" />
              <div className="mil mt-1 text-lg tracking-wide"><span style={{ color: "#CC9000" }}>REY</span><span className="text-white">GUILD</span></div>
            </>
          )}
          <span className="mt-2 rounded-full px-3 py-0.5 text-xs font-semibold text-slate-900" style={{ background: soloMode ? "#CC9000" : "#34d399" }}>{soloMode ? "One Man Army" : "Army Mode"} &middot; {roleLabel}</span>

          {/* STEP ONE. Every call starts here and leaves pointed at a colour.
              White on purpose - it is not one of the eight call colours. */}
          <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Step One</div>
          <Link href="/procedures/answering" className="mt-1.5 w-full max-w-xs rounded-lg bg-white px-3 py-3.5 text-center text-sm font-extrabold uppercase tracking-wide text-slate-900 shadow hover:brightness-95">New Call</Link>
        </div>

        {/* PHONE. The three column grid below collapses to a single column on
            a narrow screen, which put a tile, four colours, the calendar, a
            tile and four more colours in a vertical pile - and the fixed tile
            height made the rows overlap. On a phone the order is the one that
            matches how the job actually goes: calendar, then all eight
            colours together, then the apps. */}
        <div className="md:hidden">
          <Calendar companyId={companyId} canEdit={isStaff(myRole)} userId={user.id} userEmail={user.email || ""} logoUrl={companyLogo} />

          <div className="mt-4">
            <CallLinks keys={["emergency", "estimate", "service_call", "warranty_call", "concern", "question", "material", "absence"]} companyId={companyId} userId={user.id} />
          </div>

          <div className="mt-4 space-y-3">
            {tile(estimatingApp)}
            {tile(tmApp)}
          </div>
        </div>

        {/* DESKTOP. Unchanged - apps and colours flanking the calendar. */}
        <div className="hidden md:grid gap-4 md:grid-cols-[minmax(0,200px)_minmax(0,1fr)_minmax(0,200px)] md:items-start">
          <div>
            {tile(estimatingApp)}
            <div className="mt-3"><CallLinks keys={["emergency", "estimate", "service_call", "warranty_call"]} companyId={companyId} userId={user.id} /></div>
          </div>

          <div>
            <Calendar companyId={companyId} canEdit={isStaff(myRole)} userId={user.id} userEmail={user.email || ""} logoUrl={companyLogo} />
          </div>

          <div>
            {tile(tmApp)}
            <div className="mt-3"><CallLinks keys={["concern", "question", "material", "absence"]} companyId={companyId} userId={user.id} /></div>
          </div>
        </div>

        {/* Six tiles, so they sit evenly two across on a phone and three on a
            tablet - no odd one stranded on its own row. */}
        <div className="mt-6 max-w-3xl mx-auto grid auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <a href={mailHref} target="_blank" rel="noopener noreferrer" className={tileCls}>Email</a>
          <Link href="/contacts" className={tileCls}>Company Contacts</Link>
          <Messages userId={user.id} companyId={companyId} triggerClassName={tileCls} />
          <Link href="/procedures/sops" className={tileCls}>SOPs</Link>
          <Link href="/procedures/replies" className={tileCls}>Scripts</Link>
          {/* Opens the Clients tab in Proposals & Invoicing, where the CSV
              import already lives. One list of customers, not two. */}
          <Link href="/apps/estimating?tab=clients" className={tileCls}>Client Contacts</Link>
        </div>

        {/* The office-only row. Paperwork, export and billing were all built
            and had no link anywhere - a feature nobody can reach is a feature
            that does not exist. */}
        {/* Export Data and Paperwork used to sit here. They moved into
            Settings as "Data" and "Documents" - a command centre should be
            the handful of things somebody does every day, not a list of
            everything that exists. */}

        <div className="text-center mt-8">
          <h1 className="text-2xl font-extrabold tracking-wide text-white" style={{ WebkitTextStroke: "1px #CC9000" }}>YOUR COMMAND CENTER</h1>
          {trialDaysLeft != null && (
            <p className="mt-1 text-sm font-semibold text-amber-300">Free trial &middot; {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} left</p>
          )}
        </div>
      </div>

      <footer className="mt-auto pt-10 text-center">
        <div className="mx-auto mb-3 h-[2px] w-24 rounded bg-[#CC9000]" />
        <p className="text-xs md:text-sm tracking-[0.25em] text-slate-400 uppercase">Software for service companies &mdash; ready for the battles of everyday work</p>
      </footer>
    </main>
  );
}
