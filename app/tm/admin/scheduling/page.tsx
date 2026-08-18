import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ADMIN_ROLES } from "@/lib/auth";
import Queue, { type PendingProposal, type PendingJob, type Tech } from "./Queue";

export const dynamic = "force-dynamic";

function total(est: any): number {
  if (est && est.mode === "lump") return Number(est.lumpPrice) || 0;
  const lines = (est && est.lines) || [];
  return lines.reduce((sum: number, l: any) => sum + (Number(l.qty) || 0) * (Number(l.price) || 0), 0);
}

export default async function SchedulingPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/tm/enter");
  if (!ADMIN_ROLES.includes(me.role as any)) redirect("/tm/tech");

  // Proposals live in the ReyGuild side; jobs live here. One database, two doors.
  let proposals: PendingProposal[] = [];
  try {
    const supabase = await createClient();
    const { data: mem } = await supabase
      .schema("suite")
      .from("memberships")
      .select("company_id")
      .limit(1)
      .maybeSingle();
    const cid = ((mem as any) || {}).company_id || "";
    if (cid) {
      const { data: rows } = await supabase
        .schema("suite")
        .from("app_storage")
        .select("key,value")
        .eq("company_id", cid)
        .in("key", ["so_estimates", "so_job_links"]);
      const byKey: Record<string, any> = {};
      ((rows as any[]) || []).forEach((r) => {
        try {
          byKey[r.key] = JSON.parse(r.value);
        } catch (e) {
          byKey[r.key] = null;
        }
      });
      const estimates = byKey["so_estimates"] || [];
      const links = byKey["so_job_links"] || {};
      proposals = estimates
        .filter((e: any) => String(e.status || "").toLowerCase() === "approved" && !e.archived && !links[String(e.id)])
        .map((e: any) => ({
          id: String(e.id),
          no: e.estimateNo || "",
          client: e.client || "",
          addr: e.clientAddr || "",
          description: e.jobDescription || e.lumpDescription || "",
          total: total(e),
        }));
    }
  } catch (e) {
    // Proposals unavailable is not fatal. The jobs half still works.
  }

  const rawJobs = await prisma.job.findMany({
    where: { orgId: me.orgId, scheduledStart: null, status: { not: "archived" } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const jobs: PendingJob[] = rawJobs.map((j) => ({
    id: j.id,
    customerName: j.customerName,
    jobAddress: j.jobAddress || "",
    jobType: j.jobType || "proposal",
    jobDescription: j.jobDescription || "",
  }));

  const rawTechs = await prisma.user.findMany({
    where: { orgId: me.orgId, isActive: true },
    orderBy: { name: "asc" },
  });
  const techs: Tech[] = rawTechs.map((u) => ({ id: u.id, name: u.name || u.email }));

  return (
    <main className="p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl text-white">Needs a date</h1>
          <Link href="/" className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300">Command center</Link>
        </div>
        <Queue proposals={proposals} jobs={jobs} techs={techs} />
      </div>
    </main>
  );
}
