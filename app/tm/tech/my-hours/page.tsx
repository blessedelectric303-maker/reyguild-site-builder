import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TZ = "America/Denver";

// Sunday-start week, matching the admin Timesheets convention.
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
  const norm = new Date(Date.UTC(year, month - 1, day - dow, 12, 0, 0));
  const ny = norm.getUTCFullYear();
  const nm = norm.getUTCMonth() + 1;
  const nd = norm.getUTCDate();
  const offset = getDenverOffsetHours(norm);
  return new Date(Date.UTC(ny, nm - 1, nd, offset, 0, 0));
}

function parseWeekStart(weekParam: string | undefined): Date {
  if (weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)) {
    const [y, m, d] = weekParam.split("-").map(Number);
    const utc = new Date(Date.UTC(y, m - 1, d, 7, 0, 0));
    const offset = getDenverOffsetHours(utc);
    return new Date(Date.UTC(y, m - 1, d, offset, 0, 0));
  }
  return currentWeekStart();
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

function getDenverDayLabel(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

function getDenverDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export default async function MyHoursPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const weekStart = parseWeekStart(params.week);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thisWeekStart = currentWeekStart();
  const isCurrentWeek = weekStart.getTime() === thisWeekStart.getTime();

  // Limit how far back the tech can go (3 weeks back = up to 4 weeks visible incl current)
  const earliestAllowed = new Date(thisWeekStart.getTime() - 3 * 7 * 24 * 60 * 60 * 1000);
  const prevWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nextWeekStart = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const canGoBack = prevWeekStart.getTime() >= earliestAllowed.getTime();
  const canGoForward = !isCurrentWeek;

  // Fetch this week's entries for this user (completed only — active entries don't have hours yet)
  const weekEntries = await prisma.timeEntry.findMany({
    where: {
      userId: user.id,
      clockInAt: { gte: weekStart, lt: weekEnd },
      clockOutAt: { not: null },
    },
    include: { job: { select: { id: true, customerName: true } } },
    orderBy: { clockInAt: "asc" },
  });

  // Group entries by day (Denver-time date key) and by job
  type DayBucket = {
    dateKey: string;
    label: string;
    totalMinutes: number;
    jobs: Map<string, { jobId: string; jobName: string; minutes: number }>;
  };
  const dayBuckets = new Map<string, DayBucket>();

  // Pre-fill all 7 days so empty days still render
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
    const dateKey = getDenverDateKey(dayStart);
    dayBuckets.set(dateKey, {
      dateKey,
      label: getDenverDayLabel(dayStart),
      totalMinutes: 0,
      jobs: new Map(),
    });
  }

  for (const e of weekEntries) {
    const dateKey = getDenverDateKey(e.clockInAt);
    const bucket = dayBuckets.get(dateKey);
    if (!bucket) continue;
    const mins = e.totalMinutes || 0;
    bucket.totalMinutes += mins;
    const existing = bucket.jobs.get(e.job.id);
    if (existing) {
      existing.minutes += mins;
    } else {
      bucket.jobs.set(e.job.id, {
        jobId: e.job.id,
        jobName: e.job.customerName,
        minutes: mins,
      });
    }
  }

  const days = Array.from(dayBuckets.values());
  const weekTotalMinutes = days.reduce((s, d) => s + d.totalMinutes, 0);
  const weekTotalHours = weekTotalMinutes / 60;

  // All-time total hours for this user (completed entries only)
  const allTimeAgg = await prisma.timeEntry.aggregate({
    where: { userId: user.id, clockOutAt: { not: null } },
    _sum: { totalMinutes: true },
  });
  const allTimeMinutes = allTimeAgg._sum.totalMinutes || 0;
  const allTimeHours = allTimeMinutes / 60;

  // Hire date = earliest clock-in for this user (proxy — we don't store hireDate)
  const firstEntry = await prisma.timeEntry.findFirst({
    where: { userId: user.id },
    orderBy: { clockInAt: "asc" },
    select: { clockInAt: true },
  });
  const firstDateLabel = firstEntry
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(firstEntry.clockInAt)
    : null;

  const weekRange = formatWeekRange(weekStart, weekEnd);
  const prevParam = toDateParam(prevWeekStart);
  const nextParam = toDateParam(nextWeekStart);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">My Hours</h1>

      {/* Week navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-2">
        {canGoBack ? (
          <Link
            href={"/tm/tech/my-hours?week=" + prevParam}
            className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg"
          >
            ← Prev
          </Link>
        ) : (
          <span className="text-sm bg-slate-50 text-slate-400 font-medium px-3 py-1.5 rounded-lg">
            ← Prev
          </span>
        )}
        <div className="text-center min-w-0 flex-1 px-2">
          <div className="text-sm font-semibold text-slate-900 truncate">{weekRange}</div>
          {!isCurrentWeek && (
            <Link href="/tm/tech/my-hours" className="text-xs text-brand-600 hover:underline">
              Jump to this week
            </Link>
          )}
        </div>
        {canGoForward ? (
          <Link
            href={"/tm/tech/my-hours?week=" + nextParam}
            className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg"
          >
            Next →
          </Link>
        ) : (
          <span className="text-sm bg-slate-50 text-slate-400 font-medium px-3 py-1.5 rounded-lg">
            Next →
          </span>
        )}
      </div>

      {/* Week total */}
      <div className="bg-brand-600 text-white rounded-xl p-5 text-center">
        <div className="text-xs uppercase tracking-wide opacity-80">Week total</div>
        <div className="text-4xl font-bold mt-1">{weekTotalHours.toFixed(1)}h</div>
        {weekTotalMinutes === 0 && (
          <div className="text-sm opacity-80 mt-2">No hours logged this week yet.</div>
        )}
      </div>

      {/* Daily breakdown */}
      <div className="space-y-2">
        {days.map((day) => {
          const dayHours = day.totalMinutes / 60;
          const jobsList = Array.from(day.jobs.values());
          return (
            <div
              key={day.dateKey}
              className="bg-white rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900">{day.label}</div>
                <div className="text-sm font-semibold text-slate-900">
                  {day.totalMinutes === 0 ? "—" : dayHours.toFixed(1) + "h"}
                </div>
              </div>
              {jobsList.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm">
                  {jobsList.map((j) => (
                    <li
                      key={j.jobId}
                      className="flex items-center justify-between text-slate-700"
                    >
                      <span className="truncate pr-2">{j.jobName}</span>
                      <span className="shrink-0 text-slate-600">
                        {(j.minutes / 60).toFixed(1)}h
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* All-time total */}
      <div className="bg-slate-100 rounded-xl border border-slate-200 p-4 text-center">
        <div className="text-xs uppercase tracking-wide text-slate-500">Total since hire</div>
        <div className="text-2xl font-bold text-slate-900 mt-1">{allTimeHours.toFixed(1)}h</div>
        {firstDateLabel && (
          <div className="text-xs text-slate-500 mt-1">First clock-in: {firstDateLabel}</div>
        )}
      </div>
    </div>
  );
}
