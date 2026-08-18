import { prisma } from "@/lib/prisma";
import { getCurrentUser, ROLES } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import PurchaseForm from "./PurchaseForm";

export const dynamic = "force-dynamic";

export default async function LogPurchasePage({
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

  const approvedRequests = await prisma.materialRequest.findMany({
    where: { jobId: job.id, status: "approved" },
    select: { id: true, itemName: true, qty: true, unit: true },
    orderBy: { createdAt: "asc" },
  });

  const approvedList = approvedRequests.map((r) => ({
    id: r.id,
    label:
      r.itemName + " (" + Number(r.qty).toString() + (r.unit ? " " + r.unit : "") + ")",
  }));

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <Link href={"/tm/admin/jobs/" + job.id} className="text-xs text-brand-600 hover:underline">
          ← Back to job
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Log Purchase</h1>
        <p className="text-sm text-slate-500 mt-1">
          {job.customerName} · {job.jobAddress}
        </p>
      </div>

      <PurchaseForm jobId={job.id} approvedRequests={approvedList} />
    </div>
  );
}
