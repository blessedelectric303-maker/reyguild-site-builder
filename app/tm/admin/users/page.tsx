import { prisma } from "@/lib/prisma";
import { getCurrentUser, ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function UsersListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!ADMIN_ROLES.includes(user.role as any)) {
    redirect("/tm/admin");
  }

  const users = await prisma.user.findMany({
    where: { orgId: user.orgId },
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
  });

  const roleLabels: Record<string, string> = {
    owner: "Owner",
    admin: "Admin / Operations",
    estimator: "Estimator / Sales",
    technician: "Technician",
  };

  const roleColors: Record<string, string> = {
    owner: "bg-purple-100 text-purple-800",
    admin: "bg-blue-100 text-blue-800",
    estimator: "bg-amber-100 text-amber-800",
    technician: "bg-emerald-100 text-emerald-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
          <p className="text-sm text-slate-500 mt-1">
            {users.length} {users.length === 1 ? "person" : "people"} in your organization
          </p>
        </div>
        <Link
          href="/tm/admin/users/new"
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg shrink-0"
        >
          + Add Employee
        </Link>
      </div>

      {/* Mobile: card list */}
      <div className="md:hidden space-y-2">
        {users.map((u) => (
          <Link
            key={u.id}
            href={"/tm/admin/users/" + u.id}
            className={
              "block bg-white rounded-xl border border-slate-200 p-4 hover:bg-slate-50 active:bg-slate-100 " +
              (u.isActive ? "" : "opacity-60")
            }
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900 truncate">{u.name}</div>
                <div className="text-xs text-slate-600 mt-0.5 break-all">{u.email}</div>
                {u.phone && (
                  <div className="text-xs text-slate-500 mt-0.5">{u.phone}</div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  className={
                    "inline-block text-xs font-medium px-2 py-0.5 rounded " +
                    (roleColors[u.role] || "bg-slate-100 text-slate-700")
                  }
                >
                  {roleLabels[u.role] || u.role}
                </span>
                <span
                  className={
                    "text-xs " +
                    (u.isActive ? "text-emerald-700" : "text-slate-500")
                  }
                >
                  {u.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Name</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Email</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Role</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Status</th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((u) => (
              <tr key={u.id} className={u.isActive ? "" : "opacity-50"}>
                <td className="px-5 py-3">
                  <div className="font-medium text-slate-900">{u.name}</div>
                  {u.phone && <div className="text-xs text-slate-500">{u.phone}</div>}
                </td>
                <td className="px-5 py-3 text-sm text-slate-600">{u.email}</td>
                <td className="px-5 py-3">
                  <span
                    className={
                      "inline-block text-xs font-medium px-2 py-0.5 rounded " +
                      (roleColors[u.role] || "bg-slate-100 text-slate-700")
                    }
                  >
                    {roleLabels[u.role] || u.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm">
                  {u.isActive ? (
                    <span className="text-emerald-700">Active</span>
                  ) : (
                    <span className="text-slate-500">Inactive</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={"/tm/admin/users/" + u.id}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Manage →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
