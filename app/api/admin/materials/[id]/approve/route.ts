import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUnlocked, ROLES } from "@/lib/auth";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUnlocked([ROLES.OWNER, ROLES.ADMIN]);
    const { id } = await context.params;

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
          status: "approved",
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
          actionType: "approve",
          targetTable: "MaterialRequest",
          targetId: id,
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
      return NextResponse.json({ error: "Your trial has ended. Renew to approve requests." }, { status: 403 });
    }
    console.error("Approve error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
