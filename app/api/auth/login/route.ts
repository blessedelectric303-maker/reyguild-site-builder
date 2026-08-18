import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  orgId: z.string().optional(), // present on the 2nd step when disambiguating
});

export async function POST(req: Request) {
  try {
    // Rate limit: 5 attempts per 15 min per IP, before any DB work.
    const ip = getClientIp(req);
    const limit = rateLimit("login:" + ip, 5, 15 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait a few minutes and try again." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
    }

    const { email, password, orgId } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Find ALL active users with this email (may span multiple orgs).
    const candidates = await prisma.user.findMany({
      where: { email: normalizedEmail, isActive: true },
      include: { org: { select: { id: true, name: true } } },
    });

    if (candidates.length === 0) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Verify password against each candidate; keep only the matches.
    const matched = [];
    for (const u of candidates) {
      if (await verifyPassword(password, u.passwordHash)) {
        matched.push(u);
      }
    }

    if (matched.length === 0) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }// Resolve which account to log into.
    let user;
    if (matched.length === 1) {
      user = matched[0];
    } else {
      // Collision: same email + password valid at multiple orgs.
      if (orgId) {
        // Second step — user already picked their company.
        user = matched.find((u) => u.orgId === orgId);
        if (!user) {
          return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }
      } else {
        // First step — ask which company. Only reachable after a valid password,
        // so this never leaks org membership to someone without the password.
        return NextResponse.json({
          needsOrgChoice: true,
          orgs: matched.map((u) => ({ orgId: u.orgId, orgName: u.org.name })),
        });
      }
    }

    const token = await createSessionToken(user.id);
    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
