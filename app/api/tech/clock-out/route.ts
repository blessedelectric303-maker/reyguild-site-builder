import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES } from "@/lib/auth";
import { distanceMiles } from "@/lib/geo";
import { getEffectiveHourlyRate } from "@/lib/labor-cost";

const schema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number().optional(),
});

function extractDraftAmount(notes: string | null): number | null {
  if (!notes) return null;
  const m = notes.match(/\[draft\|pending\|amount=([\d.]+)\]/);
  if (!m) return null;
  const n = Number(m[1]);
  return isNaN(n) ? null : n;
}

export async function POST(req: Request) {
  try {
    const user = await requireRole([ROLES.TECHNICIAN]);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { lat, lng, accuracy } = parsed.data;

    const active = await prisma.timeEntry.findFirst({
      where: { userId: user.id, clockOutAt: null },
      include: { job: true },
    });
    if (!active) {
      return NextResponse.json({ error: "You are not clocked in." }, { status: 400 });
    }

    const now = new Date();
    const totalMinutes = Math.max(
      1,
      Math.round((now.getTime() - active.clockInAt.getTime()) / 60000)
    );

    const dist =
      active.job.lat !== null && active.job.lng !== null
        ? distanceMiles(lat, lng, active.job.lat, active.job.lng)
        : null;

    // Calculate labor cost for THIS entry using effective rate
    // (JobAssignment.hourlyRateOverride if set, else user.hourlyCost)
    const effectiveRate = await getEffectiveHourlyRate(user.id, active.jobId);
    const hourlyCost = effectiveRate ?? 0;
    const laborCost = +((totalMinutes / 60) * hourlyCost).toFixed(2);
    const laborTag = "[laborCost=" + laborCost.toFixed(2) + "]";
    const existingNotes = active.notes || "";
    const newNotes = (existingNotes ? existingNotes + " " : "") + laborTag;

    await prisma.$transaction(async (tx) => {
      await tx.timeEntry.update({
        where: { id: active.id },
        data: {
          clockOutAt: now,
          clockOutLat: lat,
          clockOutLng: lng,
          totalMinutes,
          notes: newNotes,
          updatedAt: now,
        },
      });
      await tx.gpsCheckIn.create({
        data: {
          id: "gps_" + crypto.randomUUID(),
          jobId: active.jobId,
          userId: user.id,
          checkInType: "clock_out",
          lat,
          lng,
          accuracy: accuracy ?? null,
          distanceFromJobMiles: dist,
          wasWithinGeofence: dist !== null && dist <= active.job.geofenceMiles,
        },
      });
      await tx.jobStatusUpdate.create({
        data: {
          id: "jsu_" + crypto.randomUUID(),
          jobId: active.jobId,
          userId: user.id,
          updateType: "clock_out",
        },
      });
    });

    // Cost-alert check (after the transaction so we have committed data)
    try {
      const job = await prisma.job.findUnique({
        where: { id: active.jobId },
        include: {
          org: { select: { costAlertThresholdPct: true } },
          timeEntries: {
            where: { clockOutAt: { not: null } },
            select: { notes: true },
          },
          materialPurchases: {
            select: { totalAmount: true, notes: true },
          },
          otherJobCosts: {
            select: { amount: true },
          },
        },
      });

      if (job && job.salePrice && !job.costAlertSentAt) {
        const salePrice = Number(job.salePrice);
        const threshold = (job.org.costAlertThresholdPct || 60) / 100;

        // Sum labor from all clocked-out entries
        let totalLabor = 0;
        for (const entry of job.timeEntries) {
          const m = entry.notes?.match(/\[laborCost=([\d.]+)\]/);
          if (m) totalLabor += Number(m[1]);
        }

        // Sum confirmed materials only (drafts skipped)
        let totalMaterials = 0;
        for (const p of job.materialPurchases) {
          if (extractDraftAmount(p.notes) === null) {
            totalMaterials += Number(p.totalAmount);
          }
        }

        // Sum other job costs
        let totalOther = 0;
        for (const c of job.otherJobCosts) {
          totalOther += Number(c.amount);
        }

        const ratio = salePrice > 0 ? (totalLabor + totalMaterials + totalOther) / salePrice : 0;

        if (ratio >= threshold) {
          await prisma.job.update({
            where: { id: job.id },
            data: { costAlertSentAt: new Date() },
          });
          console.log(
            "COST ALERT fired for job " +
              job.id +
              ": " +
              (ratio * 100).toFixed(1) +
              "% of sale price"
          );
          // Email/SMS notification would go here in the future
        }
      }
    } catch (alertErr) {
      console.error("Cost alert check failed (non-fatal):", alertErr);
    }

    return NextResponse.json({ ok: true, totalMinutes, laborCost });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    console.error("Clock-out error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
