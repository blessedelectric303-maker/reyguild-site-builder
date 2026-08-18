import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUnlocked, ADMIN_ROLES, ROLES } from "@/lib/auth";

const schema = z.object({
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().nullable().optional(),
  customerEmail: z.string().email().nullable().optional(),
  jobAddress: z.string().min(3).max(500),
  jobLat: z.number(),
  jobLng: z.number(),
  salePrice: z.number().nullable().optional(),
  scheduledStartAt: z.string().nullable().optional(),
  scheduledEndAt: z.string().nullable().optional(),
  scopeOfWork: z.string().nullable().optional(),
  assignedTechIds: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  try {
    const actor = await requireUnlocked([...ADMIN_ROLES, ROLES.ESTIMATOR]);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input. Check required fields." },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const org = await prisma.organization.findUnique({
      where: { id: actor.orgId },
      select: { defaultGeofenceMiles: true },
    });const job = await prisma.$transaction(async (tx) => {
      const newJob = await tx.job.create({
        data: {
          id: "job_" + crypto.randomUUID(),
          orgId: actor.orgId,
          createdById: actor.id,
          customerName: data.customerName,
          customerPhone: data.customerPhone || null,
          customerEmail: data.customerEmail || null,
          jobAddress: data.jobAddress,
          lat: data.jobLat,
          lng: data.jobLng,
          salePrice: data.salePrice ?? null,
          geofenceMiles: org?.defaultGeofenceMiles ?? 1.0,
          scheduledStart: data.scheduledStartAt ? new Date(data.scheduledStartAt) : null,
          scheduledEnd: data.scheduledEndAt ? new Date(data.scheduledEndAt) : null,
          jobDescription: data.scopeOfWork || null,
          status: "scheduled",
        },
      });

      if (data.assignedTechIds.length > 0) {
        const techs = await tx.user.findMany({
          where: {
            id: { in: data.assignedTechIds },
            orgId: actor.orgId,
            role: ROLES.TECHNICIAN,
            isActive: true,
          },
          select: { id: true },
        });

        await tx.jobAssignment.createMany({
          data: techs.map((t) => ({
            id: "asg_" + crypto.randomUUID(),
            jobId: newJob.id,
            userId: t.id,
          })),
        });
      }await tx.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId: actor.orgId,
          actorUserId: actor.id,
          actorRole: actor.role,
          actionType: "job_created",
          targetTable: "Job",
          targetId: newJob.id,
          newValue: JSON.stringify({
            customer: data.customerName,
            address: data.jobAddress,
            salePrice: data.salePrice,
            techCount: data.assignedTechIds.length,
          }),
        },
      });

      return newJob;
    });

    return NextResponse.json({ ok: true, job: { id: job.id } });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "You don't have permission" }, { status: 403 });
    }
    if (err?.message === "ORG_LOCKED") {
      return NextResponse.json({ error: "Your trial has ended. Renew to create jobs." }, { status: 403 });
    }
    console.error("Create job error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
