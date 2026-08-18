import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ADMIN_ROLES, ROLES } from "@/lib/auth";
import NewJobForm from "./NewJobForm";

export default async function NewJobPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const allowed = [...ADMIN_ROLES, ROLES.ESTIMATOR];
  if (!allowed.includes(user.role as any)) {
    redirect("/tm/admin");
  }

  const technicians = await prisma.user.findMany({
    where: {
      orgId: user.orgId,
      role: ROLES.TECHNICIAN,
      isActive: true,
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Job</h1>
        <p className="text-sm text-slate-500 mt-1">
          Add a new job. Type the address and select a suggestion to auto-fill the location.
        </p>
      </div>

      <NewJobForm technicians={technicians} />
    </div>
  );
}