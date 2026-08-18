import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, ADMIN_ROLES } from "@/lib/auth";

const patchSchema = z.object({
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().max(50).nullable().optional(),
  customerEmail: z
    .union([z.string().email().max(200), z.literal("")])
    .nullable()
    .optional(),
  jobAddress: z.string().min(3).max(500),
  jobLat: z.number(),
  jobLng: z.number(),
  scheduledStartAt: z.string().nullable().optional(),
  scheduledEndAt: z.string().nullable().optional(),
  jobDescription: z.string().max(5000).nullable().optional(),
  reason: z.string().min(3).max(500),
});

function normIso(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

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
        { error: "Invalid input. Please check all fields and try again." },
        { status: 400 }
      );
    }

    const job = await prisma.job.findUnique({
      where: { id },
      select: {
        id: true,
        orgId: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        jobAddress: true,
        lat: true,
        lng: true,
        scheduledStart: true,
        scheduledEnd: true,
        jobDescription: true,
      },
    });

    if (!job || job.orgId !== actor.orgId) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const data = parsed.data;

    // Build changes diff (field by field)
    const updates: any = {};
    const auditEntries: Array<{
      field: string;
      oldVal: string;
      newVal: string;
    }> = [];

    if (data.customerName !== job.customerName) {
      updates.customerName = data.customerName;
      auditEntries.push({
        field: "customerName",
        oldVal: job.customerName || "",
        newVal: data.customerName,
      });
    }

    const newPhone = data.customerPhone === "" ? null : data.customerPhone ?? null;
    if (newPhone !== job.customerPhone) {
      updates.customerPhone = newPhone;
      auditEntries.push({
        field: "customerPhone",
        oldVal: job.customerPhone || "",
        newVal: newPhone || "",
      });
    }

    const newEmail = data.customerEmail === "" ? null : data.customerEmail ?? null;
    if (newEmail !== job.customerEmail) {
      updates.customerEmail = newEmail;
      auditEntries.push({
        field: "customerEmail",
        oldVal: job.customerEmail || "",
        newVal: newEmail || "",
      });
    }

    if (data.jobAddress !== job.jobAddress) {
      updates.jobAddress = data.jobAddress;
      auditEntries.push({
        field: "jobAddress",
        oldVal: job.jobAddress || "",
        newVal: data.jobAddress,
      });
    }

    const oldLat = job.lat !== null ? Number(job.lat) : null;
    const oldLng = job.lng !== null ? Number(job.lng) : null;
    if (data.jobLat !== oldLat || data.jobLng !== oldLng) {
      updates.lat = data.jobLat;
      updates.lng = data.jobLng;
      auditEntries.push({
        field: "coordinates",
        oldVal: oldLat !== null && oldLng !== null ? oldLat.toFixed(5) + "," + oldLng.toFixed(5) : "",
        newVal: data.jobLat.toFixed(5) + "," + data.jobLng.toFixed(5),
      });
    }

    const newStartIso = normIso(data.scheduledStartAt);
    const oldStartIso = job.scheduledStart ? job.scheduledStart.toISOString() : null;
    if (newStartIso !== oldStartIso) {
      updates.scheduledStart = newStartIso ? new Date(newStartIso) : null;
      auditEntries.push({
        field: "scheduledStart",
        oldVal: oldStartIso || "",
        newVal: newStartIso || "",
      });
    }

    const newEndIso = normIso(data.scheduledEndAt);
    const oldEndIso = job.scheduledEnd ? job.scheduledEnd.toISOString() : null;
    if (newEndIso !== oldEndIso) {
      updates.scheduledEnd = newEndIso ? new Date(newEndIso) : null;
      auditEntries.push({
        field: "scheduledEnd",
        oldVal: oldEndIso || "",
        newVal: newEndIso || "",
      });
    }

    const newDesc = data.jobDescription === "" ? null : data.jobDescription ?? null;
    if (newDesc !== job.jobDescription) {
      updates.jobDescription = newDesc;
      auditEntries.push({
        field: "jobDescription",
        oldVal: job.jobDescription || "",
        newVal: newDesc || "",
      });
    }

    if (auditEntries.length === 0) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    updates.updatedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id },
        data: updates,
      });

      for (const entry of auditEntries) {
        await tx.auditLog.create({
          data: {
            id: "audit_" + crypto.randomUUID(),
            orgId: actor.orgId,
            actorUserId: actor.id,
            actorRole: actor.role,
            actionType: "edit_job_info",
            targetTable: "Job",
            targetId: id,
            fieldChanged: entry.field,
            oldValue: entry.oldVal,
            newValue: entry.newVal,
            reason: data.reason.trim(),
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
      return NextResponse.json(
        { error: "You don't have permission" },
        { status: 403 }
      );
    }
    console.error("Edit job info error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
