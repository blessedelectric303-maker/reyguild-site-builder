import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUnlocked, hashPassword, ROLES, ADMIN_ROLES } from "@/lib/auth";

const patchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().nullable().optional(),
  role: z
    .enum([ROLES.OWNER, ROLES.ADMIN, ROLES.ESTIMATOR, ROLES.TECHNICIAN])
    .optional(),
  isActive: z.boolean().optional(),
  marginViewLocked: z.boolean().optional(),
  hourlyCost: z.number().nullable().optional(),
  hourlyWage: z.number().nullable().optional(),
  canLogMaterialPurchases: z.boolean().optional(),
  newPassword: z.string().min(8).max(100).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireUnlocked(ADMIN_ROLES);
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.orgId !== actor.orgId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isActorOwner = actor.role === ROLES.OWNER;
    const isTargetOwner = target.role === ROLES.OWNER;
    const isSelf = target.id === actor.id;

    const updates: any = {};
    const auditChanges: { field: string; oldValue: string; newValue: string }[] = [];
    let emailChanged = false;if (parsed.data.name !== undefined && parsed.data.name !== target.name) {
      updates.name = parsed.data.name;
      auditChanges.push({
        field: "name",
        oldValue: target.name,
        newValue: parsed.data.name,
      });
    }

    if (parsed.data.email !== undefined) {
      const newEmail = parsed.data.email.toLowerCase().trim();
      if (newEmail !== target.email) {
        // Permission: Owner can change anyone. Admin can change anyone except Owners.
        if (isTargetOwner && !isActorOwner) {
          return NextResponse.json(
            { error: "Only Owners can change Owner emails." },
            { status: 403 }
          );
        }

        // Uniqueness is now per-org. An email used in ANOTHER org is fine;
        // only a clash within this same org is a conflict.
        const existing = await prisma.user.findFirst({
          where: { orgId: actor.orgId, email: newEmail },
          select: { id: true },
        });
        if (existing && existing.id !== target.id) {
          return NextResponse.json(
            { error: "That email is already in use by someone in your organization." },
            { status: 400 }
          );
        }

        updates.email = newEmail;
        emailChanged = true;
        auditChanges.push({
          field: "email",
          oldValue: target.email,
          newValue: newEmail,
        });
      }
    }if (parsed.data.phone !== undefined && parsed.data.phone !== target.phone) {
      updates.phone = parsed.data.phone;
      auditChanges.push({
        field: "phone",
        oldValue: target.phone || "",
        newValue: parsed.data.phone || "",
      });
    }

    if (parsed.data.role !== undefined && parsed.data.role !== target.role) {
      if (!isActorOwner) {
        return NextResponse.json(
          { error: "Only Owners can change roles." },
          { status: 403 }
        );
      }
      if (isSelf) {
        return NextResponse.json(
          { error: "You cannot change your own role." },
          { status: 403 }
        );
      }
      updates.role = parsed.data.role;
      auditChanges.push({
        field: "role",
        oldValue: target.role,
        newValue: parsed.data.role,
      });
    }if (
      parsed.data.isActive !== undefined &&
      parsed.data.isActive !== target.isActive
    ) {
      if (isSelf) {
        return NextResponse.json(
          { error: "You cannot deactivate yourself." },
          { status: 403 }
        );
      }
      if (isTargetOwner && !isActorOwner) {
        return NextResponse.json(
          { error: "Only Owners can deactivate Owners." },
          { status: 403 }
        );
      }
      updates.isActive = parsed.data.isActive;
      auditChanges.push({
        field: "isActive",
        oldValue: String(target.isActive),
        newValue: String(parsed.data.isActive),
      });
    }

    if (
      parsed.data.marginViewLocked !== undefined &&
      parsed.data.marginViewLocked !== target.marginViewLocked
    ) {
      if (!isActorOwner) {
        return NextResponse.json(
          { error: "Only Owners can lock margin views." },
          { status: 403 }
        );
      }
      if (target.role !== ROLES.ADMIN) {
        return NextResponse.json(
          { error: "Margin lock only applies to Admin role." },
          { status: 400 }
        );
      }
      updates.marginViewLocked = parsed.data.marginViewLocked;
      auditChanges.push({
        field: "marginViewLocked",
        oldValue: String(target.marginViewLocked),
        newValue: String(parsed.data.marginViewLocked),
      });
    }if (parsed.data.hourlyCost !== undefined) {
      const currentCost = target.hourlyCost ? Number(target.hourlyCost) : null;
      if (parsed.data.hourlyCost !== currentCost) {
        updates.hourlyCost = parsed.data.hourlyCost;
        auditChanges.push({
          field: "hourlyCost",
          oldValue: currentCost === null ? "" : String(currentCost),
          newValue:
            parsed.data.hourlyCost === null ? "" : String(parsed.data.hourlyCost),
        });
      }
    }

    if (parsed.data.hourlyWage !== undefined) {
      const currentWage = target.hourlyWage ? Number(target.hourlyWage) : null;
      if (parsed.data.hourlyWage !== currentWage) {
        updates.hourlyWage = parsed.data.hourlyWage;
        auditChanges.push({
          field: "hourlyWage",
          oldValue: currentWage === null ? "" : String(currentWage),
          newValue:
            parsed.data.hourlyWage === null ? "" : String(parsed.data.hourlyWage),
        });
      }
    }

    if (
      parsed.data.canLogMaterialPurchases !== undefined &&
      parsed.data.canLogMaterialPurchases !== target.canLogMaterialPurchases
    ) {
      updates.canLogMaterialPurchases = parsed.data.canLogMaterialPurchases;
      auditChanges.push({
        field: "canLogMaterialPurchases",
        oldValue: String(target.canLogMaterialPurchases),
        newValue: String(parsed.data.canLogMaterialPurchases),
      });
    }

    if (parsed.data.newPassword) {
      if (isTargetOwner && !isActorOwner) {
        return NextResponse.json(
          { error: "Only Owners can reset Owner passwords." },
          { status: 403 }
        );
      }
      updates.passwordHash = await hashPassword(parsed.data.newPassword);
      auditChanges.push({
        field: "passwordHash",
        oldValue: "(hidden)",
        newValue: "(reset)",
      });
    }if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true, message: "No changes" });
    }

    updates.updatedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: updates });

      // If email changed, kill all existing sessions so they must log in with new email
      if (emailChanged) {
        await tx.session.deleteMany({ where: { userId: target.id } });
      }

      for (const change of auditChanges) {
        await tx.auditLog.create({
          data: {
            id: "audit_" + crypto.randomUUID(),
            orgId: actor.orgId,
            actorUserId: actor.id,
            actorRole: actor.role,
            actionType: "user_updated",
            targetTable: "User",
            targetId: target.id,
            fieldChanged: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
          },
        });
      }
    });

    return NextResponse.json({ ok: true, emailChanged });
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
    if (err?.message === "ORG_LOCKED") {
      return NextResponse.json(
        { error: "Your trial has ended. Renew to edit users." },
        { status: 403 }
      );
    }
    console.error("Update user error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
