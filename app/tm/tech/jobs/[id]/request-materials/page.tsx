import { prisma } from "@/lib/prisma";
import { getCurrentUser, ROLES } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import RequestForm from "./RequestForm";

export default async function RequestMaterialsPage({
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
      assignments: { where: { userId: user.id }, select: { id: true } },
    },
  });

  if (!job || job.orgId !== user.orgId) notFound();
  if (job.assignments.length === 0) redirect("/tm/tech");

  return (
    <div className="space-y-4">
      <div>
        <Link href={"/tm/tech/jobs/" + job.id} className="text-xs text-brand-600 hover:underline">
          ← Back to job
        </Link>
        <h1 className="text-xl font-bold text-slate-900 mt-2">Request Materials</h1>
        <p className="text-sm text-slate-500 mt-1">
          {job.customerName} · {job.jobAddress}
        </p>
      </div>

      <RequestForm
        jobId={job.id}
        jobLat={job.lat}
        jobLng={job.lng}
        geofenceMiles={job.geofenceMiles}
      />
    </div>
  );
}