// Server-side helpers for the [laborCost=XX.XX] tag stored in TimeEntry.notes.
// Effective rate: JobAssignment.hourlyRateOverride if set, else user.hourlyCost.

import { prisma } from "@/lib/prisma";

const TAG_RE = /\[laborCost=[\d.]+\]/g;

export function calcLaborCost(totalMinutes: number, hourlyCost: number | null | undefined): number {
  const hc = Number(hourlyCost ?? 0);
  if (!hc || !totalMinutes || totalMinutes <= 0) return 0;
  return Math.round((totalMinutes * hc / 60) * 100) / 100;
}

export function calcTotalMinutes(clockInAt: Date, clockOutAt: Date): number {
  const ms = clockOutAt.getTime() - clockInAt.getTime();
  if (ms <= 0) return 0;
  return Math.round(ms / 60000);
}

export function stampLaborCostTag(existingNotes: string | null, laborCost: number): string {
  const cleaned = (existingNotes ?? "").replace(TAG_RE, "").trim();
  const tag = "[laborCost=" + laborCost.toFixed(2) + "]";
  return cleaned ? cleaned + " " + tag : tag;
}

export function parseLaborCostFromNotes(notes: string | null): number {
  if (!notes) return 0;
  const m = notes.match(/\[laborCost=([\d.]+)\]/);
  if (!m) return 0;
  const n = Number(m[1]);
  return isNaN(n) ? 0 : n;
}

/**
 * Returns the effective hourly rate for a user on a specific job.
 * Looks up JobAssignment.hourlyRateOverride first, falls back to user.hourlyCost.
 * Returns null if neither is set (no rate available).
 */
export async function getEffectiveHourlyRate(
  userId: string,
  jobId: string
): Promise<number | null> {
  const assignment = await prisma.jobAssignment.findUnique({
    where: { jobId_userId: { jobId, userId } },
    select: {
      hourlyRateOverride: true,
      user: { select: { hourlyCost: true } },
    },
  });

  if (assignment && assignment.hourlyRateOverride !== null) {
    return Number(assignment.hourlyRateOverride);
  }

  // Fall back to user default. If no assignment exists, fetch user separately.
  if (assignment) {
    return assignment.user.hourlyCost ? Number(assignment.user.hourlyCost) : null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hourlyCost: true },
  });
  return user?.hourlyCost ? Number(user.hourlyCost) : null;
}
