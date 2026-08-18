import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUnlocked, ROLES } from "@/lib/auth";
import {
  calcLaborCost,
  calcTotalMinutes,
  stampLaborCostTag,
  getEffectiveHourlyRate,
} from "@/lib/labor-cost";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUnlocked([ROLES.OWNER, ROLES.ADMIN]);
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const reason: string | undefined = body?.reason;
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    const clockInIso: string | undefined = body?.clockInAt;
    const clockOutIso: string | null | undefined = body?.clockOutAt;
    if (!clockInIso) {
      return NextResponse.json({ error: "clockInAt is required" }, { status: 400 });
    }

    const newClockIn = new Date(clockInIso);
    if (isNaN(newClockIn.getTime())) {
      return NextResponse.json({ error: "Invalid clockInAt" }, { status: 400 });
    }

    let newClockOut: Date | null = null;
    if (clockOutIso) {
      newClockOut = new Date(clockOutIso);
      if (isNaN(newClockOut.getTime())) {
        return NextResponse.json({ error: "Invalid clockOutAt" }, { status: 400 });
      }
      if (newClockOut.getTime() <= newClockIn.getTime()) {
        return NextResponse.json({ error: "Clock out must be after clock in" }, { status: 400 });
      }
    }const entry = await prisma.timeEntry.findUnique({
      where: { id },
      include: {
        user: { select: { id: true } },
        job: { select: { id: true, orgId: true } },
      },
    });
    if (!entry || entry.job.orgId !== user.orgId) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }

    // Use the effective rate (per-job override if set, else user default)
    const effectiveRate = await getEffectiveHourlyRate(entry.user.id, entry.job.id);
    const newMinutes = newClockOut ? calcTotalMinutes(newClockIn, newClockOut) : null;
    const newLaborCost = newMinutes ? calcLaborCost(newMinutes, effectiveRate ?? 0) : 0;
    const newNotes = newClockOut ? stampLaborCostTag(entry.notes, newLaborCost) : entry.notes;

    const oldSummary = JSON.stringify({
      clockInAt: entry.clockInAt.toISOString(),
      clockOutAt: entry.clockOutAt ? entry.clockOutAt.toISOString() : null,
      totalMinutes: entry.totalMinutes,
    });
    const newSummary = JSON.stringify({
      clockInAt: newClockIn.toISOString(),
      clockOutAt: newClockOut ? newClockOut.toISOString() : null,
      totalMinutes: newMinutes,
    });

    await prisma.$transaction(async (tx) => {
      await tx.timeEntry.update({
        where: { id },
        data: {
          clockInAt: newClockIn,
          clockOutAt: newClockOut,
          totalMinutes: newMinutes,
          notes: newNotes,
        },
      });
      await tx.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId: user.orgId,
          actorUserId: user.id,
          actorRole: user.role,
          actionType: "edit_time_entry",
          targetTable: "TimeEntry",
          targetId: id,
          oldValue: oldSummary,
          newValue: newSummary,
          reason: reason.trim(),
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    if (err?.message === "FORBIDDEN") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    if (err?.message === "ORG_LOCKED") return NextResponse.json({ error: "Your trial has ended. Renew to edit time entries." }, { status: 403 });
    console.error("Edit time entry error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUnlocked([ROLES.OWNER, ROLES.ADMIN]);
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const reason: string | undefined = body?.reason;
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    const entry = await prisma.timeEntry.findUnique({
      where: { id },
      include: { job: { select: { orgId: true } } },
    });
    if (!entry || entry.job.orgId !== user.orgId) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }

    const snapshot = JSON.stringify({
      clockInAt: entry.clockInAt.toISOString(),
      clockOutAt: entry.clockOutAt ? entry.clockOutAt.toISOString() : null,
      totalMinutes: entry.totalMinutes,
      notes: entry.notes,
      userId: entry.userId,
      jobId: entry.jobId,
    });

    await prisma.$transaction(async (tx) => {
      await tx.timeEntry.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId: user.orgId,
          actorUserId: user.id,
          actorRole: user.role,
          actionType: "delete_time_entry",
          targetTable: "TimeEntry",
          targetId: id,
          oldValue: snapshot,
          newValue: null,
          reason: reason.trim(),
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    if (err?.message === "FORBIDDEN") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    if (err?.message === "ORG_LOCKED") return NextResponse.json({ error: "Your trial has ended. Renew to delete time entries." }, { status: 403 });
    console.error("Delete time entry error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
