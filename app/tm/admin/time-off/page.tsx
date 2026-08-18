import { prisma } from "@/lib/prisma";
import { getCurrentUser, ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import TimeOffDecisionActions from "./TimeOffDecisionActions";

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

function formatTimestamp(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export default async function AdminTimeOffPage() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");
  if (!ADMIN_ROLES.includes(actor.role as any)) redirect("/tm/admin");

  const requests = await prisma.timeOffRequest.findMany({
    where: { orgId: actor.orgId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      requester: {
        select: { id: true, name: true, email: true },
      },
      decidedBy: { select: { name: true } },
    },
    take: 200,
  });

  // For each unique requester, get their all-time stats
  const requesterIds = Array.from(new Set(requests.map((r) => r.requesterUserId)));
  const stats = new Map<
    string,
    { hoursWorked: number; ptoApproved: number; pendingCount: number }
  >();

  for (const userId of requesterIds) {
    const [worked, approved, pending] = await Promise.all([
      prisma.timeEntry.aggregate({
        where: { userId, clockOutAt: { not: null } },
        _sum: { totalMinutes: true },
      }),
      prisma.timeOffRequest.aggregate({
        where: { requesterUserId: userId, status: "approved" },
        _sum: { hoursRequested: true },
      }),
      prisma.timeOffRequest.count({
        where: { requesterUserId: userId, status: "pending" },
      }),
    ]);
    stats.set(userId, {
      hoursWorked: (worked._sum.totalMinutes || 0) / 60,
      ptoApproved: Number(approved._sum.hoursRequested || 0),
      pendingCount: pending,
    });
  }

  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending");

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
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Time Off Requests</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review and decide pending requests. Decisions are audit-logged.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">
          Pending ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            <p className="text-sm text-slate-500">No pending requests.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {pending.map((r) => {
              const s = stats.get(r.requesterUserId);
              return (
                <li
                  key={r.id}
                  className="bg-white rounded-xl border-2 border-amber-200 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">
                        {r.requester.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        Submitted {formatTimestamp(r.createdAt)}
                      </div>
                    </div>
                    <span
                      className={
                        "inline-block text-xs font-medium px-2 py-0.5 rounded shrink-0 " +
                        statusBadge[r.status]
                      }
                    >
                      {r.status}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                    <div>
                      <span className="font-semibold">
                        {typeLabel[r.type] || r.type}
                      </span>
                      {" · "}
                      <span className="font-semibold">
                        {Number(r.hoursRequested).toFixed(1)}h requested
                      </span>
                    </div>
                    <div className="text-slate-700">
                      {formatDateRange(r.startDate, r.endDate)}
                      {r.duration === "custom" && r.startTime && r.endTime
                        ? " · " + r.startTime + "–" + r.endTime
                        : r.duration === "half_day"
                        ? " · half days"
                        : ""}
                    </div>
                    <div className="text-slate-700 pt-1 border-t border-slate-200">
                      Reason: {r.reason}
                    </div>
                  </div>

                  {s && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-50 rounded p-2">
                        <div className="text-slate-500 uppercase tracking-wide">
                          Worked
                        </div>
                        <div className="font-semibold text-slate-900 mt-0.5">
                          {s.hoursWorked.toFixed(1)}h
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <div className="text-slate-500 uppercase tracking-wide">
                          PTO used
                        </div>
                        <div className="font-semibold text-slate-900 mt-0.5">
                          {s.ptoApproved.toFixed(1)}h
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <div className="text-slate-500 uppercase tracking-wide">
                          After this
                        </div>
                        <div className="font-semibold text-slate-900 mt-0.5">
                          {(s.ptoApproved + Number(r.hoursRequested)).toFixed(1)}h
                        </div>
                      </div>
                    </div>
                  )}

                  <TimeOffDecisionActions requestId={r.id} />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {decided.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            Recent decisions
          </h2>
          <ul className="space-y-2">
            {decided.slice(0, 50).map((r) => (
              <li
                key={r.id}
                className="bg-white rounded-xl border border-slate-200 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900">
                      {r.requester.name} · {typeLabel[r.type] || r.type} ·{" "}
                      {Number(r.hoursRequested).toFixed(1)}h
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {formatDateRange(r.startDate, r.endDate)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {r.status === "approved" ? "Approved" : "Denied"} by{" "}
                      {r.decidedBy?.name || "system"}
                      {r.decidedAt ? " on " + formatTimestamp(r.decidedAt) : ""}
                    </div>
                    {r.decisionReason && (
                      <div className="text-xs text-slate-600 italic mt-1">
                        {r.status === "denied" ? "Denial reason: " : "Note: "}
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
        </div>
      )}
    </div>
  );
}
