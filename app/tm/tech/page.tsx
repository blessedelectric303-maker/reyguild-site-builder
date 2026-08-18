import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function TechDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeTimeEntry = await prisma.timeEntry.findFirst({
    where: { userId: user.id, clockOutAt: null },
    include: { job: { select: { id: true, customerName: true, jobAddress: true } } },
  });

  const assignments = await prisma.jobAssignment.findMany({
    where: {
      userId: user.id,
      job: {
        orgId: user.orgId,
        status: { notIn: ["completed", "cancelled", "archived"] },
      },
    },
    include: {
      job: {
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          jobAddress: true,
          scheduledStart: true,
          status: true,
        },
      },
    },
    orderBy: [{ job: { scheduledStart: "asc" } }],
  });

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const todayJobs: typeof assignments = [];
  const upcomingJobs: typeof assignments = [];
  const unscheduledJobs: typeof assignments = [];

  for (const a of assignments) {
    if (!a.job.scheduledStart) {
      unscheduledJobs.push(a);
    } else if (a.job.scheduledStart >= todayStart && a.job.scheduledStart <= todayEnd) {
      todayJobs.push(a);
    } else if (a.job.scheduledStart > todayEnd) {
      upcomingJobs.push(a);
    } else {
      unscheduledJobs.push(a);
    }
  }

  const statusLabels: Record<string, string> = {
    scheduled: "Scheduled",
    on_the_way: "On the way",
    arrived: "Arrived",
    in_progress: "In progress",
  };

  const statusColors: Record<string, string> = {
    scheduled: "bg-slate-100 text-slate-700",
    on_the_way: "bg-amber-100 text-amber-800",
    arrived: "bg-blue-100 text-blue-800",
    in_progress: "bg-emerald-100 text-emerald-800",
  };

  function JobCard({ job }: { job: (typeof assignments)[number] }) {
    return (
      <Link
        href={"/tm/tech/jobs/" + job.job.id}
        className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-brand-400"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-900">{job.job.customerName}</div>
            <div className="text-sm text-slate-600 mt-1">{job.job.jobAddress}</div>
            {job.job.scheduledStart && (
              <div className="text-xs text-slate-500 mt-2">
                {new Date(job.job.scheduledStart).toLocaleString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            )}
          </div>
          <span
            className={
              "inline-block text-xs font-medium px-2 py-0.5 rounded shrink-0 " +
              (statusColors[job.job.status] || "bg-slate-100 text-slate-700")
            }
          >
            {statusLabels[job.job.status] || job.job.status}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-5">
      {activeTimeEntry && (
        <Link
          href={"/tm/tech/jobs/" + activeTimeEntry.job.id}
          className="block bg-emerald-600 text-white rounded-xl p-4 shadow-sm hover:bg-emerald-700"
        >
          <div className="text-xs uppercase tracking-wide opacity-80">Currently clocked in</div>
          <div className="font-bold text-lg mt-1">{activeTimeEntry.job.customerName}</div>
          <div className="text-sm opacity-90">{activeTimeEntry.job.jobAddress}</div>
          <div className="text-xs mt-2 opacity-80">
            Since {new Date(activeTimeEntry.clockInAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </div>
        </Link>
      )}

      {assignments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-500">No jobs assigned yet.</p>
          <p className="text-xs text-slate-400 mt-1">Your dispatcher will assign jobs here.</p>
        </div>
      ) : (
        <>
          {todayJobs.length > 0 && (
            <div>
              <h1 className="text-xl font-bold text-slate-900 mb-2">Today</h1>
              <ul className="space-y-3">
                {todayJobs.map((a) => (
                  <li key={a.id}>
                    <JobCard job={a} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {upcomingJobs.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-slate-900 mb-2">Upcoming</h2>
              <ul className="space-y-2">
                {upcomingJobs.map((a) => (
                  <li key={a.id}>
                    <JobCard job={a} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {unscheduledJobs.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-slate-900 mb-2">Other Open Jobs</h2>
              <ul className="space-y-2">
                {unscheduledJobs.map((a) => (
                  <li key={a.id}>
                    <JobCard job={a} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
