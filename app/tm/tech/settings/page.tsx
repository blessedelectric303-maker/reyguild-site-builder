import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "../../admin/LogoutButton";
import { createClient } from "@/utils/supabase/server";
import { canAccess } from "@/utils/roles";

export const dynamic = "force-dynamic";

// The tech's own settings. Deliberately separate from anything the office
// sees - an admin has all of this on the command center already and should
// never be routed in here.
// Procedures and Messages moved up into the top navigation - they are daily
// work, not settings. What is left here is the stuff you touch rarely.
const ENTRIES = [
  {
    href: "/tm/tech/help",
    title: "Help",
    blurb: "How the app works, the questions that come up most, and how to reach ReyGuild.",
  },
  {
    href: "/tm/tech/preferences",
    title: "Preferences",
    blurb: "Text size, and your own account details.",
  },
];

export default async function TechSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Supervisors and tech/estimators work in both apps, so they need a way
  // across. An apprentice does not - T and M and P and L is his whole job -
  // so the link simply is not there for him.
  let canSwitch = false;
  try {
    const supabase = await createClient();
    const {
      data: { user: su },
    } = await supabase.auth.getUser();
    if (su) {
      const { data: mem } = await supabase
        .schema("suite")
        .from("memberships")
        .select("role")
        .eq("user_id", su.id)
        .limit(1)
        .maybeSingle();
      canSwitch = canAccess(((mem as any) || {}).role || "", "estimating");
    }
  } catch (e) {
    canSwitch = false;
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">{user.name}</p>

      <div className="mt-4 space-y-2">
        {ENTRIES.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900">{e.title}</span>
              <span className="block text-xs leading-snug text-slate-500">{e.blurb}</span>
            </span>
            <span className="flex-none text-slate-400">&rarr;</span>
          </Link>
        ))}
      </div>

      {/* Switch on the left, sign out on the right - so the thing you press
          often is nowhere near the thing you press by accident. */}
      <div className="mt-6 flex items-center justify-between gap-3">
        {canSwitch ? (
          <a href="/apps/estimating" className="rounded-md px-4 py-2.5 text-sm font-bold text-slate-900" style={{ background: "#e0a82e" }}>
            Switch to Proposals &amp; Invoicing
          </a>
        ) : <span />}
        <LogoutButton />
      </div>
    </div>
  );
}
