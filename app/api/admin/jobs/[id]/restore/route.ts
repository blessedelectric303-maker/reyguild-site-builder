import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES } from "@/lib/auth";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole([ROLES.OWNER]);
    const { id } = await context.params;

    const job = await prisma.job.findUnique({
      where: { id },
      select: { id: true, orgId: true, status: true },
    });
    if (!job || job.orgId !== user.orgId) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.status !== "archived") {
      return NextResponse.json({ error: "Not archived" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id },
        data: { status: "scheduled" },
      });
      await tx.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId: user.orgId,
          actorUserId: user.id,
          actorRole: user.role,
          actionType: "restore_job",
          targetTable: "Job",
          targetId: id,
          oldValue: "archived",
          newValue: "scheduled",
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    console.error("Restore job error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}