import { prisma } from "@/lib/prisma";
import { getCurrentUser, ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AuditLogRow from "./AuditLogRow";
import AuditExportButton from "@/components/admin/AuditExportButton";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

const TAB_FILTERS: Record<string, string[] | null> = {
  all: null,
  jobs: ["Job"],
  time: ["TimeEntry"],
  materials: ["MaterialRequest", "MaterialPurchase", "MaterialPurchaseItem"],
  users: ["User"],
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; before?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab && TAB_FILTERS[params.tab] !== undefined ? params.tab : "all";
  const before = params.before;

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!ADMIN_ROLES.includes(user.role as any)) redirect("/tm/admin");

  const tables = TAB_FILTERS[tab];
  const whereClause: any = { orgId: user.orgId };
  if (tables) whereClause.targetTable = { in: tables };
  if (before) {
    const beforeDate = new Date(before);
    if (!isNaN(beforeDate.getTime())) {
      whereClause.createdAt = { lt: beforeDate };
    }
  }

  const [entries, counts] = await Promise.all([
    prisma.auditLog.findMany({
      where: whereClause,
      include: {
        actor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
    }),
    prisma.auditLog.groupBy({
      by: ["targetTable"],
      where: { orgId: user.orgId },
      _count: true,
    }),
  ]);

  const hasMore = entries.length > PAGE_SIZE;
  const visible = hasMore ? entries.slice(0, PAGE_SIZE) : entries;
  const nextBefore = hasMore ? visible[visible.length - 1].createdAt.toISOString() : null;

  const countByTable = Object.fromEntries(counts.map((c) => [c.targetTable, c._count]));
  const sumTables = (tableList: string[] | null): number => {
    if (!tableList) return counts.reduce((sum, c) => sum + c._count, 0);
    return tableList.reduce((sum, t) => sum + (countByTable[t] || 0), 0);
  };

  const tabHref = (t: string) => "/tm/admin/audit" + (t === "all" ? "" : "?tab=" + t);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
          <p className="text-sm text-slate-500 mt-1">
            Every change to jobs, time entries, materials, and users — who did it and why.
          </p>
        </div>
        <AuditExportButton tab={tab} before={before} />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <FilterTab label="All" tab="all" count={sumTables(null)} active={tab === "all"} />
        <FilterTab label="Jobs" tab="jobs" count={sumTables(TAB_FILTERS.jobs)} active={tab === "jobs"} />
        <FilterTab label="Time" tab="time" count={sumTables(TAB_FILTERS.time)} active={tab === "time"} />
        <FilterTab label="Materials" tab="materials" count={sumTables(TAB_FILTERS.materials)} active={tab === "materials"} />
        <FilterTab label="Users" tab="users" count={sumTables(TAB_FILTERS.users)} active={tab === "users"} />
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">No audit entries{before ? " before this point" : ""}.</p>
          {before && (
            <Link href={tabHref(tab)} className="text-xs text-brand-600 hover:underline mt-2 inline-block">
              ← Back to most recent
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <ul className="divide-y divide-slate-200">
            {visible.map((entry) => (
              <AuditLogRow
                key={entry.id}
                entry={{
                  id: entry.id,
                  createdAt: entry.createdAt.toISOString(),
                  actorName: entry.actor?.name || "(deleted user)",
                  actorRole: entry.actorRole,
                  actionType: entry.actionType,
                  targetTable: entry.targetTable,
                  targetId: entry.targetId,
                  fieldChanged: entry.fieldChanged,
                  oldValue: entry.oldValue,
                  newValue: entry.newValue,
                  reason: entry.reason,
                }}
              />
            ))}
          </ul>
        </div>
      )}

      {hasMore && nextBefore && (
        <div className="text-center">
          <Link
            href={tabHref(tab) + (tab === "all" ? "?" : "&") + "before=" + encodeURIComponent(nextBefore)}
            className="inline-block text-sm bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium px-4 py-2 rounded-lg"
          >
            Load older →
          </Link>
        </div>
      )}
    </div>
  );
}

function FilterTab({
  label,
  tab,
  count,
  active,
}: {
  label: string;
  tab: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={"/tm/admin/audit" + (tab === "all" ? "" : "?tab=" + tab)}
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
