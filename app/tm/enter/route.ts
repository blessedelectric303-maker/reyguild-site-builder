import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie, getCurrentUser, ROLES } from "@/lib/auth";

// The bridge. You sign in once on ReyGuild; this hands the Time and Material
// app the session it already knows how to read, so there is no second login.
// This MUST be a route handler, not a page: Next.js only allows cookies to be
// written from a route handler or a server action.

export const dynamic = "force-dynamic";

function homeForRole(role: string): string {
  return role === ROLES.TECHNICIAN ? "/tm/tech" : "/tm/admin";
}

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const go = (path: string) => NextResponse.redirect(new URL(path, origin));
  const problem = (reason: string, detail?: string) => {
    const u = new URL("/tm/no-access", origin);
    u.searchParams.set("reason", reason);
    if (detail) u.searchParams.set("detail", detail);
    return NextResponse.redirect(u);
  };

  // Already carrying a valid T and M session? Go straight in.
  try {
    const existing = await getCurrentUser();
    if (existing) return go(homeForRole(existing.role));
  } catch (e) {
    // No usable session yet. Fall through and build one.
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return go("/login");

  const email = (user.email || "").trim().toLowerCase();
  if (!email) return problem("noemail");

  let tmUser = null;
  try {
    tmUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, isActive: true },
    });
  } catch (e) {
    return problem("db");
  }

  if (!tmUser) return problem("nouser", email);

  try {
    const token = await createSessionToken(tmUser.id);
    await setSessionCookie(token);
  } catch (e) {
    return problem("session");
  }

  return go(homeForRole(tmUser.role));
}
