import { prisma } from "@/lib/prisma";

// Colorado HFWA: employees accrue 1 hour of paid sick leave per 30 hours worked,
// capped at 48 hours per year. We measure "per year" as a rolling 12-month window.
// The balance is always COMPUTED from time entries + approved sick requests —
// never stored — so it cannot drift out of sync.

const ACCRUAL_RATIO = 30; // 1 hour earned per 30 worked
const ANNUAL_CAP_HOURS = 48;

export type SickLeaveBalance = {
  accrued: number; // hours earned in the window, capped at 48
  used: number; // approved sick hours in the window
  available: number; // accrued - used, floored at 0
};

export async function getSickLeaveBalance(
  userId: string,
  orgId: string
): Promise<SickLeaveBalance> {
  // Rolling 12-month window
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 365);

  // Hours worked in the window (completed entries only)
  const workedAgg = await prisma.timeEntry.aggregate({
    where: {
      userId,
      clockOutAt: { not: null },
      clockInAt: { gte: windowStart },
    },
    _sum: { totalMinutes: true },
  });
  const hoursWorked = (workedAgg._sum.totalMinutes || 0) / 60;

  // Accrued = floor(hoursWorked / 30), capped at 48
  const rawAccrued = Math.floor(hoursWorked / ACCRUAL_RATIO);
  const accrued = Math.min(ANNUAL_CAP_HOURS, rawAccrued);

  // Used = sum of approved sick-type requests in the window
  const usedAgg = await prisma.timeOffRequest.aggregate({
    where: {
      requesterUserId: userId,
      orgId,
      type: "sick",
      status: "approved",
      startDate: { gte: windowStart },
    },
    _sum: { hoursRequested: true },
  });
  const used = Number(usedAgg._sum.hoursRequested || 0);

  const available = Math.max(0, accrued - used);

  return { accrued, used, available };
}
