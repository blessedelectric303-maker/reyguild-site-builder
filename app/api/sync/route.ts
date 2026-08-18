import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// The sync. Approved proposal becomes a job; a job gets a date and a tech.
// Both apps share one database, so nothing has to be kept in step by hand.

export const dynamic = "force-dynamic";

const LINKS_KEY = "so_job_links"; // { estimateId: jobId }

async function companyId(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .schema("suite")
    .from("memberships")
    .select("company_id")
    .limit(1)
    .maybeSingle();
  return ((data as any) || {}).company_id || "";
}

async function readKey(cid: string, key: string): Promise<any> {
  const supabase = await createClient();
  const { data } = await supabase
    .schema("suite")
    .from("app_storage")
    .select("value")
    .eq("company_id", cid)
    .eq("key", key)
    .maybeSingle();
  const raw = ((data as any) || {}).value;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function writeKey(cid: string, key: string, value: any) {
  const supabase = await createClient();
  await supabase
    .schema("suite")
    .from("app_storage")
    .upsert(
      { company_id: cid, key, value: JSON.stringify(value), updated_at: new Date().toISOString() },
      { onConflict: "company_id,key" }
    );
}

function estimateTotal(est: any): number {
  if (est && est.mode === "lump") return Number(est.lumpPrice) || 0;
  const lines = (est && est.lines) || [];
  return lines.reduce((sum: number, l: any) => {
    const qty = Number(l.qty) || 0;
    const price = Number(l.price) || 0;
    return sum + qty * price;
  }, 0);
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not signed in to Time and Material." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body.action;
  const cid = await companyId();

  // --- Turn an approved proposal into a job ---
  if (action === "create_job") {
    if (!cid) return NextResponse.json({ error: "No company found." }, { status: 400 });

    const estimates = (await readKey(cid, "so_estimates")) || [];
    const est = estimates.find((e: any) => String(e.id) === String(body.estimateId));
    if (!est) return NextResponse.json({ error: "That proposal no longer exists." }, { status: 404 });

    const links = (await readKey(cid, LINKS_KEY)) || {};
    if (links[String(est.id)]) {
      return NextResponse.json({ error: "That proposal already has a job." }, { status: 409 });
    }

    const total = estimateTotal(est);
    const job = await prisma.job.create({
      data: {
        id: crypto.randomUUID(),
        orgId: me.orgId,
        createdById: me.id,
        customerName: est.client || "Customer",
        jobAddress: est.clientAddr || "",
        jobType: body.jobType || "proposal",
        jobDescription: est.jobDescription || est.lumpDescription || "",
        salePrice: total > 0 ? total : null,
        notes: est.estimateNo ? "From proposal " + est.estimateNo : null,
        status: "scheduled",
        updatedAt: new Date(),
      },
    });

    links[String(est.id)] = job.id;
    await writeKey(cid, LINKS_KEY, links);

    return NextResponse.json({ ok: true, jobId: job.id });
  }

  // --- Put a date and a tech on a job ---
  if (action === "schedule") {
    const jobId = String(body.jobId || "");
    const date = String(body.date || "");
    const time = String(body.time || "08:00");
    const hours = Number(body.hours) || 2;
    if (!jobId || !date) return NextResponse.json({ error: "Pick a date first." }, { status: 400 });

    const start = new Date(date + "T" + time + ":00");
    if (isNaN(start.getTime())) return NextResponse.json({ error: "That date did not make sense." }, { status: 400 });
    const end = new Date(start.getTime() + hours * 3600000);

    const job = await prisma.job.findFirst({ where: { id: jobId, orgId: me.orgId } });
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

    await prisma.job.update({
      where: { id: jobId },
      data: {
        scheduledStart: start,
        scheduledEnd: end,
        estimatedHours: hours,
        jobType: body.jobType || job.jobType || "proposal",
        updatedAt: new Date(),
      },
    });

    if (body.techId) {
      await prisma.jobAssignment.upsert({
        where: { jobId_userId: { jobId, userId: String(body.techId) } },
        create: { id: crypto.randomUUID(), jobId, userId: String(body.techId), isPrimary: true },
        update: { isPrimary: true },
      });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
