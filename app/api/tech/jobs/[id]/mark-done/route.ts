import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUnlocked, ROLES } from "@/lib/auth";
import { uploadPhoto } from "@/lib/supabase-storage";
import {
  calcTotalMinutes,
  calcLaborCost,
  stampLaborCostTag,
  getEffectiveHourlyRate,
} from "@/lib/labor-cost";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUnlocked([ROLES.TECHNICIAN]);

    const formData = await req.formData();
    const notes = ((formData.get("notes") as string) || "").trim().slice(0, 2000);

    // Collect photos — accepts multiple under same field name "photos"
    const photoEntries = formData.getAll("photos") as File[];
    const photos = photoEntries.filter((f) => f && f.size > 0);

    if (photos.length === 0) {
      return NextResponse.json(
        { error: "At least 1 completion photo is required." },
        { status: 400 }
      );
    }

    if (photos.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 photos per submission." },
        { status: 400 }
      );
    }// Validate every photo before any DB writes
    for (const photo of photos) {
      if (photo.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Each photo must be under 10 MB." },
          { status: 400 }
        );
      }
      if (!ALLOWED_TYPES.includes(photo.type)) {
        return NextResponse.json(
          { error: "Photos must be JPEG, PNG, WebP, or HEIC." },
          { status: 400 }
        );
      }
    }

    // Look up the job + assignment
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        assignments: {
          where: { userId: user.id },
          select: { id: true },
        },
      },
    });

    if (!job || job.orgId !== user.orgId) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.assignments.length === 0) {
      return NextResponse.json(
        { error: "You are not assigned to this job." },
        { status: 403 }
      );
    }

    // Status guard
    if (job.status === "awaiting_invoice") {
      return NextResponse.json(
        { error: "This job is already marked done." },
        { status: 400 }
      );
    }
    if (job.status === "completed" || job.status === "archived" || job.status === "cancelled") {
      return NextResponse.json(
        { error: "This job cannot be marked done from its current status." },
        { status: 400 }
      );
    }// Block if anyone is still clocked in on this job
    // JOB COMPLETE SIGNS YOU OUT. THAT IS THE POINT OF THE BUTTON.
    //
    // It used to refuse until you had clocked out first, which meant a man who
    // finished a five-hour job in half an hour had to remember two steps while
    // standing in somebody's driveway - and if he forgot the second one, his
    // clock ran all afternoon and the job carried hours nobody worked.
    // Finishing the job IS clocking off it.
    //
    // His own entry closes here, priced the same way clocking out prices it,
    // so the P&L reads the same either way. Anybody ELSE still on the clock is
    // left alone: that is their timesheet and their pay, and no man should be
    // able to end another man's day from his own phone. If someone else is
    // still on it, this says who, by name, and stops.
    const stillOn = await prisma.timeEntry.findMany({
      where: { jobId: job.id, clockOutAt: null },
      select: {
        id: true,
        userId: true,
        clockInAt: true,
        notes: true,
        user: { select: { name: true } },
      },
    });
    const others = stillOn.filter((t) => t.userId !== user.id);
    if (others.length > 0) {
      const names = Array.from(
        new Set(others.map((t) => (t.user && t.user.name) || "somebody"))
      ).join(", ");
      return NextResponse.json(
        {
          error:
            names +
            (others.length === 1 ? " is" : " are") +
            " still clocked in on this job. They need to clock out before it can be closed.",
        },
        { status: 400 }
      );
    }

    const mine = stillOn.filter((t) => t.userId === user.id);
    if (mine.length > 0) {
      const closeAt = new Date();
      const rate = await getEffectiveHourlyRate(user.id, job.id);
      for (const entry of mine) {
        const totalMinutes = calcTotalMinutes(entry.clockInAt, closeAt);
        const laborCost = calcLaborCost(totalMinutes, rate);
        await prisma.timeEntry.update({
          where: { id: entry.id },
          data: {
            clockOutAt: closeAt,
            totalMinutes,
            notes: stampLaborCostTag(entry.notes, laborCost),
            updatedAt: closeAt,
          },
        });
      }
    }

    // Upload photos to Supabase Storage BEFORE the transaction
    type UploadedPhoto = { storagePath: string; mimeType: string; fileSize: number };
    const uploaded: UploadedPhoto[] = [];

    for (const photo of photos) {
      const arrayBuffer = await photo.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = (photo.type.split("/")[1] || "jpg").split("+")[0];
      const fileName = "completion_" + crypto.randomUUID() + "." + ext;
      const storagePath = user.orgId + "/" + job.id + "/" + fileName;

      const upload = await uploadPhoto("job-photos", storagePath, buffer, photo.type);
      if (!upload.ok || !upload.path) {
        return NextResponse.json(
          { error: "Photo upload failed. Please try again." },
          { status: 500 }
        );
      }
      uploaded.push({
        storagePath: upload.path,
        mimeType: photo.type,
        fileSize: photo.size,
      });
    }// Now write everything in a transaction
    await prisma.$transaction(async (tx) => {
      // Update job status
      await tx.job.update({
        where: { id: job.id },
        data: {
          status: "awaiting_invoice",
          updatedAt: new Date(),
        },
      });

      // Create photo records
      for (const p of uploaded) {
        await tx.jobPhoto.create({
          data: {
            id: "photo_" + crypto.randomUUID(),
            jobId: job.id,
            uploadedByUserId: user.id,
            photoCategory: "completion",
            photoType: "completion",
            imageUrl: p.storagePath,
            mimeType: p.mimeType,
            fileSize: p.fileSize,
          },
        });
      }

      // Optional notes — store as a JobStatusUpdate row so admin can see context
      await tx.jobStatusUpdate.create({
        data: {
          id: "jsu_" + crypto.randomUUID(),
          jobId: job.id,
          userId: user.id,
          updateType: "mark_done",
          notes: notes || null,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId: user.orgId,
          actorUserId: user.id,
          actorRole: user.role,
          actionType: "job_marked_done",
          targetTable: "Job",
          targetId: job.id,
          fieldChanged: "status",
          oldValue: job.status,
          newValue: "awaiting_invoice",
          reason: notes || null,
        },
      });
    });

    return NextResponse.json({ ok: true, photoCount: uploaded.length });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    if (err?.message === "ORG_LOCKED") {
      return NextResponse.json({ error: "This account's trial has ended. Ask your office to renew." }, { status: 403 });
    }
    console.error("Mark job done error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
