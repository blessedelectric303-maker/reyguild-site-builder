import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, ADMIN_ROLES } from "@/lib/auth";

const patchSchema = z.object({
  salePrice: z.number().min(0).max(99999999),
  reason: z.string().min(3).max(500),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireRole(ADMIN_ROLES);
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Invalid input. Sale price must be a positive number and reason must be at least 3 characters.",
        },
        { status: 400 }
      );
    }

    const job = await prisma.job.findUnique({
      where: { id },
      select: { id: true, orgId: true, salePrice: true },
    });

    if (!job || job.orgId !== actor.orgId) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const currentPrice = job.salePrice ? Number(job.salePrice) : 0;
    const newPrice = parsed.data.salePrice;

    if (currentPrice === newPrice) {
      return NextResponse.json({ ok: true, message: "No change" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id },
        data: { salePrice: newPrice, updatedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId: actor.orgId,
          actorUserId: actor.id,
          actorRole: actor.role,
          actionType: "edit_job_sale_price",
          targetTable: "Job",
          targetId: job.id,
          fieldChanged: "salePrice",
          oldValue: String(currentPrice),
          newValue: String(newPrice),
          reason: parsed.data.reason.trim(),
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
    console.error("Sale price update error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
