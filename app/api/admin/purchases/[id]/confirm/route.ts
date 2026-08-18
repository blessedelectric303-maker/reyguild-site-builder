import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES } from "@/lib/auth";

function extractDraftAmount(notes: string | null): number | null {
  if (!notes) return null;
  const m = notes.match(/\[draft\|pending\|amount=([\d.]+)\]/);
  if (!m) return null;
  const n = Number(m[1]);
  return isNaN(n) ? null : n;
}

function stripDraftTag(notes: string | null): string | null {
  if (!notes) return null;
  const cleaned = notes.replace(/\s*\[draft\|pending\|amount=[\d.]+\]\s*/, "").trim();
  return cleaned || null;
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole([ROLES.OWNER, ROLES.ADMIN]);
    const { id } = await context.params;

    const purchase = await prisma.materialPurchase.findUnique({
      where: { id },
      include: { job: { select: { orgId: true } } },
    });

    if (!purchase || purchase.job.orgId !== user.orgId) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    const draftAmount = extractDraftAmount(purchase.notes);
    if (draftAmount === null) {
      return NextResponse.json(
        { error: "Already confirmed or amount missing" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.materialPurchase.update({
        where: { id },
        data: {
          totalAmount: draftAmount,
          notes: stripDraftTag(purchase.notes),
        },
      });

      await tx.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId: user.orgId,
          actorUserId: user.id,
          actorRole: user.role,
          actionType: "confirm_purchase",
          targetTable: "MaterialPurchase",
          targetId: id,
          newValue: draftAmount.toFixed(2),
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
    console.error("Confirm purchase error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}