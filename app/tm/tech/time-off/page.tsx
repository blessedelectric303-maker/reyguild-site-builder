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
  return formatDate(start) + " – " + formatDate(end);
}

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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Time Off</h1>
        <p className="text-sm text-slate-500 mt-1">
          Request time off and view your history.
        </p>
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
          ({sick.accrued.toFixed(1)}h earned − {sick.used.toFixed(1)}h used).
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
                      {typeLabel[r.type] || r.type} · {Number(r.hoursRequested).toFixed(1)}h
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {formatDateRange(r.startDate, r.endDate)}
                      {r.duration === "custom" && r.startTime && r.endTime
                        ? " · " + r.startTime + "–" + r.endTime
                        : r.duration === "half_day"
                        ? " · half days"
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
