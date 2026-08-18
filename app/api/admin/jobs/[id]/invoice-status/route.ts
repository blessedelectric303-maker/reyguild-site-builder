import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUnlocked, ADMIN_ROLES } from "@/lib/auth";

const schema = z.object({
  action: z.enum(["complete", "send_back"]),
  reason: z.string().max(500).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireUnlocked(ADMIN_ROLES);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const action = parsed.data.action;
    const reasonRaw = (parsed.data.reason || "").trim();

    // For send_back, require a reason so tech knows what to fix
    if (action === "send_back" && reasonRaw.length < 3) {
      return NextResponse.json(
        { error: "Please provide a reason (at least 3 characters) so the tech knows what to fix." },
        { status: 400 }
      );
    }

    const job = await prisma.job.findUnique({
      where: { id },
      select: { id: true, orgId: true, status: true },
    });

    if (!job || job.orgId !== actor.orgId) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "awaiting_invoice") {
      return NextResponse.json(
        { error: "Job is not awaiting invoice. Current status: " + job.status },
        { status: 400 }
      );
    }

    const newStatus = action === "complete" ? "completed" : "in_progress";await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: job.id },
        data: { status: newStatus, updatedAt: new Date() },
      });

      await tx.jobStatusUpdate.create({
        data: {
          id: "jsu_" + crypto.randomUUID(),
          jobId: job.id,
          userId: actor.id,
          updateType: action === "complete" ? "invoice_sent" : "sent_back_to_work",
          notes: action === "send_back" ? reasonRaw : null,
        },
      });

      await tx.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId: actor.orgId,
          actorUserId: actor.id,
          actorRole: actor.role,
          actionType: action === "complete" ? "job_invoice_sent" : "job_sent_back",
          targetTable: "Job",
          targetId: job.id,
          fieldChanged: "status",
          oldValue: "awaiting_invoice",
          newValue: newStatus,
          reason: reasonRaw || null,
        },
      });
    });

    return NextResponse.json({ ok: true, newStatus });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    if (err?.message === "ORG_LOCKED") {
      return NextResponse.json({ error: "Your trial has ended. Renew to update jobs." }, { status: 403 });
    }
    console.error("Invoice status error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
