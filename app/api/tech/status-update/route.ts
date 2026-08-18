import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUnlocked, ROLES } from "@/lib/auth";
import { distanceMiles } from "@/lib/geo";
import {
  sendCustomerOnTheWayEmail,
  sendCustomerArrivedEmail,
} from "@/lib/email";

const schema = z.object({
  jobId: z.string().min(1),
  updateType: z.enum(["on_the_way", "arrived"]),
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUnlocked([ROLES.TECHNICIAN]);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { jobId, updateType, lat, lng, accuracy } = parsed.data;
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        assignments: { where: { userId: user.id }, select: { id: true } },
      },
    });
    if (!job || job.orgId !== user.orgId) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.assignments.length === 0) {
      return NextResponse.json({ error: "You are not assigned to this job" }, { status: 403 });
    }
    const dist =
      job.lat !== null && job.lng !== null ? distanceMiles(lat, lng, job.lat, job.lng) : null;
    await prisma.$transaction(async (tx) => {
      await tx.gpsCheckIn.create({
        data: {
          id: "gps_" + crypto.randomUUID(),
          jobId: job.id,
          userId: user.id,
          checkInType: updateType,
          lat,
          lng,
          accuracy: accuracy ?? null,
          distanceFromJobMiles: dist,
          wasWithinGeofence: dist !== null && dist <= job.geofenceMiles,
        },
      });
      await tx.jobStatusUpdate.create({
        data: {
          id: "jsu_" + crypto.randomUUID(),
          jobId: job.id,
          userId: user.id,
          updateType,
        },
      });
      await tx.job.update({
        where: { id: job.id },
        data: { status: updateType, updatedAt: new Date() },
      });
    });

    // Best-effort customer email AFTER the status is safely saved.
    // A failure here never breaks the tech's status update.
    if (job.customerEmail) {
      try {
        const result =
          updateType === "on_the_way"
            ? await sendCustomerOnTheWayEmail({
                to: job.customerEmail,
                scheduledStart: job.scheduledStart,
              })
            : await sendCustomerArrivedEmail({ to: job.customerEmail });

        const messageBody =
          updateType === "on_the_way"
            ? "Your tech is on the way."
            : "Your tech has arrived.";

        await prisma.customerNotification.create({
          data: {
            id: "cn_" + crypto.randomUUID(),
            jobId: job.id,
            userId: user.id,
            notificationType: updateType,
            channel: "email",
            toEmail: job.customerEmail,
            messageBody,
            status: result.ok ? "sent" : "failed",
            errorMessage: result.ok ? null : "reason" in result ? result.reason : "unknown",
            sentAt: result.ok ? new Date() : null,
          },
        });
      } catch (emailErr) {
        console.error("Customer status email failed:", emailErr);
      }
    }

    return NextResponse.json({ ok: true });
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
    console.error("Status update error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
