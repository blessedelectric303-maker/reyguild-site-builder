import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createClient as createSuiteClient } from "@/utils/supabase/server";

// The calendar talks to jobs through here. A scheduled job IS the calendar
// entry, so the description and material typed here are the same ones the
// tech reads in Time and Material. No second list to keep in step.

export const dynamic = "force-dynamic";

// The command center has a ReyGuild session but not always a T and M cookie,
// so fall back to matching by email the way the bridge does.
async function whoami() {
  try {
    const tm = await getCurrentUser();
    if (tm) return tm;
  } catch (e) {
    // fall through
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const email = (user?.email || "").trim().toLowerCase();
    if (!email) return null;
    return await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, isActive: true },
    });
  } catch (e) {
    return null;
  }
}

function localDay(d: Date): string {
  const p = (n: number) => (n < 10 ? "0" + n : "" + n);
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function clock(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return h + ":" + (m < 10 ? "0" + m : "" + m) + " " + ampm;
}

// People type "9:00 AM", "9am", "0900" or "09:00". Accept all of them rather
// than rejecting a start time that reads perfectly well to a human.
function parseStart(date: string, raw: string): Date | null {
  const t = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!t) return build(date, 8, 0);

  const m = t.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm)?$/);
  if (!m) return null;

  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3];

  if (h > 23 || min > 59) return null;
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  // "930" means 9:30, not hour 930
  if (!m[2] && !ampm && m[1].length > 2) return null;

  return build(date, h, min);
}

function build(date: string, h: number, min: number): Date | null {
  const p = (n: number) => (n < 10 ? "0" + n : "" + n);
  const d = new Date(date + "T" + p(h) + ":" + p(min) + ":00");
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request) {
  const me = await whoami();
  if (!me) return NextResponse.json({ events: [] });

  const url = new URL(req.url);
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  if (!from || !to) return NextResponse.json({ events: [] });

  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T23:59:59");

  const jobs = await prisma.job.findMany({
    where: {
      orgId: me.orgId,
      status: { not: "archived" },
      scheduledStart: { gte: start, lte: end },
    },
    include: { assignments: { include: { user: true } } },
    orderBy: { scheduledStart: "asc" },
  });

  const events = jobs.map((j) => {
    const s = j.scheduledStart as Date;
    const hours =
      j.estimatedHours ||
      (j.scheduledEnd ? Math.round(((j.scheduledEnd as Date).getTime() - s.getTime()) / 3600000) : 2);
    const primary = j.assignments.find((a) => a.isPrimary) || j.assignments[0];
    return {
      id: j.id,
      title: j.customerName,
      address: j.jobAddress || null,
      event_type: j.jobType || "proposal",
      event_date: localDay(s),
      event_time: clock(s),
      assigned_to: primary ? primary.userId : null,
      assigned_name: primary ? primary.user.name || primary.user.email : null,
      duration_hours: hours,
      job_description: j.jobDescription || null,
      material: j.notes || null,
    };
  });

  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const me = await whoami();
  if (!me) return NextResponse.json({ error: "Could not find your Time and Material account." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const title = String(b.title || "").trim();
  const date = String(b.date || "");
  if (!title || !date) return NextResponse.json({ error: "Name and date are required." }, { status: 400 });

  // A JOB COMES FROM AN ACCEPTED PROPOSAL.
  //
  // Ben's rule: nothing goes on the calendar that the customer has not said
  // yes to, and one proposal never becomes two jobs. The database holds both
  // guards - claim_proposal_for_job refuses an unaccepted proposal, and a
  // unique index refuses a second job for the same one.
  //
  // The claim happens BEFORE the job is written. If it throws, no job exists
  // to clean up. Doing it afterwards would leave an orphan on the calendar
  // every time the guard fired, which is the failure nobody notices.
  const proposalRef = String(b.proposalRef || b.proposal_ref || "").trim();
  const jobId = crypto.randomUUID();

  if (proposalRef) {
    try {
      const supabase = await createSuiteClient();
      const { error: claimErr } = await supabase
        .schema("suite")
        .rpc("claim_proposal_for_job", { p_proposal: proposalRef, p_job: jobId });
      if (claimErr) {
        return NextResponse.json({ error: claimErr.message }, { status: 409 });
      }
    } catch (e: any) {
      return NextResponse.json(
        { error: "Could not check that proposal. Try again." },
        { status: 500 }
      );
    }
  }

  const hours = Number(b.hours) || 2;
  const start = parseStart(date, String(b.time || ""));
  if (!start) return NextResponse.json({ error: "That start time did not make sense." }, { status: 400 });
  const end = new Date(start.getTime() + hours * 3600000);

  const job = await prisma.job.create({
    data: {
      id: jobId,
      orgId: me.orgId,
      createdById: me.id,
      customerName: title,
      jobAddress: String(b.address || "").trim(),
      jobType: String(b.jobType || "service_call"),
      jobDescription: String(b.jobDescription || "").trim() || null,
      notes: String(b.material || "").trim() || null,
      estimatedHours: hours,
      scheduledStart: start,
      scheduledEnd: end,
      status: "scheduled",
      updatedAt: new Date(),
    },
  });

  // ReyGuild and Time and Material give the same person different ids, so the
  // calendar sends an email address and we resolve it here. If nobody matches,
  // the job is still created - losing an assignment beats losing the job.
  const techEmail = String(b.techEmail || "").trim().toLowerCase();
  let assignedTo: string | null = null;
  if (techEmail) {
    try {
      const tech = await prisma.user.findFirst({
        where: { orgId: me.orgId, email: { equals: techEmail, mode: "insensitive" }, isActive: true },
      });
      if (tech) {
        await prisma.jobAssignment.upsert({
          where: { jobId_userId: { jobId: job.id, userId: tech.id } },
          create: { id: crypto.randomUUID(), jobId: job.id, userId: tech.id, isPrimary: true },
          update: { isPrimary: true },
        });
        assignedTo = tech.id;
      }
    } catch (e) {
      // assignment is best effort
    }
  }

  return NextResponse.json({
    ok: true,
    id: job.id,
    assigned: assignedTo !== null,
    note: techEmail && assignedTo === null
      ? "Job saved, but that person has no Time and Material account yet, so nobody was assigned."
      : undefined,
  });
}

export async function DELETE(req: Request) {
  const me = await whoami();
  if (!me) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const job = await prisma.job.findFirst({ where: { id, orgId: me.orgId } });
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  // Take it off the calendar rather than destroying the record.
  await prisma.job.update({
    where: { id },
    data: { scheduledStart: null, scheduledEnd: null, updatedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
