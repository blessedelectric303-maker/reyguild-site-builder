import { prisma } from "@/lib/prisma";
import { getCurrentUser, ROLES } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import ClockInPanel from "./ClockInPanel";
import MarkJobDoneButton from "./MarkJobDoneButton";
import JobChecklist from "@/components/JobChecklist";
import { createClient as createSupabase } from "@/utils/supabase/server";

export default async function TechJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== ROLES.TECHNICIAN) redirect("/tm/admin");

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      assignments: {
        where: { userId: user.id },
        select: { id: true },
      },
    },
  });

  if (!job || job.orgId !== user.orgId) {
    notFound();
  }

  if (job.assignments.length === 0) {
    redirect("/tm/tech");
  }

  const activeEntry = await prisma.timeEntry.findFirst({
    where: { userId: user.id, clockOutAt: null },
    select: { id: true, jobId: true, clockInAt: true },
  });

  const isClockedInHere = activeEntry?.jobId === job.id;
  const isClockedInElsewhere = activeEntry && activeEntry.jobId !== job.id;

  // Any tech still clocked in on THIS job blocks "Mark Job Done" (mirrors the server guard)
  const activeOnThisJob = await prisma.timeEntry.findFirst({
    where: { jobId: job.id, clockOutAt: null },
    select: { id: true },
  });

  // Most recent send-back from admin, and the most recent mark-done.
  // Show the send-back reason only if it's newer than the last mark-done —
  // i.e. the job is back in the tech's court and hasn't been re-submitted yet.
  const lastSendBack = await prisma.jobStatusUpdate.findFirst({
    where: { jobId: job.id, updateType: "sent_back_to_work" },
    orderBy: { createdAt: "desc" },
    select: { notes: true, createdAt: true },
  });
  const lastMarkDone = await prisma.jobStatusUpdate.findFirst({
    where: { jobId: job.id, updateType: "mark_done" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const showSendBack =
    !!lastSendBack &&
    (!lastMarkDone || lastSendBack.createdAt > lastMarkDone.createdAt) &&
    job.status !== "awaiting_invoice" &&
    job.status !== "completed";// Fetch this tech's material requests for this job
  const myRequests = await prisma.materialRequest.findMany({
    where: {
      jobId: job.id,
      requestedByUserId: user.id,
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch unlinked purchases for this job (purchases not tied to a specific request)
  // so techs see "FYI material was bought for this job, here's how to get it"
  const allPurchases = await prisma.materialPurchase.findMany({
    where: { jobId: job.id },
    include: {
      items: { select: { fromRequestId: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const unlinkedPurchases = allPurchases.filter(
    (p) => !p.items.some((i) => i.fromRequestId !== null)
  );

  // THE ARRIVAL AND COMPLETION CHECKLISTS.
  // Arrival appears once the tech has said he is there; completion appears
  // once he is working. Fails quiet - a company that has not loaded them sees
  // the job page exactly as it was.
  let arrival: any[] = [];
  let completion: any[] = [];
  try {
    const sb = await createSupabase();
    if (job.status === "arrived" || job.status === "in_progress") {
      const { data } = await sb
        .schema("suite")
        .rpc("job_checklist", {
          p_job: job.id,
          p_phase: "arrival",
          p_kind: job.jobType === "estimate" ? "estimate" : null,
        });
      arrival = data || [];
    }
    if (job.status === "in_progress") {
      const { data } = await sb
        .schema("suite")
        .rpc("job_checklist", {
          p_job: job.id,
          p_phase: "completion",
          p_kind: job.jobType === "estimate" ? "estimate" : null,
        });
      completion = data || [];
    }
  } catch (e) {
    arrival = [];
    completion = [];
  }

  const statusLabels: Record<string, string> = {
    scheduled: "Scheduled",
    on_the_way: "On the way",
    arrived: "Arrived",
    in_progress: "In progress",
    awaiting_invoice: "Awaiting invoice",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <div className="space-y-4">
      <div>
        <Link href="/tm/tech" className="text-xs text-brand-600 hover:underline">
          ← Back
        </Link>
      </div>

      {showSendBack && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-xl">↩️</div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-amber-900">
                Sent back by the office — needs more work
              </h2>
              {lastSendBack?.notes ? (
                <p className="text-sm text-amber-900 mt-1 whitespace-pre-wrap break-words">
                  {lastSendBack.notes}
                </p>
              ) : (
                <p className="text-sm text-amber-800 mt-1 italic">
                  No reason was given. Check with the office.
                </p>
              )}
              <p className="text-xs text-amber-700 mt-2">
                Fix the above, then clock in, finish up, and mark the job done again.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Customer
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              {job.customerName}
            </h1>
          </div>
          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
            {statusLabels[job.status] || job.status}
          </span>
        </div>

        <div className="pt-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Address
          </div>
          <div className="text-sm text-slate-900 mt-0.5">{job.jobAddress}</div>
        </div>

        {job.scheduledStart && (
          <div className="pt-2">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Scheduled
            </div>
            <div className="text-sm text-slate-900 mt-0.5">
              {new Date(job.scheduledStart).toLocaleString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
          </div>
        )}

        {job.customerPhone && (
          <div className="pt-2">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Customer Phone
            </div>
            <Link
              href={"tel:" + job.customerPhone}
              className="text-sm text-brand-600 hover:underline mt-0.5 block"
            >
              {job.customerPhone}
            </Link>
          </div>
        )}
      </div>{job.jobDescription && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
            Job Description
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">
            {job.jobDescription}
          </p>
        </div>
      )}

      <ClockInPanel
        jobId={job.id}
        jobLat={job.lat}
        jobLng={job.lng}
        geofenceMiles={job.geofenceMiles}
        isClockedInHere={isClockedInHere}
        clockInAt={activeEntry?.clockInAt?.toISOString() || null}
        isClockedInElsewhere={!!isClockedInElsewhere}
        currentStatus={job.status}
      />

      {arrival.length > 0 && (
        <JobChecklist
          jobId={job.id}
          phase="arrival"
          items={arrival}
          heading={job.jobType === "estimate" ? "Before you start pricing" : "Before you start"}
          blurb={job.jobType === "estimate"
            ? "Measure it and photograph it now. A second trip to check something costs more than the job earns."
            : "Tick these as you do them. They are the record that it was done."}
        />
      )}

      {completion.length > 0 && (
        <JobChecklist
          jobId={job.id}
          phase="completion"
          items={completion}
          heading="Before you leave"
          blurb="The office cannot invoice until this is finished."
        />
      )}

      {job.status === "in_progress" && !activeOnThisJob && (
        <div className="grid grid-cols-1 gap-2">
          <MarkJobDoneButton jobId={job.id} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        <Link
          href={"/tm/tech/jobs/" + job.id + "/request-materials"}
          className="block bg-blue-600 hover:bg-blue-700 text-white text-center font-semibold py-3 rounded-lg"
        >
          Request Materials
        </Link>
      </div>

      {myRequests.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            My Material Requests
          </h2>
          <ul className="space-y-2">
            {myRequests.map((r) => (
              <li
                key={r.id}
                className="border border-slate-200 rounded-lg p-3 bg-white space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 break-words">
                      {r.itemName}
                      <span className="ml-2 text-sm font-normal text-slate-600 whitespace-nowrap">
                        × {Number(r.qty)}
                        {r.unit ? " " + r.unit : ""}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Requested{" "}
                      {new Date(r.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  <RequestStatusBadge status={r.status} />
                </div>

                {r.notes && (
                  <div className="text-xs text-slate-600 break-words">
                    Your note: {r.notes}
                  </div>
                )}

                <RequestStatusPanel
                  status={r.status}
                  deniedReason={r.deniedReason}
                  fulfillmentNotes={r.fulfillmentNotes}
                />
              </li>
            ))}
          </ul>
        </div>
      )}{unlinkedPurchases.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Materials Bought For This Job
          </h2>
          <p className="text-xs text-slate-500">
            These weren&apos;t tied to a request, but the admin bought them for
            this job.
          </p>
          <ul className="space-y-2">
            {unlinkedPurchases.map((p) => (
              <li
                key={p.id}
                className="border border-emerald-200 bg-emerald-50 rounded-lg p-3 space-y-1"
              >
                <div className="text-sm font-medium text-slate-900">
                  {p.vendor || "Material purchase"}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    {new Date(p.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                {p.fulfillmentNotes && (
                  <div className="text-sm text-slate-800 whitespace-pre-wrap break-words">
                    {p.fulfillmentNotes}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RequestStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-blue-100 text-blue-800",
    denied: "bg-red-100 text-red-800",
    purchased: "bg-emerald-100 text-emerald-800",
  };
  const labels: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    denied: "Denied",
    purchased: "Purchased",
  };
  return (
    <span
      className={
        "shrink-0 inline-block text-xs font-medium px-2 py-0.5 rounded " +
        (styles[status] || "bg-slate-100 text-slate-700")
      }
    >
      {labels[status] || status}
    </span>
  );
}

function RequestStatusPanel({
  status,
  deniedReason,
  fulfillmentNotes,
}: {
  status: string;
  deniedReason: string | null;
  fulfillmentNotes: string | null;
}) {
  if (status === "pending") {
    return (
      <div className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-900 rounded px-2 py-2">
        ⏳ Waiting for admin to review.
      </div>
    );
  }
  if (status === "approved") {
    return (
      <div className="text-xs bg-blue-50 border border-blue-200 text-blue-900 rounded px-2 py-2">
        ✓ Approved. Waiting on purchase.
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div className="text-sm bg-red-50 border border-red-200 text-red-900 rounded px-3 py-2">
        <div className="font-semibold text-xs mb-1">❌ Denied</div>
        {deniedReason ? (
          <div className="whitespace-pre-wrap break-words">{deniedReason}</div>
        ) : (
          <div className="italic text-red-800">
            No reason was given. Ask the admin.
          </div>
        )}
      </div>
    );
  }
  if (status === "purchased") {
    return (
      <div className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-900 rounded px-3 py-2">
        <div className="font-semibold text-xs mb-1">✓ Purchased</div>
        {fulfillmentNotes ? (
          <div className="whitespace-pre-wrap break-words">
            {fulfillmentNotes}
          </div>
        ) : (
          <div className="italic text-emerald-800">
            Bought. Ask admin for pickup details.
          </div>
        )}
      </div>
    );
  }
  return null;
}
