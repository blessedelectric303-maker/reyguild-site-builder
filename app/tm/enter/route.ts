import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie, getCurrentUser } from "@/lib/auth";
import { tmRoleFor, normalizeRole } from "@/utils/roles";

// The bridge. You sign in once on ReyGuild; this hands the Time and Material
// app the session it already knows how to read, so there is no second login.
// This MUST be a route handler, not a page: Next.js only allows cookies to be
// written from a route handler or a server action.

export const dynamic = "force-dynamic";

// Only the office tier gets the T and M admin screens. Supervisor, tech and
// apprentice all work from the phone view.
function homeForRole(role: string): string {
  return role === "owner" || role === "admin" ? "/tm/admin" : "/tm/tech";
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

  // No T and M record yet? Build one from the ReyGuild invite instead of
  // sending somebody to a dead end. This is what makes ONE invite enough -
  // before this, an invited employee got a login that went nowhere because
  // their T and M side had to be typed in separately by hand.
  if (!tmUser) {
    try {
      const { data: mem } = await supabase
        .schema("suite")
        .from("memberships")
        .select("role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      const suiteRole = normalizeRole((mem as any)?.role);

      // Which company in T and M. While there is exactly one it is
      // unambiguous. A second company needs a real link between the two
      // sides, so refuse rather than guess and put somebody in the wrong one.
      const orgs = await prisma.organization.findMany({ take: 2, select: { id: true } });
      if (orgs.length !== 1) return problem("nouser", email);

      const meta: any = (user as any).user_metadata || {};
      const name =
        (meta.full_name || meta.name || "").trim() ||
        email.split("@")[0];

      tmUser = await prisma.user.create({
        data: {
          id: "usr_" + crypto.randomUUID(),
          orgId: orgs[0].id,
          email,
          name,
          role: tmRoleFor(suiteRole),
          isActive: true,
          passwordHash: "",
        },
      });
    } catch (e) {
      return problem("nouser", email);
    }
  }

  try {
    const token = await createSessionToken(tmUser.id);
    await setSessionCookie(token);
  } catch (e) {
    return problem("session");
  }

  return go(homeForRole(tmUser.role));
}
