import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUnlocked, ROLES } from "@/lib/auth";
import { distanceMiles } from "@/lib/geo";

const schema = z.object({
  jobId: z.string().min(1),
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
    const { jobId, lat, lng, accuracy } = parsed.data;

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
    if (job.lat === null || job.lng === null) {
      return NextResponse.json({ error: "Job has no location set. Contact admin." }, { status: 400 });
    }

    const dist = distanceMiles(lat, lng, job.lat, job.lng);

    // THE GEOFENCE APPLIES TO THE FIRST JOB OF THE DAY ONLY.
    //
    // The first job starts when you get there, so being at the address is the
    // whole point. Every job after that is clocked in on the way, from wherever
    // you happen to be - travel between jobs is paid time, and a geofence would
    // make that impossible.
    //
    // Distance is still recorded on every clock-in either way, so the office
    // can see where somebody actually was.
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const earlierToday = await prisma.timeEntry.count({
      where: { userId: user.id, clockInAt: { gte: startOfDay } },
    });
    const isFirstJobOfDay = earlierToday === 0;

    if (isFirstJobOfDay && dist > job.geofenceMiles) {
      return NextResponse.json(
        {
          error:
            "You are " +
            dist.toFixed(2) +
            " miles from the job. The first job of the day has to be clocked in " +
            "at the address - within " +
            job.geofenceMiles +
            " mile(s). After this one you can clock in on the way.",
        },
        { status: 403 }
      );
    }

    const existing = await prisma.timeEntry.findFirst({
      where: { userId: user.id, clockOutAt: null },
      select: { id: true, jobId: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You are already clocked in on another job. Clock out there first." },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.timeEntry.create({
        data: {
          id: "te_" + crypto.randomUUID(),
          jobId: job.id,
          userId: user.id,
          clockInAt: new Date(),
          clockInLat: lat,
          clockInLng: lng,
          distanceFromJobMiles: dist,
        },
      });

      await tx.gpsCheckIn.create({
        data: {
          id: "gps_" + crypto.randomUUID(),
          jobId: job.id,
          userId: user.id,
          checkInType: "clock_in",
          lat,
          lng,
          accuracy: accuracy ?? null,
          distanceFromJobMiles: dist,
          wasWithinGeofence: true,
        },
      });if (job.status === "scheduled" || job.status === "on_the_way" || job.status === "arrived") {
        await tx.job.update({
          where: { id: job.id },
          data: { status: "in_progress", updatedAt: new Date() },
        });
      }

      await tx.jobStatusUpdate.create({
        data: {
          id: "jsu_" + crypto.randomUUID(),
          jobId: job.id,
          userId: user.id,
          updateType: "clock_in",
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
      return NextResponse.json({ error: "This account's trial has ended. Ask your office to renew." }, { status: 403 });
    }
    console.error("Clock-in error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
