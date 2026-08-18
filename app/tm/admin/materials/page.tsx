import { prisma } from "@/lib/prisma";
import { getCurrentUser, ROLES } from "@/lib/auth";
import { getPhotoSignedUrl } from "@/lib/supabase-storage";
import { redirect } from "next/navigation";
import Link from "next/link";
import MaterialRequestsList from "./MaterialRequestsList";

export const dynamic = "force-dynamic";

export default async function AdminMaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const filterStatus = params.status || "pending";

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== ROLES.OWNER && user.role !== ROLES.ADMIN) {
    redirect("/tm/tech");
  }

  const whereClause: any = { job: { orgId: user.orgId } };
  if (filterStatus !== "all") {
    whereClause.status = filterStatus;
  }

  const requests = await prisma.materialRequest.findMany({
    where: whereClause,
    include: {
      job: { select: { id: true, customerName: true, jobAddress: true } },
      requestedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      photos: { select: { id: true, imageUrl: true, lat: true, lng: true, distanceFromJobMiles: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Sign photo URLs server-side so the client can display them
  const requestsWithUrls = await Promise.all(
    requests.map(async (req) => {
      const photosWithUrls = await Promise.all(
        req.photos.map(async (photo) => ({
          ...photo,
          signedUrl: await getPhotoSignedUrl("job-photos", photo.imageUrl, 3600),
        }))
      );
      return {
        ...req,
        qty: Number(req.qty),
        createdAt: req.createdAt.toISOString(),
        approvedAt: req.approvedAt?.toISOString() || null,
        photos: photosWithUrls,
      };
    })
  );

  const counts = await prisma.materialRequest.groupBy({
    by: ["status"],
    where: { job: { orgId: user.orgId } },
    _count: true,
  });

  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Material Requests</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review and approve material requests from the field
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <FilterTab
          label="Pending"
          status="pending"
          count={countMap.pending || 0}
          active={filterStatus === "pending"}
        />
        <FilterTab
          label="Approved"
          status="approved"
          count={countMap.approved || 0}
          active={filterStatus === "approved"}
        />
       <FilterTab
          label="Denied"
          status="denied"
          count={countMap.denied || 0}
          active={filterStatus === "denied"}
        />
        <FilterTab
          label="Purchased"
          status="purchased"
          count={countMap.purchased || 0}
          active={filterStatus === "purchased"}
        />
        <FilterTab
          label="All"
          status="all"
          count={Object.values(countMap).reduce((a: number, b: number) => a + b, 0)}
          active={filterStatus === "all"}
        />
      </div>

      <MaterialRequestsList requests={requestsWithUrls} />
    </div>
  );
}

function FilterTab({
  label,
  status,
  count,
  active,
}: {
  label: string;
  status: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={"/tm/admin/materials?status=" + status}
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
