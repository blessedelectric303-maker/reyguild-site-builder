import { redirect } from "next/navigation";
import { getCurrentUser, ADMIN_ROLES, ROLES, ALL_OFFICE_ROLES, isOrgLocked } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminShell from "./AdminShell";

export const metadata = {
  title: "ReyGuild - Admin Portal",
  description: "Jobs, scheduling, timesheets and the numbers.",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (!ALL_OFFICE_ROLES.includes(user.role as any)) {
    redirect("/tm/tech");
  }

  // Trial / subscription lock: office users hit the subscribe wall when locked.
  if (isOrgLocked(user.org)) {
    redirect("/subscribe");
  }

  const isOwnerOrAdmin = ADMIN_ROLES.includes(user.role as any);

  const isOwner = String(user.role || "").toLowerCase() === "owner";

  // Count pending time off requests for the badge (only for admins/owners)
  const pendingTimeOffCount = isOwnerOrAdmin
    ? await prisma.timeOffRequest.count({
        where: { orgId: user.orgId, status: "pending" },
      })
    : 0;

  // Count jobs awaiting invoice for the Ready to Invoice badge
  const awaitingInvoiceCount = isOwnerOrAdmin
    ? await prisma.job.count({
        where: { orgId: user.orgId, status: "awaiting_invoice" },
      })
    : 0;

  const navItems = [
    { href: "/tm/admin", label: "Dashboard" },
    { href: "/tm/admin/jobs", label: "Jobs" },
    ...(isOwnerOrAdmin
      ? [
          {
            href: "/tm/admin/ready-to-invoice",
            label: "Ready to Invoice",
            badgeCount: awaitingInvoiceCount,
          },
        ]
      : []),
    { href: "/tm/admin/materials", label: "Materials" },
    ...(isOwnerOrAdmin
      ? [{ href: "/tm/admin/timesheets", label: "Timesheets" }]
      : []),
    ...(isOwnerOrAdmin
      ? [
          {
            href: "/tm/admin/time-off",
            label: "Time Off",
            badgeCount: pendingTimeOffCount,
          },
        ]
      : []),
    ...(isOwnerOrAdmin
      ? [{ href: "/checklists", label: "Field Checklists" }]
      : []),
    // The office needs to read the cards too - they are who answers when a
    // customer asks what happens next, and who edits one when it changes.
    { href: "/procedures", label: "Field Procedures" },
    // OWNER ONLY, and near the end - it is what you open when something has
    // gone wrong, not part of the daily run.
    ...(isOwner
      ? [{ href: "/tm/admin/audit", label: "Audit Log" }]
      : []),
    { href: "/help", label: "Help" },
  ];

  return (
    <AdminShell
      user={{ name: user.name, email: user.email, role: user.role }}
      navItems={navItems}
      pendingTimeOffCount={pendingTimeOffCount}
    >
      {children}
    </AdminShell>
  );
}
