import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

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

// App keys that have a real, openable room built.
const LIVE_APPS: Record<string, string> = {
  site_builder: "/apps/site-builder",
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-center p-8">
        <div className="text-xs tracking-[0.3em] text-slate-400 mb-6">
          SERVICE COMPANY SOFTWARE
        </div>
        <h1 className="text-5xl font-extrabold tracking-wide">
          <span style={{ color: "#e0a82e" }}>REY</span>
          <span className="text-white">GUILD</span>
        </h1>
        <p className="mt-4 text-slate-300 max-w-md">
          One login. Every ReyGuild app in one place.
        </p>
        <Link
          href="/login"
          className="mt-6 rounded-md px-5 py-2 text-sm font-semibold text-slate-900"
          style={{ background: "#e0a82e" }}
        >
          Sign in
        </Link>
        <div className="mt-10 h-[3px] w-16 rounded bg-[#e0a82e]" />
      </main>
    );
  }

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

  return (
    <main className="min-h-screen p-6 md:p-10">
      <header className="flex items-center justify-between mb-10">
        <div className="text-xl font-extrabold tracking-wide">
          <span style={{ color: "#e0a82e" }}>REY</span>
          <span className="text-white">GUILD</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400 hidden sm:inline">{user.email}</span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md border border-slate-600 px-3 py-1.5 text-slate-200 hover:bg-slate-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-1">
          Your command center
        </h1>
        <p className="text-slate-400 mb-8 text-sm">
          Every ReyGuild app, one login. Your free trial is running.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(apps ?? []).map((app: AppRow) => {
            const ent = entByApp.get(app.key);
            const status = ent?.status ?? "locked";
            const left = daysLeft(ent?.trial_ends_at ?? null);
            const entitled = status === "active" || status === "trialing";
            const href = LIVE_APPS[app.key];
            const openable = entitled && !!href;

            const badge =
              status === "active"
                ? "Active"
                : status === "trialing"
                ? `Free trial · ${left ?? 0}d left`
                : "Locked";

            const badgeColor =
              status === "active"
                ? "text-emerald-400 border-emerald-700"
                : status === "trialing"
                ? "text-amber-300 border-amber-700"
                : "text-slate-400 border-slate-700";

            return (
              <div
                key={app.key}
                className="rounded-xl border border-slate-700 bg-slate-900/50 p-5 flex flex-col"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-white">
                    {app.name}
                  </h2>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${badgeColor}`}
                  >
                    {badge}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400 flex-1">
                  {app.description}
                </p>
                <div className="mt-4">
                  {openable ? (
                    <Link
                      href={href}
                      className="inline-block rounded-md px-3 py-1.5 text-xs font-semibold text-slate-900"
                      style={{ background: "#e0a82e" }}
                    >
                      Open →
                    </Link>
                  ) : (
                    <span className="inline-block rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-400">
                      Coming soon — being built
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
