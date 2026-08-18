import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES } from "@/lib/auth";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole([ROLES.OWNER, ROLES.ADMIN]);
    const { id } = await context.params;

    const body = await req.json().catch(() => ({}));
    const reason: string | undefined = body?.reason;
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    const job = await prisma.job.findUnique({
      where: { id },
      select: { id: true, orgId: true, status: true },
    });
    if (!job || job.orgId !== user.orgId) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.status === "archived") {
      return NextResponse.json({ error: "Already archived" }, { status: 400 });
    }

    const previousStatus = job.status;

    await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id },
        data: { status: "archived" },
      });
      await tx.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId: user.orgId,
          actorUserId: user.id,
          actorRole: user.role,
          actionType: "archive_job",
          targetTable: "Job",
          targetId: id,
          oldValue: previousStatus,
          newValue: "archived",
          reason: reason.trim(),
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
    console.error("Archive job error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
