import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES } from "@/lib/auth";

const bodySchema = z.object({
  reason: z.string().min(1).max(500),
  confirmText: z.string(),
});

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole([ROLES.OWNER]);
    const { id } = await context.params;

    const body = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Reason and confirmation required" }, { status: 400 });
    }

    const job = await prisma.job.findUnique({
      where: { id },
      select: { id: true, orgId: true, status: true, customerName: true },
    });
    if (!job || job.orgId !== user.orgId) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.status !== "archived") {
      return NextResponse.json(
        { error: "Job must be archived before permanent delete" },
        { status: 400 }
      );
    }
    if (parsed.data.confirmText !== "DELETE") {
      return NextResponse.json(
        { error: "Type DELETE to confirm permanent delete" },
        { status: 400 }
      );
    }

   // Both audit log and delete in one transaction so they succeed together or roll back together.
    // Audit must be written first so the FK to job.id is still valid.
    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId: user.orgId,
          actorUserId: user.id,
          actorRole: user.role,
          actionType: "delete_job_permanent",
          targetTable: "Job",
          targetId: id,
          oldValue: job.customerName,
          reason: parsed.data.reason,
        },
      });

      // Cascade delete (Prisma onDelete: Cascade handles children)
      await tx.job.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Only the Owner can permanently delete" }, { status: 403 });
    }
    console.error("Delete job error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
