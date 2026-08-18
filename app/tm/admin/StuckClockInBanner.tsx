import { prisma } from "@/lib/prisma";
import Link from "next/link";

const STUCK_HOURS = 12;

export default async function StuckClockInBanner({ orgId }: { orgId: string }) {
  const cutoff = new Date(Date.now() - STUCK_HOURS * 60 * 60 * 1000);

  const stuck = await prisma.timeEntry.findMany({
    where: {
      clockOutAt: null,
      clockInAt: { lt: cutoff },
      job: { orgId },
    },
    include: {
      user: { select: { name: true } },
      job: { select: { id: true, customerName: true } },
    },
    orderBy: { clockInAt: "asc" },
  });

  if (stuck.length === 0) return null;

  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0">⚠️</div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-red-900">
            {stuck.length === 1
              ? "1 technician has been clocked in over 12 hours"
              : stuck.length + " technicians have been clocked in over 12 hours"}
          </h3>
          <p className="text-xs text-red-800 mt-1">
            Review and clock out below. Labor cost will be calculated from clock-in to clock-out time.
          </p>
        </div>
      </div>
      <ul className="divide-y divide-red-200 border-t border-red-200">
        {stuck.map((entry) => {
          const hours = (Date.now() - new Date(entry.clockInAt).getTime()) / 3600000;
          return (
            <li key={entry.id} className="py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-red-900">{entry.user.name}</div>
                <div className="text-xs text-red-700">
                  {entry.job.customerName} · clocked in {hours.toFixed(1)}h ago
                </div>
              </div>
              <Link
                href={"/tm/admin/jobs/" + entry.job.id + "#time-entries"}
                className="text-xs bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-1.5 rounded-lg shrink-0"
              >
                Review
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
