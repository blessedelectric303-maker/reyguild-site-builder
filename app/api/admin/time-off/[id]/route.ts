import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, ADMIN_ROLES } from "@/lib/auth";

const decideSchema = z.object({
  decision: z.enum(["approved", "denied"]),
  decisionReason: z.string().max(1000).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireRole(ADMIN_ROLES);

    const body = await req.json();
    const parsed = decideSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const request = await prisma.timeOffRequest.findUnique({
      where: { id },
    });

    if (!request || request.orgId !== actor.orgId) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { error: "This request has already been decided." },
        { status: 400 }
      );
    }

    // If denying, require a reason
    if (parsed.data.decision === "denied") {
      const r = (parsed.data.decisionReason || "").trim();
      if (r.length < 3) {
        return NextResponse.json(
          { error: "Please provide a reason for the denial (at least 3 characters)." },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.timeOffRequest.update({
        where: { id },
        data: {
          status: parsed.data.decision,
          decidedAt: new Date(),
          decidedByUserId: actor.id,
          decisionReason: parsed.data.decisionReason
            ? parsed.data.decisionReason.trim()
            : null,
        },
      });

      await tx.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId: actor.orgId,
          actorUserId: actor.id,
          actorRole: actor.role,
          actionType:
            parsed.data.decision === "approved"
              ? "time_off_approved"
              : "time_off_denied",
          targetTable: "TimeOffRequest",
          targetId: request.id,
          fieldChanged: "status",
          oldValue: "pending",
          newValue: parsed.data.decision,
          reason: parsed.data.decisionReason
            ? parsed.data.decisionReason.trim()
            : null,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "You don't have permission" },
        { status: 403 }
      );
    }
    console.error("Decide time off request error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
