import { redirect } from "next/navigation";
import { getCurrentUser, ROLES, isOrgLocked } from "@/lib/auth";
import Link from "next/link";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import TechTextSize from "./TechTextSize";
import { createClient } from "@/utils/supabase/server";
import { roleLabel } from "@/utils/roles";

const NAV = [
  { href: "/tm/tech", label: "Jobs" },
  { href: "/tm/tech/procedures", label: "Procedures" },
  { href: "/tm/tech/my-hours", label: "My Hours" },
  { href: "/tm/tech/time-off", label: "Time Off" },
];

// What the browser tab says. Nobody should see a vercel address at the top of
// their phone - they should see whose app it is and which door they came in.
export const metadata = {
  title: "ReyGuild - Employee Portal",
  description: "Your jobs, procedures, hours and documents.",
};

export default async function TechLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // The phone view is for everybody who is not office tier: technicians,
  // apprentices, and supervisors (who are mapped to technician on this side).
  if (user.role !== ROLES.TECHNICIAN && user.role !== ROLES.APPRENTICE) {
    redirect("/tm/admin");
  }
  const locked = isOrgLocked(user.org);

  // PAPERWORK GATE. Nobody on the phone gets into the app with unsigned
  // agreements or missing forms. Owners and administrators are deliberately
  // NOT walled off - they are the ones who load the documents in the first
  // place, and locking the boss out of his own command center to sign his own
  // booklet is how a launch day goes wrong. They get told, not blocked.
  //
  // Fails OPEN on any error. A deployment where SQL 27 has not been run yet
  // returns nothing, which counts as nothing outstanding, and the app carries
  // on exactly as it does today.
  // NOTE: redirect() works by throwing, so it must NOT be called inside the
  // try - the catch would swallow it and the gate would silently do nothing.
  let needsPaperwork = false;
  try {
    const supabase = await createClient();
    const {
      data: { user: su },
    } = await supabase.auth.getUser();
    if (su) {
      const { data: st } = await supabase.schema("suite").rpc("my_onboarding");
      const row: any = st && st.length ? st[0] : null;
      needsPaperwork = !!row && row.complete === false;
    }
  } catch (e) {
    needsPaperwork = false;
  }
  if (needsPaperwork) redirect("/onboarding");

  // The title under the name, and the watermark, both come from the ReyGuild
  // side. The T and M role cannot tell a supervisor from a tech - both are
  // "technician" over here - so the real title has to come from the
  // membership. Scoped to this user; an unscoped read returns any member.
  let title = "";
  let logoUrl = "";
  try {
    const supabase = await createClient();
    const {
      data: { user: su },
    } = await supabase.auth.getUser();
    if (su) {
      const { data: mem } = await supabase
        .schema("suite")
        .from("memberships")
        .select("role,company_id")
        .eq("user_id", su.id)
        .limit(1)
        .maybeSingle();
      const m: any = mem || {};
      if (m.role) title = roleLabel(m.role);
      if (m.company_id) {
        const { data: co } = await supabase
          .schema("suite")
          .from("companies")
          .select("logo")
          .eq("id", m.company_id)
          .maybeSingle();
        logoUrl = ((co as any) || {}).logo || "";
      }
    }
  } catch (e) {
    // Header still works without either.
  }

  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col">
      <TechTextSize />

      {/* The company crest, sitting behind everything, the way it sits behind
          the calendar on the command center. Fixed rather than absolute so it
          stays put while the job list scrolls. */}
      {logoUrl ? (
        <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center p-10">
          <img src={logoUrl} alt="" className="max-h-[60vh] w-auto max-w-[80vw] object-contain opacity-[0.06]" />
        </div>
      ) : null}

      <header className="relative z-10 bg-slate-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Logo dark size={24} />
          </div>
          <div className="flex-1 min-w-0 text-center">
            <div className="text-sm font-medium text-slate-200 truncate">{user.name}</div>
            {title ? (
              <div className="text-[11px] uppercase tracking-wide text-slate-400 truncate">{title}</div>
            ) : null}
          </div>
          {/* Sign out lives under Settings now - it is not something anybody
              should be one stray thumb away from on a job. */}
          {/* Messages and Settings sit together, top right. Messages is a
              conversation, not a place you work from - it does not belong in
              the row with Jobs and My Hours. */}
          <div className="flex-1 flex items-center justify-end gap-3">
            <Link href="/tm/tech/messages" className="text-xs font-semibold text-sky-300 hover:text-white">Messages</Link>
            <Link href="/tm/tech/settings" className="text-xs font-semibold text-sky-300 hover:text-white">Settings</Link>
          </div>
        </div>
        <nav className="max-w-2xl mx-auto px-1 flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex-1 min-w-0 text-center py-2.5 text-[11px] sm:text-sm font-medium leading-tight text-slate-300 hover:text-white border-b-2 border-transparent hover:border-slate-500"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      {locked && (
        <div className="relative z-10 bg-red-600 text-white text-sm text-center px-4 py-2">
          Your company&apos;s subscription has lapsed. The app is read-only until
          it&apos;s reactivated - please contact your manager.
        </div>
      )}
      <main className="relative z-10 max-w-2xl mx-auto w-full px-4 py-4 flex-1">{children}</main>
      <div className="relative z-10"><Footer /></div>
    </div>
  );
}
