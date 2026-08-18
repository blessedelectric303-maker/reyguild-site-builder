import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUnlocked, ROLES } from "@/lib/auth";

const bodySchema = z.object({
  reason: z.string().min(1).max(500),
});

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUnlocked([ROLES.OWNER, ROLES.ADMIN]);
    const { id } = await context.params;

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Reason required" }, { status: 400 });
    }

    const request = await prisma.materialRequest.findUnique({
      where: { id },
      include: { job: { select: { orgId: true } } },
    });

    if (!request || request.job.orgId !== user.orgId) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (request.status !== "pending") {
      return NextResponse.json({ error: "Already " + request.status }, { status: 400 });
    }await prisma.$transaction(async (tx) => {
      await tx.materialRequest.update({
        where: { id },
        data: {
          status: "denied",
          deniedReason: parsed.data.reason,
          approvedByUserId: user.id,
          approvedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId: user.orgId,
          actorUserId: user.id,
          actorRole: user.role,
          actionType: "deny",
          targetTable: "MaterialRequest",
          targetId: id,
          reason: parsed.data.reason,
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
    if (err?.message === "ORG_LOCKED") {
      return NextResponse.json({ error: "Your trial has ended. Renew to deny requests." }, { status: 403 });
    }
    console.error("Deny error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
