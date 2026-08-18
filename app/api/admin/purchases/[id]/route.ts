import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES } from "@/lib/auth";

const editSchema = z.object({
  totalAmount: z.number().positive().max(9999999.99).optional(),
  vendor: z.string().max(200).optional(),
  invoiceNumber: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  reason: z.string().min(1).max(500),
});

const deleteSchema = z.object({
  reason: z.string().min(1).max(500),
});

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole([ROLES.OWNER, ROLES.ADMIN]);
    const { id } = await context.params;

    const body = await req.json();
    const parsed = editSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid edit. Reason required." }, { status: 400 });
    }

    const purchase = await prisma.materialPurchase.findUnique({
      where: { id },
      include: { job: { select: { orgId: true } } },
    });
    if (!purchase || purchase.job.orgId !== user.orgId) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    const data: any = {};
    const auditEntries: Array<{
      field: string;
      oldVal: string;
      newVal: string;
    }> = [];

    if (parsed.data.totalAmount !== undefined) {
      const oldAmount = Number(purchase.totalAmount);
      if (parsed.data.totalAmount !== oldAmount) {
        data.totalAmount = parsed.data.totalAmount;
        auditEntries.push({
          field: "totalAmount",
          oldVal: oldAmount.toFixed(2),
          newVal: parsed.data.totalAmount.toFixed(2),
        });
      }
    }

    if (parsed.data.vendor !== undefined) {
      const newVendor = parsed.data.vendor || null;
      if (newVendor !== purchase.vendor) {
        data.vendor = newVendor;
        auditEntries.push({
          field: "vendor",
          oldVal: purchase.vendor || "",
          newVal: newVendor || "",
        });
      }
    }

    if (parsed.data.invoiceNumber !== undefined) {
      const newInv = parsed.data.invoiceNumber || null;
      if (newInv !== purchase.invoiceNumber) {
        data.invoiceNumber = newInv;
        auditEntries.push({
          field: "invoiceNumber",
          oldVal: purchase.invoiceNumber || "",
          newVal: newInv || "",
        });
      }
    }

    if (parsed.data.notes !== undefined) {
      const newNotes = parsed.data.notes || null;
      if (newNotes !== purchase.notes) {
        data.notes = newNotes;
        auditEntries.push({
          field: "notes",
          oldVal: purchase.notes || "",
          newVal: newNotes || "",
        });
      }
    }

    if (auditEntries.length === 0) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.materialPurchase.update({ where: { id }, data });

      for (const entry of auditEntries) {
        await tx.auditLog.create({
          data: {
            id: "audit_" + crypto.randomUUID(),
            orgId: user.orgId,
            actorUserId: user.id,
            actorRole: user.role,
            actionType: "edit_purchase",
            targetTable: "MaterialPurchase",
            targetId: id,
            fieldChanged: entry.field,
            oldValue: entry.oldVal,
            newValue: entry.newVal,
            reason: parsed.data.reason,
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    console.error("Edit purchase error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole([ROLES.OWNER, ROLES.ADMIN]);
    const { id } = await context.params;

    const body = await req.json().catch(() => ({}));
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Reason required" }, { status: 400 });
    }

    const purchase = await prisma.materialPurchase.findUnique({
      where: { id },
      include: { job: { select: { orgId: true } } },
    });
    if (!purchase || purchase.job.orgId !== user.orgId) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId: user.orgId,
          actorUserId: user.id,
          actorRole: user.role,
          actionType: "delete_purchase",
          targetTable: "MaterialPurchase",
          targetId: id,
          oldValue: Number(purchase.totalAmount).toFixed(2),
          reason: parsed.data.reason,
        },
      });
      await tx.materialPurchase.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    console.error("Delete purchase error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
