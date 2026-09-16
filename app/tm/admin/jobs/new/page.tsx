import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser, ADMIN_ROLES, ROLES } from "@/lib/auth";
import NewJobForm, { type JobPrefill } from "./NewJobForm";

export const dynamic = "force-dynamic";

// ?fromProposal=<id> arrives from the calendar when somebody picks an
// accepted proposal. Everything the customer already agreed to is loaded here
// and handed to the form, so the job that gets booked is the job that was
// quoted rather than a retyped approximation of it.
async function loadProposal(refId: string): Promise<JobPrefill | undefined> {
  try {
    const supabase = await createClient();
    const { data: { user: su } } = await supabase.auth.getUser();
    if (!su) return undefined;
    const { data: mem } = await supabase
      .schema("suite")
      .from("memberships")
      .select("company_id")
      .eq("user_id", su.id)
      .limit(1)
      .maybeSingle();
    const cid = ((mem as any) || {}).company_id;
    if (!cid) return undefined;

    const { data: row } = await supabase
      .schema("suite")
      .from("app_storage")
      .select("value")
      .eq("company_id", cid)
      .eq("key", "so_estimates")
      .maybeSingle();

    const list = JSON.parse(((row as any) || {}).value || "[]");
    const e = (Array.isArray(list) ? list : []).find((x: any) => String(x.id) === refId);
    if (!e) return undefined;

    // The estimating app computes totals rather than storing them.
    const total = String(e.mode || "") === "lumpsum"
      ? Number(e.lumpPrice || 0)
      : (e.lines || []).reduce(
          (sum: number, l: any) => sum + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0),
          0
        );

    return {
      customerName: e.client || "",
      customerPhone: e.clientPhone || "",
      customerEmail: e.clientEmail || "",
      address: e.clientAddr || "",
      // Coordinates the estimator already picked off Google's list. Reusing
      // them means the geofence sits where the proposal said, not wherever a
      // second lookup decides.
      lat: e.addrLat ?? null,
      lng: e.addrLng ?? null,
      salePrice: total ? String(total) : "",
      scopeOfWork: e.jobDescription || e.lumpDescription || "",
      proposalRef: String(e.id),
    };
  } catch {
    // A proposal that will not load must not block booking a job by hand.
    return undefined;
  }
}

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ fromProposal?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const allowed = [...ADMIN_ROLES, ROLES.ESTIMATOR];
  if (!allowed.includes(user.role as any)) {
    redirect("/tm/admin");
  }

  const sp = await searchParams;
  const prefill = sp.fromProposal ? await loadProposal(String(sp.fromProposal)) : undefined;

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
        <h1 className="text-2xl font-bold text-slate-900">
          {prefill ? "Confirm Job" : "New Job"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {prefill
            ? "From an accepted proposal. The customer, address, scope and price are already filled in - add the material, a tech and a date, then confirm."
            : "Add a new job. Type the address and select a suggestion to auto-fill the location."}
        </p>
      </div>

      <NewJobForm technicians={technicians} prefill={prefill} />
    </div>
  );
}
