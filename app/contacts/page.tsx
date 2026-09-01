import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { roleLabel, isStaff, homeFor } from "@/utils/roles";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";

// Everybody in the company, in one list. The email and the role come from the
// ReyGuild side; the name and phone come from T and M. Same person, two
// records, joined on email - which is the same join the login bridge uses.
export default async function ContactsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: mem } = await supabase
    .schema("suite")
    .from("memberships")
    .select("role,company_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const myRole = (mem as any)?.role || "";
  if (!isStaff(myRole)) redirect(homeFor(myRole));

  const { data: roster } = await supabase.schema("suite").rpc("company_members");
  const members = ((roster as any[]) || []);

  // Names and phone numbers live on the T and M user record.
  let extra: Record<string, { name: string; phone: string }> = {};
  try {
    const emails = members.map((m) => (m.email || "").toLowerCase()).filter(Boolean);
    if (emails.length) {
      const tm = await prisma.user.findMany({
        where: { email: { in: emails, mode: "insensitive" } },
        select: { email: true, name: true, phone: true },
      });
      tm.forEach((u) => {
        extra[(u.email || "").toLowerCase()] = {
          name: u.name || "",
          phone: u.phone || "",
        };
      });
    }
  } catch (e) {
    // The list still works with just email and role.
  }

  const rows = members.map((m) => {
    const e = (m.email || "").toLowerCase();
    return {
      id: m.membership_id,
      email: m.email || "",
      role: m.role,
      isMe: m.is_me === true,
      name: (extra[e] || {}).name || "",
      phone: (extra[e] || {}).phone || "",
    };
  });

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <BackLink className="text-sm text-slate-400 underline hover:text-slate-200" />
        <h1 className="mt-4 text-2xl font-bold text-white">Company Contacts</h1>
        <p className="mt-1 text-sm text-slate-400">
          Everybody on the team. Added automatically when somebody is invited -
          there is no separate list to keep up to date.
        </p>

        <div className="mt-6 space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">
                    {r.name || r.email}
                    {r.isMe ? <span className="ml-2 text-xs font-normal text-slate-500">you</span> : null}
                  </div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">{roleLabel(r.role)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.phone ? (
                    <a href={"tel:" + r.phone} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800">Call</a>
                  ) : null}
                  {r.email ? (
                    <a href={"mailto:" + r.email} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800">Email</a>
                  ) : null}
                </div>
              </div>
              <div className="mt-2 space-y-0.5 text-xs text-slate-400">
                {r.email ? <div className="break-all">{r.email}</div> : null}
                {r.phone ? <div>{r.phone}</div> : <div className="text-slate-600">No phone on file</div>}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs text-slate-500">
          Names and phone numbers come from the employee record in T&amp;M&amp;P&amp;L.
          Roles are changed under Settings, then Army / Employees.
        </p>
      </div>
    </main>
  );
}
