import { prisma } from "@/lib/prisma";
import { getCurrentUser, ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPhotoSignedUrl } from "@/lib/supabase-storage";
import ReadyToInvoiceActions from "./ReadyToInvoiceActions";

export const dynamic = "force-dynamic";

const TZ = "America/Denver";

function formatTimestamp(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export default async function ReadyToInvoicePage() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");
  if (!ADMIN_ROLES.includes(actor.role as any)) redirect("/tm/admin");

  const jobs = await prisma.job.findMany({
    where: { orgId: actor.orgId, status: "awaiting_invoice" },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const cards = await Promise.all(
    jobs.map(async (job) => {
      const photos = await prisma.jobPhoto.findMany({
        where: { jobId: job.id, photoCategory: "completion" },
        orderBy: { createdAt: "asc" },
        select: { id: true, imageUrl: true },
      });

      const signed = await Promise.all(
        photos.map(async (p) => ({
          id: p.id,
          url: await getPhotoSignedUrl("job-photos", p.imageUrl),
        }))
      );

      const lastUpdate = await prisma.jobStatusUpdate.findFirst({
        where: { jobId: job.id, updateType: "mark_done" },
        orderBy: { createdAt: "desc" },
        select: { notes: true, createdAt: true, user: { select: { name: true } } },
      });

      return {
        job,
        photos: signed.filter((s) => s.url),
        note: lastUpdate?.notes || null,
        markedBy: lastUpdate?.user?.name || null,
        markedAt: lastUpdate?.createdAt || null,
      };
    })
  );

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ready to Invoice</h1>
        <p className="text-sm text-slate-500 mt-1">
          Jobs techs have marked done. Review the photos, then send the invoice
          and mark complete, or send it back with a reason.
        </p>
      </div>

      {cards.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-500">Nothing waiting to invoice.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {cards.map(({ job, photos, note, markedBy, markedAt }) => (
            <li
              key={job.id}
              className="bg-white rounded-xl border-2 border-emerald-200 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Customer
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {job.customerName}
                  </div>
                  <div className="text-sm text-slate-600 mt-0.5">
                    {job.jobAddress}
                  </div>
                </div>
                <span className="inline-block text-xs font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                  Awaiting invoice
                </span>
              </div>

              {(markedBy || markedAt) && (
                <div className="text-xs text-slate-500">
                  Marked done
                  {markedBy ? " by " + markedBy : ""}
                  {markedAt ? " on " + formatTimestamp(markedAt) : ""}
                </div>
              )}

              {note && (
                <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
                  <span className="font-semibold">Tech notes: </span>
                  <span className="whitespace-pre-wrap break-words">{note}</span>
                </div>
              )}

              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                  Completion photos ({photos.length})
                </div>
                {photos.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">
                    No photos could be loaded.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {photos.map((p) => (
                      <img
                        key={p.id}
                        src={p.url || ""}
                        alt="Completion photo"
                        className="aspect-square w-full rounded-lg border border-slate-200 bg-slate-100 object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-1 border-t border-slate-200">
                <ReadyToInvoiceActions jobId={job.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
