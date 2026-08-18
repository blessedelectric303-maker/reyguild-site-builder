import { prisma } from "@/lib/prisma";
import { getCurrentUser, ROLES } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import OtherCostForm from "./OtherCostForm";

export const dynamic = "force-dynamic";

export default async function LogOtherCostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isAdmin = user.role === ROLES.OWNER || user.role === ROLES.ADMIN;
  const techWithPower =
    user.role === ROLES.TECHNICIAN && (user as any).canLogMaterialPurchases === true;
  if (!isAdmin && !techWithPower) {
    redirect("/tm/admin");
  }

  const job = await prisma.job.findUnique({
    where: { id },
    select: { id: true, orgId: true, customerName: true, jobAddress: true },
  });

  if (!job || job.orgId !== user.orgId) notFound();

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <Link
          href={"/tm/admin/jobs/" + job.id}
          className="text-xs text-brand-600 hover:underline"
        >
          ← Back to job
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">
          Log Other Job Cost
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {job.customerName} · {job.jobAddress}
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Subcontractors, permits, equipment rental, fees — anything that costs
          the job money but isn&apos;t labor or material.
        </p>
      </div>

      <OtherCostForm jobId={job.id} />
    </div>
  );
}
