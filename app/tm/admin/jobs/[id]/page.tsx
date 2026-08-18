import { prisma } from "@/lib/prisma";
import { getCurrentUser, ADMIN_ROLES, ROLES } from "@/lib/auth";
import { getPhotoSignedUrl } from "@/lib/supabase-storage";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import PurchaseActions from "./PurchaseActions";
import OtherCostActions from "./OtherCostActions";
import JobActions from "./JobActions";
import TimeEntryActions from "./TimeEntryActions";
import AssignmentRateEditor from "./AssignmentRateEditor";
import SalePriceEditor from "./SalePriceEditor";
import JobInfoEditor from "./JobInfoEditor";

export const dynamic = "force-dynamic";

function extractLaborCost(notes: string | null): number {
  if (!notes) return 0;
  const m = notes.match(/\[laborCost=([\d.]+)\]/);
  if (!m) return 0;
  const n = Number(m[1]);
  return isNaN(n) ? 0 : n;
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");
  if (!ADMIN_ROLES.includes(actor.role as any)) redirect("/tm/admin");

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      org: { select: { costAlertThresholdPct: true } },
      assignments: {
        include: { user: { select: { id: true, name: true, phone: true, hourlyCost: true } } },
      },
      timeEntries: {
        orderBy: { clockInAt: "desc" },
        include: { user: { select: { id: true, name: true, hourlyCost: true } } },
      },
      materialPurchases: {
        orderBy: { createdAt: "desc" },
        include: {
          purchasedBy: { select: { id: true, name: true } },
          photos: { select: { id: true, imageUrl: true } },
        },
      },
      otherJobCosts: {
        orderBy: { createdAt: "desc" },
        include: {
          loggedBy: { select: { id: true, name: true } },
          photos: { select: { id: true, imageUrl: true } },
        },
      },
      _count: {
        select: { photos: true, materialRequests: true, timeRequests: true },
      },
      createdBy: { select: { name: true } },
    },
  });

  if (!job || job.orgId !== actor.orgId) notFound();

  const purchasesWithUrls = await Promise.all(
    job.materialPurchases.map(async (p) => {
      const receiptUrl = p.photos[0]?.imageUrl
        ? await getPhotoSignedUrl("job-photos", p.photos[0].imageUrl, 3600)
        : null;
      return {
        id: p.id,
        vendor: p.vendor,
        invoiceNumber: p.invoiceNumber,
        purchaseDate: p.purchaseDate.toISOString(),
        notes: p.notes,
        amount: Number(p.totalAmount),
        purchasedBy: p.purchasedBy.name,
        receiptUrl,
      };
    })
  );

  const totalMinutesAll = job.timeEntries.reduce(
    (sum, e) => sum + (e.totalMinutes || 0),
    0
  );
  const totalHours = (totalMinutesAll / 60).toFixed(1);

  let totalLabor = 0;
  for (const entry of job.timeEntries) {
    if (entry.clockOutAt) {
      totalLabor += extractLaborCost(entry.notes);
    }
  }

  const totalMaterialCost = purchasesWithUrls.reduce((sum, p) => sum + p.amount, 0);

  const otherCostsWithUrls = await Promise.all(
    job.otherJobCosts.map(async (c) => {
      const receiptUrl = c.photos[0]?.imageUrl
        ? await getPhotoSignedUrl("job-photos", c.photos[0].imageUrl, 3600)
        : null;
      return {
        id: c.id,
        description: c.description,
        amount: Number(c.amount),
        notes: c.notes,
        loggedBy: c.loggedBy.name,
        createdAt: c.createdAt.toISOString(),
        receiptUrl,
      };
    })
  );
  const totalOtherCost = otherCostsWithUrls.reduce((sum, c) => sum + c.amount, 0);

  const salePrice = job.salePrice ? Number(job.salePrice) : 0;
  const totalCost = totalLabor + totalMaterialCost + totalOtherCost;
  const runningProfit = salePrice - totalCost;
  const profitMargin = salePrice > 0 ? (runningProfit / salePrice) * 100 : 0;
  const costRatio = salePrice > 0 ? (totalCost / salePrice) * 100 : 0;
  const threshold = job.org.costAlertThresholdPct || 60;
  const overThreshold = salePrice > 0 && costRatio >= threshold;

  const isOwner = actor.role === ROLES.OWNER;
  const isOwnerOrAdmin = isOwner || actor.role === ROLES.ADMIN;
  const techWithPower =
    actor.role === ROLES.TECHNICIAN && (actor as any).canLogMaterialPurchases === true;
  const canLog = isOwnerOrAdmin || techWithPower;
  const marginViewLocked = (actor as any).marginViewLocked === true;
  const canSeeMargin = isOwner || (isOwnerOrAdmin && !marginViewLocked);
  const canEditPrice = isOwnerOrAdmin;
  const isArchived = job.status === "archived";

  const statusLabels: Record<string, string> = {
    scheduled: "Scheduled",
    on_the_way: "On the way",
    arrived: "Arrived",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
    archived: "Archived",
  };

  const statusColors: Record<string, string> = {
    scheduled: "bg-slate-100 text-slate-700",
    on_the_way: "bg-amber-100 text-amber-800",
    arrived: "bg-blue-100 text-blue-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-700",
    archived: "bg-slate-200 text-slate-600",
  };

  const statusClass = statusColors[job.status] || "bg-slate-100 text-slate-700";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/tm/admin/jobs" className="text-xs text-brand-600 hover:underline">
          ← Back to jobs
        </Link>
        <div className="flex items-start justify-between mt-2 gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">{job.customerName}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Created by {job.createdBy.name} on{" "}
              {new Date(job.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={"inline-block text-xs font-medium px-2.5 py-1 rounded " + statusClass}
            >
              {statusLabels[job.status] || job.status}
            </span>
          </div>
        </div>
        <div className="mt-3">
          <JobActions jobId={job.id} status={job.status} isOwner={isOwner} />
        </div>
      </div>

      {isArchived && (
        <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 text-sm text-slate-700">
          This job is <strong>archived</strong>. {isOwner ? "You can restore or permanently delete it." : "Only the Owner can restore or permanently delete it."}
        </div>
      )}

      {overThreshold && canSeeMargin && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-900">
                Cost Alert: {costRatio.toFixed(1)}% of sale price
              </h3>
              <p className="text-xs text-red-800 mt-1">
                Total costs (${totalCost.toFixed(2)}) have crossed the {threshold}% threshold of
                the sale price (${salePrice.toFixed(2)}).
                {job.costAlertSentAt
                  ? " Alert was recorded " +
                    new Date(job.costAlertSentAt).toLocaleString() +
                    "."
                  : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {canSeeMargin && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-1">
            Financial Summary
          </h2>
          {salePrice === 0 ? (
            <div>
              <p className="text-sm text-amber-700">
                No sale price set. Profit cannot be calculated.
              </p>
              {canEditPrice && !isArchived && (
                <SalePriceEditor jobId={job.id} currentPrice={0} />
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <MoneyStat label="Sale Price" value={salePrice} color="text-slate-900" />
                <MoneyStat label="Labor" value={totalLabor} color="text-slate-700" />
                <MoneyStat label="Materials" value={totalMaterialCost} color="text-slate-700" />
                <MoneyStat label="Other Costs" value={totalOtherCost} color="text-slate-700" />
                <MoneyStat
                  label="Running Profit"
                  value={runningProfit}
                  color={
                    runningProfit < 0
                      ? "text-red-700"
                      : runningProfit < salePrice * 0.2
                      ? "text-amber-700"
                      : "text-emerald-700"
                  }
                  subtext={profitMargin.toFixed(1) + "% margin"}
                />
              </div>
              {canEditPrice && !isArchived && (
                <SalePriceEditor jobId={job.id} currentPrice={salePrice} />
              )}
            </>
          )}
        </div>
      )}

      {isOwnerOrAdmin && !isArchived && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <JobInfoEditor
            jobId={job.id}
            initial={{
              customerName: job.customerName,
              customerPhone: job.customerPhone,
              customerEmail: job.customerEmail,
              jobAddress: job.jobAddress,
              lat: job.lat !== null ? Number(job.lat) : null,
              lng: job.lng !== null ? Number(job.lng) : null,
              scheduledStart: job.scheduledStart ? job.scheduledStart.toISOString() : null,
              scheduledEnd: job.scheduledEnd ? job.scheduledEnd.toISOString() : null,
              jobDescription: job.jobDescription,
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Customer">
          <Field label="Name">{job.customerName}</Field>
          {job.customerPhone && <Field label="Phone">{job.customerPhone}</Field>}
          {job.customerEmail && <Field label="Email">{job.customerEmail}</Field>}
        </Card>

        <Card title="Job Site">
          <Field label="Address">{job.jobAddress}</Field>
          {job.lat !== null && job.lng !== null && (
            <Field label="Coordinates">
              <span className="font-mono text-xs">
                {job.lat.toFixed(5)}, {job.lng.toFixed(5)}
              </span>
            </Field>
          )}
          <Field label="Geofence">{job.geofenceMiles} mile radius</Field>
        </Card>

        <Card title="Schedule">
          <Field label="Start">
            {job.scheduledStart
              ? new Date(job.scheduledStart).toLocaleString()
              : "Not scheduled"}
          </Field>
          {job.scheduledEnd && (
            <Field label="End">{new Date(job.scheduledEnd).toLocaleString()}</Field>
          )}
        </Card>

        <Card title="At a Glance">
          <Field label="Total hours logged">{totalHours}h</Field>
          <Field label="Photos">{job._count.photos}</Field>
          <Field label="Material requests">{job._count.materialRequests}</Field>
          {canSeeMargin && (
            <Field label="Materials">${totalMaterialCost.toFixed(2)}</Field>
          )}
        </Card>
      </div>

      {job.jobDescription && (
        <Card title="Job Description">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{job.jobDescription}</p>
        </Card>
      )}

      <Card title="Assigned Technicians">
        {job.assignments.length === 0 ? (
          <p className="text-sm text-slate-500">No technicians assigned yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 -my-3">
            {job.assignments.map((a) => (
              <li key={a.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900">{a.user.name}</div>
                    {a.user.phone && (
                      <div className="text-xs text-slate-500">{a.user.phone}</div>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 shrink-0">
                    Assigned {new Date(a.assignedAt).toLocaleDateString()}
                  </div>
                </div>
                {canSeeMargin && (
                  <AssignmentRateEditor
                    assignmentId={a.id}
                    techName={a.user.name}
                    defaultRate={a.user.hourlyCost ? Number(a.user.hourlyCost) : null}
                    currentOverride={a.hourlyRateOverride ? Number(a.hourlyRateOverride) : null}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 className="text-sm font-semibold text-slate-900">Material Purchases</h2>
          {canLog && !isArchived && (
            <Link
              href={"/tm/admin/jobs/" + job.id + "/log-purchase"}
              className="text-xs bg-brand-600 hover:bg-brand-700 text-white font-medium px-3 py-1.5 rounded-lg"
            >
              + Log Purchase
            </Link>
          )}
        </div>
        {purchasesWithUrls.length === 0 ? (
          <p className="text-sm text-slate-500">No purchases yet.</p>
        ) : (
          <ul className="space-y-3 -my-2">
            {purchasesWithUrls.map((p) => (
              <li key={p.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 min-w-0">
                    {p.receiptUrl ? (
                      <Link
                        href={p.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 w-16 h-16 rounded overflow-hidden bg-slate-100 block"
                      >
                        <img
                          src={p.receiptUrl}
                          alt="Receipt"
                          className="w-full h-full object-cover"
                        />
                      </Link>
                    ) : null}
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">
                        ${p.amount.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {p.vendor || "No vendor"}
                        {p.invoiceNumber ? " · #" + p.invoiceNumber : ""}
                        {" · " + new Date(p.purchaseDate).toLocaleDateString()}
                        {" · by " + p.purchasedBy}
                      </div>
                      {p.notes && <div className="text-xs text-slate-600 mt-1">{p.notes}</div>}
                    </div>
                  </div>
                  {isOwnerOrAdmin && (
                    <PurchaseActions
                      purchaseId={p.id}
                      isDraft={false}
                      amount={p.amount}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 className="text-sm font-semibold text-slate-900">Other Job Costs</h2>
          {canLog && !isArchived && (
            <Link
              href={"/tm/admin/jobs/" + job.id + "/log-other-cost"}
              className="text-xs bg-brand-600 hover:bg-brand-700 text-white font-medium px-3 py-1.5 rounded-lg"
            >
              + Log Cost
            </Link>
          )}
        </div>
        {otherCostsWithUrls.length === 0 ? (
          <p className="text-sm text-slate-500">No other costs yet.</p>
        ) : (
          <ul className="space-y-3 -my-2">
            {otherCostsWithUrls.map((c) => (
              <li key={c.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 min-w-0">
                    {c.receiptUrl ? (
                      <Link
                        href={c.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 w-16 h-16 rounded overflow-hidden bg-slate-100 block"
                      >
                        <img
                          src={c.receiptUrl}
                          alt="Receipt"
                          className="w-full h-full object-cover"
                        />
                      </Link>
                    ) : null}
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">
                        ${c.amount.toFixed(2)}
                      </div>
                      <div className="text-sm text-slate-700 mt-0.5">
                        {c.description}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {new Date(c.createdAt).toLocaleDateString()}
                        {" · by " + c.loggedBy}
                      </div>
                      {c.notes && <div className="text-xs text-slate-600 mt-1">{c.notes}</div>}
                    </div>
                  </div>
                  {isOwnerOrAdmin && (
                    <OtherCostActions
                      costId={c.id}
                      description={c.description}
                      amount={c.amount}
                      notes={c.notes}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Card title="Time Entries">
        <div id="time-entries" />
        {job.timeEntries.length === 0 ? (
          <p className="text-sm text-slate-500">No time entries yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 -my-3">
            {job.timeEntries.map((entry) => {
              const entryLabor = entry.clockOutAt ? extractLaborCost(entry.notes) : 0;
              const isActive = !entry.clockOutAt;
              const hoursOpen = isActive
                ? (Date.now() - new Date(entry.clockInAt).getTime()) / 3600000
                : 0;
              const isStuck = isActive && hoursOpen >= 12;
              return (
                <li
                  key={entry.id}
                  className={
                    "py-3 " + (isStuck ? "-mx-3 px-3 bg-red-50 border-l-4 border-red-400" : "")
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900">
                        {entry.user.name}
                        {isStuck && (
                          <span className="ml-2 text-xs text-red-700 font-semibold">
                            ⚠️ {hoursOpen.toFixed(1)}h
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(entry.clockInAt).toLocaleString()}
                        {entry.clockOutAt
                          ? " ended " + new Date(entry.clockOutAt).toLocaleTimeString()
                          : " (active)"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-medium text-slate-900">
                        {entry.totalMinutes
                          ? (entry.totalMinutes / 60).toFixed(1) + "h"
                          : "Active"}
                      </div>
                      {canSeeMargin && entryLabor > 0 && (
                        <div className="text-xs text-slate-500">${entryLabor.toFixed(2)}</div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <TimeEntryActions
                      entryId={entry.id}
                      clockInAt={entry.clockInAt.toISOString()}
                      clockOutAt={entry.clockOutAt ? entry.clockOutAt.toISOString() : null}
                      userName={entry.user.name}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function MoneyStat({
  label,
  value,
  color,
  subtext,
}: {
  label: string;
  value: number;
  color: string;
  subtext?: string;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={"text-xl font-bold mt-0.5 " + color}>${value.toFixed(2)}</div>
      {subtext && <div className="text-xs text-slate-500 mt-0.5">{subtext}</div>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
      <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-1">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="text-slate-500 w-44 shrink-0">{label}:</span>
      <span className="text-slate-900">{children}</span>
    </div>
  );
}
