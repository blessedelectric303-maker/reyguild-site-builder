import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ROLES, isOrgLocked } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const isOwner = user.role === ROLES.OWNER;
    const isAdmin = user.role === ROLES.ADMIN;
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    // Admins with marginViewLocked cannot edit pay rates
    if (isAdmin && (user as any).marginViewLocked === true) {
      return NextResponse.json(
        { error: "Not allowed to edit pay rates" },
        { status: 403 }
      );
    }

    if (isOrgLocked(user.org)) {
      return NextResponse.json(
        { error: "Your trial has ended. Renew to edit pay rates." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const rateRaw = body.hourlyRateOverride;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!reason || reason.length < 3) {
      return NextResponse.json(
        { error: "A reason is required (audit-logged)" },
        { status: 400 }
      );
    }

    // Allow setting to null (clear override) or to a positive decimal
    let newRate: number | null = null;
    if (rateRaw !== null && rateRaw !== undefined && rateRaw !== "") {
      newRate = Number(rateRaw);
      if (isNaN(newRate) || newRate <= 0) {
        return NextResponse.json(
          { error: "Rate must be a positive number, or blank to clear" },
          { status: 400 }
        );
      }
      // Cap at $999.99/hr to match Decimal(10,2) constraints and catch typos
      if (newRate > 999.99) {
        return NextResponse.json(
          { error: "Rate seems too high. Maximum is $999.99/hr." },
          { status: 400 }
        );
      }
    }const existing = await prisma.jobAssignment.findUnique({
      where: { id },
      include: {
        job: { select: { orgId: true } },
        user: { select: { name: true, hourlyCost: true } },
      },
    });

    if (!existing || existing.job.orgId !== user.orgId) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const oldRate = existing.hourlyRateOverride
      ? Number(existing.hourlyRateOverride)
      : null;

    if (oldRate === newRate) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.jobAssignment.update({
        where: { id },
        data: { hourlyRateOverride: newRate },
      });

      await tx.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId: user.orgId,
          actorUserId: user.id,
          actorRole: user.role,
          actionType: "edit_assignment_rate",
          targetTable: "JobAssignment",
          targetId: id,
          fieldChanged: "hourlyRateOverride",
          oldValue: oldRate !== null ? oldRate.toFixed(2) : "(default)",
          newValue: newRate !== null ? newRate.toFixed(2) : "(cleared)",
          reason,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Edit assignment rate error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
