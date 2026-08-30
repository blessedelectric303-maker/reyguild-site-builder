import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import TimeOffRequestForm from "./TimeOffRequestForm";
import { getSickLeaveBalance } from "@/lib/sick-leave";

export const dynamic = "force-dynamic";

const TZ = "America/Denver";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function formatDateRange(start: Date, end: Date): string {
  if (start.getTime() === end.getTime()) {
    return formatDate(start);
  }
  return formatDate(start) + " - " + formatDate(end);
}

const ABSENCE_WINDOW_DAYS = 90;
const ABSENCE_THRESHOLD = 3;

export default async function TechTimeOffPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const requests = await prisma.timeOffRequest.findMany({
    where: { requesterUserId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const allTimeWorkedAgg = await prisma.timeEntry.aggregate({
    where: { userId: user.id, clockOutAt: { not: null } },
    _sum: { totalMinutes: true },
  });
  const allTimeHoursWorked = (allTimeWorkedAgg._sum.totalMinutes || 0) / 60;

  const sick = await getSickLeaveBalance(user.id, user.orgId);

  const approved = requests.filter((r) => r.status === "approved");
  const totalApprovedHours = approved.reduce(
    (s, r) => s + Number(r.hoursRequested),
    0
  );
  const byType: Record<string, number> = {
    vacation: 0,
    sick: 0,
    personal: 0,
  };
  for (const r of approved) {
    byType[r.type] = (byType[r.type] || 0) + Number(r.hoursRequested);
  }

  const statusBadge: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    denied: "bg-red-100 text-red-700",
  };

  const typeLabel: Record<string, string> = {
    vacation: "Vacation",
    sick: "Sick",
    personal: "Personal",
  };

  // Your own attendance record. Shown to you because you should never learn
  // about this from a conversation you were not expecting.
  const absSince = new Date();
  absSince.setDate(absSince.getDate() - ABSENCE_WINDOW_DAYS);
  let myAbsences: { id: string; absenceDate: Date; excused: boolean }[] = [];
  try {
    myAbsences = await prisma.absenceNotice.findMany({
      where: { userId: user.id, absenceDate: { gte: absSince } },
      orderBy: { absenceDate: "desc" },
      select: { id: true, absenceDate: true, excused: true },
    });
  } catch (e) {
    myAbsences = [];
  }
  const unexcused = myAbsences.filter((a) => !a.excused).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Time Off</h1>
        <p className="text-sm text-slate-500 mt-1">
          Request time off and view your history.
        </p>
      </div>

      <div className={"rounded-xl border p-4 " + (unexcused >= ABSENCE_THRESHOLD ? "border-red-300 bg-red-50" : "bg-white border-slate-200")}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900 text-sm">Attendance</h2>
          <span className={"rounded-full px-2.5 py-1 text-xs font-bold " + (unexcused >= ABSENCE_THRESHOLD ? "bg-red-100 text-red-800" : unexcused > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600")}>
            {unexcused} unexcused
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Last {ABSENCE_WINDOW_DAYS} days. Time off taken properly is never
          held against you - only absences recorded as unexcused count here.
        </p>
        {myAbsences.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {myAbsences.slice(0, 12).map((a) => (
              <span key={a.id} className={"rounded px-2 py-0.5 text-[11px] " + (a.excused ? "bg-slate-100 text-slate-600" : "bg-red-100 text-red-800")}>
                {a.absenceDate.toISOString().slice(0, 10)}{a.excused ? "" : " - unexcused"}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500">Nothing recorded. Good.</p>
        )}
        {unexcused >= ABSENCE_THRESHOLD ? (
          <p className="mt-2 text-xs text-red-800">
            If you think any of these is wrong, talk to the office. It is much
            easier to sort out now than months from now.
          </p>
        ) : null}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <h2 className="font-semibold text-slate-900 text-sm">Your sick leave</h2>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">
              Hours worked
            </div>
            <div className="font-semibold text-slate-900 mt-0.5">
              {allTimeHoursWorked.toFixed(1)}h
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">
              Sick available
            </div>
            <div className="font-semibold text-emerald-700 mt-0.5">
              {sick.available.toFixed(1)}h
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">
              Sick approved
            </div>
            <div className="font-semibold text-slate-900 mt-0.5">
              {byType.sick.toFixed(1)}h
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-500 pt-1 border-t border-slate-100">
          Sick leave accrues 1h per 30h worked, max 48h/yr (rolling 12 months).
          You have {sick.available.toFixed(1)}h available
          ({sick.accrued.toFixed(1)}h earned - {sick.used.toFixed(1)}h used).
        </div>
      </div>

      <TimeOffRequestForm sickAvailable={sick.available} />

      <div className="space-y-2">
        <h2 className="font-semibold text-slate-900 text-sm">Your requests</h2>
        {requests.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-sm text-slate-500">No requests yet.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {requests.map((r) => (
              <li
                key={r.id}
                className="bg-white rounded-xl border border-slate-200 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900">
                      {typeLabel[r.type] || r.type} &middot; {Number(r.hoursRequested).toFixed(1)}h
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {formatDateRange(r.startDate, r.endDate)}
                      {r.duration === "custom" && r.startTime && r.endTime
                        ? " &middot; " + r.startTime + "-" + r.endTime
                        : r.duration === "half_day"
                        ? " &middot; half days"
                        : ""}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">{r.reason}</div>
                    {r.status !== "pending" && r.decisionReason && (
                      <div className="text-xs text-slate-500 mt-2 italic">
                        {r.status === "denied" ? "Denied: " : "Note: "}
                        {r.decisionReason}
                      </div>
                    )}
                  </div>
                  <span
                    className={
                      "inline-block text-xs font-medium px-2 py-0.5 rounded shrink-0 " +
                      (statusBadge[r.status] || "bg-slate-100 text-slate-700")
                    }
                  >
                    {r.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
