import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie, getCurrentUser, ROLES } from "@/lib/auth";

// The bridge. You sign in once on ReyGuild; this hands the Time and Material
// app the session it already knows how to read, so there is no second login.
// Match is by email, which both systems already key on.

export const dynamic = "force-dynamic";

function homeForRole(role: string): string {
  return role === ROLES.TECHNICIAN ? "/tm/tech" : "/tm/admin";
}

function Problem({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-2xl text-white">{title}</h1>
      <p className="mt-3 max-w-md text-sm text-slate-400">{body}</p>
      <Link href="/" className="mt-6 rounded-md px-5 py-2 text-sm font-semibold text-slate-900" style={{ background: "#e0a82e" }}>Back to the command center</Link>
    </main>
  );
}

export default async function EnterTM() {
  // Already carrying a valid T and M session? Go straight in.
  const existing = await getCurrentUser();
  if (existing) redirect(homeForRole(existing.role));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const email = (user.email || "").trim().toLowerCase();
  if (!email) {
    return <Problem title="No email on this account" body="Time and Material matches people by email address, and this account does not have one." />;
  }

  let tmUser = null;
  try {
    tmUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, isActive: true },
    });
  } catch (e) {
    return <Problem title="Could not reach Time and Material" body="The job database did not answer. Try again in a moment." />;
  }

  if (!tmUser) {
    return (
      <Problem
        title="No Time and Material account yet"
        body={"Nobody in Time and Material is using " + email + ". An owner or admin needs to add this person under Users first, using the same email address."}
      />
    );
  }

  const token = await createSessionToken(tmUser.id);
  await setSessionCookie(token);
  redirect(homeForRole(tmUser.role));
}
