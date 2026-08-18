import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import StuckClockInBanner from "./StuckClockInBanner";;

export default async function AdminHome() {
  const user = await getCurrentUser();
  if (!user) return null;

  const orgId = user.orgId;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [activeTimeEntries, todayJobs, pendingMaterials, pendingTimes, pendingLateNotices, orgInfo, techCount] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        clockOutAt: null,
        job: { orgId },
      },
      include: {
        user: { select: { id: true, name: true } },
        job: { select: { id: true, customerName: true, jobAddress: true } },
      },
      orderBy: { clockInAt: "desc" },
    }),
    prisma.job.findMany({
      where: {
        orgId,
        scheduledStart: { gte: todayStart },
      },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { scheduledStart: "asc" },
      take: 10,
    }),
    prisma.materialRequest.findMany({
      where: {
        status: "pending",
        job: { orgId },
      },
      include: {
        job: { select: { id: true, customerName: true } },
        requestedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.timeRequest.findMany({
      where: {
        status: "pending",
        job: { orgId },
      },
      include: {
        job: { select: { id: true, customerName: true } },
        requestedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
   prisma.lateNotice.findMany({
      where: {
        acknowledgedAt: null,
        user: { orgId },
      },
      include: {
        user: { select: { id: true, name: true } },
        job: { select: { id: true, customerName: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: 5,
    }),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        subscriptionStatus: true,
        trialEndsAt: true,
        createdAt: true,
      },
    }),
    prisma.user.count({
      where: { orgId, role: "technician", isActive: true },
    }),
  ]);

  const totalPendingRequests = pendingMaterials.length + pendingTimes.length;

  // Show welcome banner for new orgs with no techs yet
  const isOnTrial = orgInfo?.subscriptionStatus === "trial";
  const hasNoTechs = techCount === 0;
  const orgIsFresh = orgInfo?.createdAt
    ? Date.now() - new Date(orgInfo.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000
    : false;
  const showWelcome = isOnTrial && hasNoTechs && orgIsFresh;

  // Trial countdown banner
  const trialDaysLeft = orgInfo?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(orgInfo.trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;
  const showTrialCountdown = isOnTrial && trialDaysLeft !== null && trialDaysLeft <= 14;

return (
   <div className="space-y-8">
      <StuckClockInBanner orgId={orgId} />

      {showWelcome && (
        <div className="bg-brand-50 border-2 border-brand-300 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="text-2xl">👋</div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-brand-900">
                Welcome to <span className="text-gold-600">Rey</span><span className="text-brand-700">Guild</span>!
              </h2>
              <p className="text-sm text-brand-800 mt-1">
                You&apos;re on a 14-day free trial.
                {trialDaysLeft !== null ? " " + trialDaysLeft + " day" + (trialDaysLeft === 1 ? "" : "s") + " remaining." : ""}{" "}
                Start by adding your employees so they can clock in and out on jobs.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/tm/admin/users/new"
                  className="inline-block bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
                >
                  Add your first employee →
                </Link>
                <Link
                  href="/tm/admin/jobs/new"
                  className="inline-block bg-white hover:bg-slate-100 text-brand-700 text-sm font-medium px-4 py-2 rounded-lg border border-brand-300"
                >
                  Or create your first job
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showWelcome && showTrialCountdown && trialDaysLeft !== null && trialDaysLeft <= 7 && (
        <div className={"rounded-xl p-4 border-2 " + (trialDaysLeft <= 3 ? "bg-amber-50 border-amber-300" : "bg-slate-50 border-slate-300")}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {trialDaysLeft === 0
                  ? "Your trial ends today"
                  : trialDaysLeft + " day" + (trialDaysLeft === 1 ? "" : "s") + " left in your free trial"}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Set up billing soon to keep using ReyGuild after your trial ends.
              </div>
            </div>
            <span className="text-xs bg-white border border-slate-300 text-slate-500 font-medium px-3 py-1.5 rounded-lg">
              Billing setup coming soon
            </span>
          </div>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Currently Clocked In" value={activeTimeEntries.length} />
        <StatCard label="Jobs Scheduled Today" value={todayJobs.length} />
        <StatCard label="Pending Requests" value={totalPendingRequests} accent={totalPendingRequests > 0} />
        <StatCard label="Late / Absence Notices" value={pendingLateNotices.length} accent={pendingLateNotices.length > 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Live: Currently Clocked In" link="/tm/admin/timesheets" linkText="View all">
          {activeTimeEntries.length === 0 ? (
            <Empty text="No technicians clocked in right now." />
          ) : (
            <ul className="divide-y divide-slate-200">
              {activeTimeEntries.map((entry) => (
                <li key={entry.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">{entry.user.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {entry.job.customerName} · {entry.job.jobAddress}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">
                    Since {new Date(entry.clockInAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Today's Schedule" link="/tm/admin/jobs" linkText="All jobs">
          {todayJobs.length === 0 ? (
            <Empty text="No jobs scheduled for today." />
          ) : (
            <ul className="divide-y divide-slate-200">
              {todayJobs.map((job) => (
                <li key={job.id} className="py-3">
                  <Link href={`/tm/admin/jobs/${job.id}`} className="block hover:bg-slate-50 -mx-2 px-2 py-1 rounded">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">{job.customerName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{job.jobAddress}</div>
                        {job.assignments.length > 0 && (
                          <div className="text-xs text-slate-400 mt-1">
                            Assigned to {job.assignments.map((a) => a.user.name).join(", ")}
                          </div>
                        )}
                      </div>
                      {job.scheduledStart && (
                        <div className="text-xs text-slate-500 whitespace-nowrap">
                          {new Date(job.scheduledStart).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Pending Material Requests" link="/tm/admin/materials" linkText="Review all">
          {pendingMaterials.length === 0 ? (
            <Empty text="No pending material requests." />
          ) : (
            <ul className="divide-y divide-slate-200">
              {pendingMaterials.map((req) => (
                <li key={req.id} className="py-3">
                  <div className="font-medium text-slate-900">{req.itemName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Qty {req.qty}{req.unit ? ` ${req.unit}` : ""} · {req.job.customerName} · by {req.requestedBy.name}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Pending Time Requests" link="/tm/admin/timesheets" linkText="Review all">
          {pendingTimes.length === 0 ? (
            <Empty text="No pending time requests." />
          ) : (
            <ul className="divide-y divide-slate-200">
              {pendingTimes.map((req) => (
                <li key={req.id} className="py-3">
                  <div className="font-medium text-slate-900">+{Math.round(req.extraTimeMinutes / 60 * 10) / 10}h extra</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {req.job.customerName} · by {req.requestedBy.name}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 line-clamp-2">{req.reason}</div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={`bg-white rounded-xl border p-4 ${
        accent ? "border-amber-300 bg-amber-50" : "border-slate-200"
      }`}
    >
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-3xl font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function Section({
  title,
  link,
  linkText,
  children,
}: {
  title: string;
  link?: string;
  linkText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {link && (
          <Link href={link} className="text-xs text-brand-600 hover:underline">
            {linkText} →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-sm text-slate-500 py-2">{text}</div>;
}
