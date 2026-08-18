import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES } from "@/lib/auth";
import { calcLaborCost, calcTotalMinutes, stampLaborCostTag } from "@/lib/labor-cost";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole([ROLES.OWNER, ROLES.ADMIN]);
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const reason: string | undefined = body?.reason;
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    const entry = await prisma.timeEntry.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, hourlyCost: true } },
        job: { select: { orgId: true } },
      },
    });
    if (!entry || entry.job.orgId !== user.orgId) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }
    if (entry.clockOutAt) {
      return NextResponse.json({ error: "Already clocked out" }, { status: 400 });
    }

    const now = new Date();
    const totalMinutes = calcTotalMinutes(entry.clockInAt, now);
    const laborCost = calcLaborCost(totalMinutes, Number(entry.user.hourlyCost ?? 0));
    const newNotes = stampLaborCostTag(entry.notes, laborCost);

    await prisma.$transaction(async (tx) => {
      await tx.timeEntry.update({
        where: { id },
        data: { clockOutAt: now, totalMinutes, notes: newNotes },
      });
      await tx.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId: user.orgId,
          actorUserId: user.id,
          actorRole: user.role,
          actionType: "admin_clock_out",
          targetTable: "TimeEntry",
          targetId: id,
          oldValue: null,
          newValue: JSON.stringify({ clockOutAt: now.toISOString(), totalMinutes, laborCost }),
          reason: reason.trim(),
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    if (err?.message === "FORBIDDEN") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    console.error("Admin clock-out error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
