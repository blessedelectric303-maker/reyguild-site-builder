import { prisma } from "@/lib/prisma";
import { getCurrentUser, ADMIN_ROLES, ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

// NOTE: This MUST stay in sync with extractLaborCost in admin/jobs/[id]/page.tsx.
// Labor cost is frozen into each time entry's notes at clock-out as [laborCost=NN.NN].
function extractLaborCost(notes: string | null): number {
  if (!notes) return 0;
  const m = notes.match(/\[laborCost=([\d.]+)\]/);
  if (!m) return 0;
  const n = Number(m[1]);
  return isNaN(n) ? 0 : n;
}

export default async function JobsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const filter = params.status || "active";

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!ADMIN_ROLES.includes(user.role as any)) {
    redirect("/tm/admin");
  }

  const isOwner = user.role === ROLES.OWNER;
  const marginViewLocked = (user as any).marginViewLocked === true;
  const canSeeMargin = isOwner || (!marginViewLocked && user.role === ROLES.ADMIN);

  const whereClause: any = { orgId: user.orgId };
  if (filter === "active") {
    whereClause.status = { not: "archived" };
  } else if (filter === "archived") {
    whereClause.status = "archived";
  }

  const [jobs, allJobs] = await Promise.all([
    prisma.job.findMany({
      where: whereClause,
      orderBy: [{ scheduledStart: "desc" }, { createdAt: "desc" }],
      include: {
        assignments: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: {
            timeEntries: true,
            photos: true,
          },
        },
      },
      take: 50,
    }),
    prisma.job.findMany({
      where: { orgId: user.orgId },
      select: { status: true },
    }),
  ]);

  const archivedCount = allJobs.filter((j) => j.status === "archived").length;
  const activeCount = allJobs.length - archivedCount;
  const totalCount = allJobs.length;

  // Archive financial summary — only computed on the Archived tab for margin-visible users.
  // Aggregates across ALL archived jobs in the org (not just the 50 shown).
  let archiveTotals: {
    labor: number;
    materials: number;
    other: number;
    profit: number;
    pricedJobs: number;
    unpricedJobs: number;
  } | null = null;

  if (filter === "archived" && canSeeMargin) {
    const archivedJobs = await prisma.job.findMany({
      where: { orgId: user.orgId, status: "archived" },
      select: {
        salePrice: true,
        timeEntries: { select: { notes: true, clockOutAt: true } },
        materialPurchases: { select: { totalAmount: true } },
        otherJobCosts: { select: { amount: true } },
      },
    });

    let labor = 0;
    let materials = 0;
    let other = 0;
    let profit = 0;
    let pricedJobs = 0;
    let unpricedJobs = 0;

    for (const j of archivedJobs) {
      let jobLabor = 0;
      for (const e of j.timeEntries) {
        if (e.clockOutAt) jobLabor += extractLaborCost(e.notes);
      }
      const jobMaterials = j.materialPurchases.reduce(
        (s, p) => s + Number(p.totalAmount),
        0
      );
      const jobOther = j.otherJobCosts.reduce((s, c) => s + Number(c.amount), 0);

      labor += jobLabor;
      materials += jobMaterials;
      other += jobOther;

      const sale = j.salePrice ? Number(j.salePrice) : 0;
      if (sale > 0) {
        pricedJobs += 1;
        profit += sale - (jobLabor + jobMaterials + jobOther);
      } else {
        unpricedJobs += 1;
      }
    }

    archiveTotals = { labor, materials, other, profit, pricedJobs, unpricedJobs };
  }

  const statusColors: Record<string, string> = {
    scheduled: "bg-slate-100 text-slate-700",
    on_the_way: "bg-amber-100 text-amber-800",
    arrived: "bg-blue-100 text-blue-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-700",
    archived: "bg-slate-200 text-slate-600",
  };

  const statusLabels: Record<string, string> = {
    scheduled: "Scheduled",
    on_the_way: "On the way",
    arrived: "Arrived",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
    archived: "Archived",
  };return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">Jobs</h1>
          <p className="text-sm text-slate-500 mt-1">
            {jobs.length} {jobs.length === 1 ? "job" : "jobs"} shown
          </p>
        </div>
        <Link
          href="/tm/admin/jobs/new"
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg shrink-0"
        >
          + New Job
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <FilterTab label="Active" status="active" count={activeCount} active={filter === "active"} />
        <FilterTab label="Archived" status="archived" count={archivedCount} active={filter === "archived"} />
        <FilterTab label="All" status="all" count={totalCount} active={filter === "all"} />
      </div>

      {archiveTotals && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-1">
            Archive Totals
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryStat label="Materials" value={archiveTotals.materials} color="text-slate-700" />
            <SummaryStat label="Other Costs" value={archiveTotals.other} color="text-slate-700" />
            <SummaryStat label="Labor" value={archiveTotals.labor} color="text-slate-700" />
            <SummaryStat
              label="Total Profit"
              value={archiveTotals.profit}
              color={archiveTotals.profit < 0 ? "text-red-700" : "text-emerald-700"}
            />
          </div>
          <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
            Across {archivedCount} archived {archivedCount === 1 ? "job" : "jobs"}.
            Profit is summed over the {archiveTotals.pricedJobs} with a sale price set.
            {archiveTotals.unpricedJobs > 0
              ? " " +
                archiveTotals.unpricedJobs +
                (archiveTotals.unpricedJobs === 1
                  ? " job has no sale price and is excluded from profit."
                  : " jobs have no sale price and are excluded from profit.")
              : ""}
          </p>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500 mb-4">
            {filter === "archived"
              ? "No archived jobs."
              : filter === "all"
              ? "No jobs yet."
              : "No active jobs."}
          </p>
          {filter !== "archived" && (
            <Link
              href="/tm/admin/jobs/new"
              className="inline-block bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              Create your first job
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="md:hidden space-y-2">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={"/tm/admin/jobs/" + job.id}
                className="block bg-white rounded-xl border border-slate-200 p-4 hover:bg-slate-50 active:bg-slate-100"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate">
                      {job.customerName}
                    </div>
                    {job.customerPhone && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {job.customerPhone}
                      </div>
                    )}
                  </div>
                  <span
                    className={
                      "inline-block text-xs font-medium px-2 py-0.5 rounded shrink-0 " +
                      (statusColors[job.status] || "bg-slate-100 text-slate-700")
                    }
                  >
                    {statusLabels[job.status] || job.status}
                  </span>
                </div>
                <div className="text-sm text-slate-600 mt-2 break-words">
                  {job.jobAddress}
                </div>
                <div className="flex items-center justify-between gap-2 mt-2 text-xs text-slate-500">
                  <span>
                    {job.scheduledStart
                      ? new Date(job.scheduledStart).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "Not scheduled"}
                  </span>
                  <span className="truncate ml-2">
                    {job.assignments.length === 0
                      ? "Unassigned"
                      : job.assignments.map((a) => a.user.name).join(", ")}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Customer</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Address</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Scheduled</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Techs</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">{job.customerName}</div>
                      {job.customerPhone && (
                        <div className="text-xs text-slate-500">{job.customerPhone}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600 max-w-xs truncate">
                      {job.jobAddress}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {job.scheduledStart
                        ? new Date(job.scheduledStart).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {job.assignments.length === 0 ? (
                        <span className="text-slate-400">Unassigned</span>
                      ) : (
                        job.assignments.map((a) => a.user.name).join(", ")
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          "inline-block text-xs font-medium px-2 py-0.5 rounded " +
                          (statusColors[job.status] || "bg-slate-100 text-slate-700")
                        }
                      >
                        {statusLabels[job.status] || job.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={"/tm/admin/jobs/" + job.id}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={"text-xl font-bold mt-0.5 " + color}>${value.toFixed(2)}</div>
    </div>
  );
}

function FilterTab({
  label,
  status,
  count,
  active,
}: {
  label: string;
  status: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={"/tm/admin/jobs?status=" + status}
      className={
        "px-3 py-1.5 text-sm rounded-lg border " +
        (active
          ? "bg-brand-600 text-white border-brand-600"
          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")
      }
    >
      {label} <span className="text-xs opacity-75">({count})</span>
    </Link>
  );
}
