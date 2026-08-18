import { prisma } from "@/lib/prisma";
import { getCurrentUser, ADMIN_ROLES } from "@/lib/auth";
import { parseLaborCostFromNotes } from "@/lib/labor-cost";
import { redirect } from "next/navigation";
import Link from "next/link";
import TimesheetRow from "./TimesheetRow";
import ExportButton from "./ExportButton";

export const dynamic = "force-dynamic";

const TZ = "America/Denver";

function parseWeekStart(weekParam: string | undefined): Date {
  if (weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)) {
    const [y, m, d] = weekParam.split("-").map(Number);
    const utc = new Date(Date.UTC(y, m - 1, d, 7, 0, 0));
    const offset = getDenverOffsetHours(utc);
    return new Date(Date.UTC(y, m - 1, d, offset, 0, 0));
  }
  return currentWeekStart();
}

function getDenverOffsetHours(d: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    timeZoneName: "short",
  });
  const parts = dtf.formatToParts(d);
  const tz = parts.find((p) => p.type === "timeZoneName")?.value || "MST";
  return tz === "MDT" ? 6 : 7;
}

function currentWeekStart(): Date {
  const now = new Date();
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = dtf.formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const weekday = parts.find((p) => p.type === "weekday")?.value || "Sun";
  const wMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dow = wMap[weekday] ?? 0;
  const sundayY = year;
  let sundayM = month;
  let sundayD = day - dow;
  const norm = new Date(Date.UTC(sundayY, sundayM - 1, sundayD, 12, 0, 0));
  const ny = norm.getUTCFullYear();
  const nm = norm.getUTCMonth() + 1;
  const nd = norm.getUTCDate();
  const offset = getDenverOffsetHours(norm);
  return new Date(Date.UTC(ny, nm - 1, nd, offset, 0, 0));
}

function toDateParam(d: Date): string {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return dtf.format(d);
}

function formatWeekRange(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      month: "short",
      day: "numeric",
    }).format(d);
  const yr = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
  }).format(end);
  const lastDay = new Date(end.getTime() - 1);
  return fmt(start) + " – " + fmt(lastDay) + ", " + yr;
}

export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!ADMIN_ROLES.includes(user.role as any)) redirect("/tm/admin");

  const weekStart = parseWeekStart(params.week);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const prevWeek = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nextWeek = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thisWeekStart = currentWeekStart();
  const isCurrentWeek = weekStart.getTime() === thisWeekStart.getTime();

  const entries = await prisma.timeEntry.findMany({
    where: {
      job: { orgId: user.orgId },
      clockInAt: { gte: weekStart, lt: weekEnd },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          hourlyCost: true,
          hourlyWage: true,
        },
      },
      job: { select: { id: true, customerName: true } },
    },
    orderBy: [{ userId: "asc" }, { clockInAt: "asc" }],
  });

  type EntrySummary = {
    id: string;
    clockInAt: string;
    clockOutAt: string | null;
    totalMinutes: number | null;
    laborCost: number;
    jobId: string;
    jobCustomer: string;
    isActive: boolean;
  };
  type UserGroup = {
    userId: string;
    userName: string;
    userRole: string;
    hourlyWage: number | null;
    totalMinutes: number;
    totalLaborCost: number;
    totalWagesOwed: number;
    totalOverheadKept: number;
    completedEntryCount: number;
    activeEntryCount: number;
    entries: EntrySummary[];
  };

  const groupMap = new Map<string, UserGroup>();
  for (const e of entries) {
    const isActive = e.clockOutAt === null;
    const laborCost = isActive ? 0 : parseLaborCostFromNotes(e.notes);
    const mins = e.totalMinutes || 0;

    // Live wage calc: use hourlyWage if set, else fall back to hourlyCost
    const wageRate = e.user.hourlyWage
      ? Number(e.user.hourlyWage)
      : e.user.hourlyCost
      ? Number(e.user.hourlyCost)
      : 0;
    const wageOwed = isActive
      ? 0
      : Math.round((mins / 60) * wageRate * 100) / 100;
    const overheadKept = isActive
      ? 0
      : Math.round((laborCost - wageOwed) * 100) / 100;

    let g = groupMap.get(e.userId);
    if (!g) {
      g = {
        userId: e.userId,
        userName: e.user.name,
        userRole: e.user.role,
        hourlyWage: e.user.hourlyWage ? Number(e.user.hourlyWage) : null,
        totalMinutes: 0,
        totalLaborCost: 0,
        totalWagesOwed: 0,
        totalOverheadKept: 0,
        completedEntryCount: 0,
        activeEntryCount: 0,
        entries: [],
      };
      groupMap.set(e.userId, g);
    }
    if (!isActive) {
      g.totalMinutes += mins;
      g.totalLaborCost += laborCost;
      g.totalWagesOwed += wageOwed;
      g.totalOverheadKept += overheadKept;
      g.completedEntryCount += 1;
    } else {
      g.activeEntryCount += 1;
    }
    g.entries.push({
      id: e.id,
      clockInAt: e.clockInAt.toISOString(),
      clockOutAt: e.clockOutAt ? e.clockOutAt.toISOString() : null,
      totalMinutes: e.totalMinutes,
      laborCost,
      jobId: e.job.id,
      jobCustomer: e.job.customerName,
      isActive,
    });
  }

  const groups = Array.from(groupMap.values()).sort((a, b) =>
    a.userName.localeCompare(b.userName)
  );

  const totalHoursAll = groups.reduce((s, g) => s + g.totalMinutes, 0) / 60;
  const totalChargedAll = groups.reduce((s, g) => s + g.totalLaborCost, 0);
  const totalWagesAll = groups.reduce((s, g) => s + g.totalWagesOwed, 0);
  const totalOverheadAll = groups.reduce((s, g) => s + g.totalOverheadKept, 0);

  const isOwner = user.role === "owner";
  const marginViewLocked = (user as any).marginViewLocked === true;
  const canSeeMoney = isOwner || !marginViewLocked;

  // Detect techs missing wage data so we can warn
  const missingWageCount = groups.filter((g) => g.hourlyWage === null).length;

  const weekRange = formatWeekRange(weekStart, weekEnd);
  const weekParam = toDateParam(weekStart);
  const prevParam = toDateParam(prevWeek);
  const nextParam = toDateParam(nextWeek);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Timesheets</h1>
          <p className="text-sm text-slate-500 mt-1">
            Hours and pay by technician, by week. Tap a tech to see their entries.
          </p>
        </div>
        <ExportButton weekParam={weekParam} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-2 flex-wrap">
        <Link
          href={"/tm/admin/timesheets?week=" + prevParam}
          className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg"
        >
          ← Previous
        </Link>
        <div className="text-center">
          <div className="text-sm font-semibold text-slate-900">{weekRange}</div>
          {!isCurrentWeek && (
            <Link
              href="/tm/admin/timesheets"
              className="text-xs text-brand-600 hover:underline"
            >
              Jump to this week
            </Link>
          )}
        </div>
        <Link
          href={"/tm/admin/timesheets?week=" + nextParam}
          className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg"
        >
          Next →
        </Link>
      </div>

      {canSeeMoney && missingWageCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
          ⚠️ {missingWageCount} {missingWageCount === 1 ? "tech is" : "techs are"} missing an Hourly Wage. For
          those people, wages are shown using their Hourly Cost (no overhead split).{" "}
          <Link href="/tm/admin/users" className="underline font-medium">
            Set wages on Employees →
          </Link>
        </div>
      )}

      {groups.length > 0 && canSeeMoney && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="Total Hours" value={totalHoursAll.toFixed(1) + "h"} />
          <SummaryCard
            label="Charged to Jobs"
            value={"$" + totalChargedAll.toFixed(2)}
            color="text-slate-900"
          />
          <SummaryCard
            label="Wages Owed"
            value={"$" + totalWagesAll.toFixed(2)}
            color="text-blue-700"
          />
          <SummaryCard
            label="Overhead Kept"
            value={"$" + totalOverheadAll.toFixed(2)}
            color="text-emerald-700"
          />
        </div>
      )}

      {groups.length > 0 && !canSeeMoney && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SummaryCard label="Technicians" value={String(groups.length)} />
          <SummaryCard label="Total Hours" value={totalHoursAll.toFixed(1) + "h"} />
        </div>
      )}

      {groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">No time entries this week.</p>
        </div>
      ) : (
        <>
          {/* Mobile: card stack */}
          <div className="md:hidden space-y-2">
            {groups.map((g) => (
              <TimesheetRow key={g.userId} group={g} canSeeMoney={canSeeMoney} />
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3 w-10"></th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">
                    Technician
                  </th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">
                    Hours
                  </th>
                  {canSeeMoney && (
                    <>
                      <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">
                        Charged
                      </th>
                      <th className="text-right text-xs font-medium text-blue-700 uppercase tracking-wide px-5 py-3">
                        Wages Owed
                      </th>
                      <th className="text-right text-xs font-medium text-emerald-700 uppercase tracking-wide px-5 py-3">
                        Overhead
                      </th>
                    </>
                  )}
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">
                    Entries
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {groups.map((g) => (
                  <TimesheetRow key={g.userId} group={g} canSeeMoney={canSeeMoney} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </div>
      <div
        className={
          "text-2xl font-bold mt-1 " + (color || "text-slate-900")
        }
      >
        {value}
      </div>
    </div>
  );
}
