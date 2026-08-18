import { prisma } from "@/lib/prisma";
import { getCurrentUser, ADMIN_ROLES, ROLES } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import EditUserForm from "./EditUserForm";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");
  if (!ADMIN_ROLES.includes(actor.role as any)) redirect("/tm/admin");

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user || user.orgId !== actor.orgId) {
    notFound();
  }

  const isActorOwner = actor.role === ROLES.OWNER;
  const isTargetOwner = user.role === ROLES.OWNER;
  const isSelf = user.id === actor.id;

  const canEditRole = isActorOwner && !isSelf;
  const canDeactivate = !isSelf && (isActorOwner || !isTargetOwner);
  const canResetPassword = isActorOwner || (!isTargetOwner && !isSelf);
  const canLockMargin = isActorOwner && user.role === ROLES.ADMIN;
  const canEditCost = isActorOwner || actor.role === ROLES.ADMIN;

  // Email editing: Owners can edit anyone's email. Admins can edit non-Owner emails.
  // (Email IS the login, so we protect Owner emails more strictly.)
  const canEditEmail = isActorOwner || !isTargetOwner;

  const [recentLogs, recentTimeEntries] = await Promise.all([
    prisma.auditLog.findMany({
      where: { orgId: actor.orgId, targetTable: "User", targetId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { actor: { select: { name: true } } },
    }),
    prisma.timeEntry.findMany({
      where: { userId: user.id },
      orderBy: { clockInAt: "desc" },
      take: 5,
      include: { job: { select: { customerName: true, jobAddress: true } } },
    }),
  ]);

  const roleLabels: Record<string, string> = {
    owner: "Owner / CEO",
    admin: "Admin / Operations",
    estimator: "Estimator / Sales",
    technician: "Technician",
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/tm/admin/users" className="text-xs text-brand-600 hover:underline">
          ← Back to employees
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">{user.name}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {user.email} · {roleLabels[user.role] || user.role}
          {!user.isActive && <span className="ml-2 text-red-600">· Inactive</span>}
          {isSelf && <span className="ml-2 text-slate-400">· This is you</span>}
        </p>
      </div>

      <EditUserForm
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          marginViewLocked: user.marginViewLocked,
          hourlyCost: user.hourlyCost ? Number(user.hourlyCost) : null,
          hourlyWage: user.hourlyWage ? Number(user.hourlyWage) : null,
          canLogMaterialPurchases: user.canLogMaterialPurchases,
        }}
        canEditRole={canEditRole}
        canDeactivate={canDeactivate}
        canResetPassword={canResetPassword}
        canLockMargin={canLockMargin}
        canCreateOwner={isActorOwner}
        canCreateAdmin={isActorOwner}
        canEditCost={canEditCost}
        canEditEmail={canEditEmail}
      />

      {recentTimeEntries.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Recent Time Entries</h2>
          <ul className="divide-y divide-slate-200">
            {recentTimeEntries.map((entry) => (
              <li key={entry.id} className="py-3 flex items-start justify-between">
                <div>
                  <div className="font-medium text-slate-900">{entry.job.customerName}</div>
                  <div className="text-xs text-slate-500">{entry.job.jobAddress}</div>
                </div>
                <div className="text-xs text-slate-500 text-right">
                  <div>{new Date(entry.clockInAt).toLocaleDateString()}</div>
                  <div>
                    {entry.totalMinutes
                      ? Math.round((entry.totalMinutes / 60) * 10) / 10 + "h"
                      : "Active"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recentLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Recent Changes</h2>
          <ul className="divide-y divide-slate-200">
            {recentLogs.map((log) => (
              <li key={log.id} className="py-2 text-sm">
                <span className="text-slate-900">{log.actionType.replace(/_/g, " ")}</span>
                <span className="text-slate-500"> by {log.actor.name}</span>
                <span className="text-slate-400 ml-2">
                  {new Date(log.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
