import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUnlocked, hashPassword, ROLES, ADMIN_ROLES } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum([ROLES.OWNER, ROLES.ADMIN, ROLES.ESTIMATOR, ROLES.TECHNICIAN]),
  password: z.string().min(8).max(100),
  hourlyCost: z.number().nullable().optional(),
  canLogMaterialPurchases: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const actor = await requireUnlocked(ADMIN_ROLES);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input. Check all required fields." }, { status: 400 });
    }

    const { name, email, phone, role, password, hourlyCost, canLogMaterialPurchases } = parsed.data;

    if (role === ROLES.OWNER && actor.role !== ROLES.OWNER) {
      return NextResponse.json({ error: "Only Owners can create Owner accounts." }, { status: 403 });
    }
    if (role === ROLES.ADMIN && actor.role !== ROLES.OWNER) {
      return NextResponse.json({ error: "Only Owners can create Admin accounts." }, { status: 403 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Uniqueness is per-org: the same email may exist in other orgs, but not
    // twice within this one.
    const existing = await prisma.user.findFirst({
      where: { orgId: actor.orgId, email: normalizedEmail },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "Someone in your organization already uses this email." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);const user = await prisma.user.create({
      data: {
        id: "user_" + crypto.randomUUID(),
        orgId: actor.orgId,
        email: normalizedEmail,
        name,
        phone: phone || null,
        role,
        passwordHash,
        isActive: true,
        hourlyCost: hourlyCost ?? null,
        canLogMaterialPurchases: canLogMaterialPurchases ?? false,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    await prisma.auditLog.create({
      data: {
        id: "audit_" + crypto.randomUUID(),
        orgId: actor.orgId,
        actorUserId: actor.id,
        actorRole: actor.role,
        actionType: "user_created",
        targetTable: "User",
        targetId: user.id,
        newValue: JSON.stringify({ name: user.name, email: user.email, role: user.role }),
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "You don't have permission to do that" }, { status: 403 });
    }
    if (err?.message === "ORG_LOCKED") {
      return NextResponse.json({ error: "Your trial has ended. Renew to add users." }, { status: 403 });
    }
    console.error("Create user error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
