import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ROLES } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const isOwnerOrAdmin =
      user.role === ROLES.OWNER || user.role === ROLES.ADMIN;
    if (!isOwnerOrAdmin) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const description =
      typeof body.description === "string" ? body.description.trim() : undefined;
    const amountRaw = body.amount;
    const notes = typeof body.notes === "string" ? body.notes.trim() : undefined;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!reason || reason.length < 3) {
      return NextResponse.json(
        { error: "A reason is required to edit this cost" },
        { status: 400 }
      );
    }

    if (description !== undefined && description.length === 0) {
      return NextResponse.json(
        { error: "Description cannot be empty" },
        { status: 400 }
      );
    }
    if (description !== undefined && description.length > 200) {
      return NextResponse.json(
        { error: "Description must be 200 characters or less" },
        { status: 400 }
      );
    }

    let newAmount: number | undefined = undefined;
    if (amountRaw !== undefined && amountRaw !== null && amountRaw !== "") {
      newAmount = Number(amountRaw);
      if (isNaN(newAmount) || newAmount <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }
    }

    const existing = await prisma.otherJobCost.findUnique({
      where: { id },
    });
    if (!existing || existing.orgId !== user.orgId) {
      return NextResponse.json({ error: "Cost not found" }, { status: 404 });
    }

    const updates: any = {};
    const auditEntries: Array<{
      field: string;
      oldVal: string;
      newVal: string;
    }> = [];

    if (description !== undefined && description !== existing.description) {
      updates.description = description;
      auditEntries.push({
        field: "description",
        oldVal: existing.description,
        newVal: description,
      });
    }
    if (newAmount !== undefined && newAmount !== Number(existing.amount)) {
      updates.amount = newAmount;
      auditEntries.push({
        field: "amount",
        oldVal: Number(existing.amount).toFixed(2),
        newVal: newAmount.toFixed(2),
      });
    }
    if (notes !== undefined && notes !== (existing.notes || "")) {
      updates.notes = notes || null;
      auditEntries.push({
        field: "notes",
        oldVal: existing.notes || "",
        newVal: notes,
      });
    }

    if (auditEntries.length === 0) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    updates.updatedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.otherJobCost.update({
        where: { id },
        data: updates,
      });

      for (const entry of auditEntries) {
        await tx.auditLog.create({
          data: {
            id: "audit_" + crypto.randomUUID(),
            orgId: user.orgId,
            actorUserId: user.id,
            actorRole: user.role,
            actionType: "edit_other_job_cost",
            targetTable: "OtherJobCost",
            targetId: id,
            fieldChanged: entry.field,
            oldValue: entry.oldVal,
            newValue: entry.newVal,
            reason,
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Edit other job cost error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const isOwnerOrAdmin =
      user.role === ROLES.OWNER || user.role === ROLES.ADMIN;
    if (!isOwnerOrAdmin) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!reason || reason.length < 3) {
      return NextResponse.json(
        { error: "A reason is required to delete this cost" },
        { status: 400 }
      );
    }

    const existing = await prisma.otherJobCost.findUnique({
      where: { id },
    });
    if (!existing || existing.orgId !== user.orgId) {
      return NextResponse.json({ error: "Cost not found" }, { status: 404 });
    }

    const snapshot = {
      description: existing.description,
      amount: Number(existing.amount).toFixed(2),
      notes: existing.notes,
      receiptImageUrl: existing.receiptImageUrl,
    };

    await prisma.$transaction(async (tx) => {
      await tx.otherJobCost.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId: user.orgId,
          actorUserId: user.id,
          actorRole: user.role,
          actionType: "delete_other_job_cost",
          targetTable: "OtherJobCost",
          targetId: id,
          oldValue: JSON.stringify(snapshot),
          reason,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Delete other job cost error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
