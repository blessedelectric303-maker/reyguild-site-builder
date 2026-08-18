import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ROLES, isOrgLocked } from "@/lib/auth";
import { uploadPhoto } from "@/lib/supabase-storage";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const isAdmin = user.role === ROLES.OWNER || user.role === ROLES.ADMIN;
    const techWithPower =
      user.role === ROLES.TECHNICIAN && (user as any).canLogMaterialPurchases === true;

    if (!isAdmin && !techWithPower) {
      return NextResponse.json(
        { error: "Not allowed to log other job costs" },
        { status: 403 }
      );
    }

    if (isOrgLocked(user.org)) {
      return NextResponse.json(
        { error: "Your trial has ended. Renew to continue logging costs." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const jobId = formData.get("jobId") as string;
    const description = ((formData.get("description") as string) || "").trim();
    const amount = Number(formData.get("amount"));
    const notes = ((formData.get("notes") as string) || "").trim();
    const receipt = formData.get("receipt") as File | null;

    if (!jobId || !description || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Missing required fields (job, description, amount)" },
        { status: 400 }
      );
    }

    if (description.length > 200) {
      return NextResponse.json(
        { error: "Description must be 200 characters or less" },
        { status: 400 }
      );
    }const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, orgId: true },
    });
    if (!job || job.orgId !== user.orgId) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    let receiptStoragePath: string | null = null;
    let photoMeta: { mimeType: string; fileSize: number } | null = null;

    if (receipt && receipt.size > 0) {
      if (receipt.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Receipt must be under 10 MB" },
          { status: 400 }
        );
      }
      const arrayBuffer = await receipt.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = (receipt.type.split("/")[1] || "jpg").split("+")[0];
      const fileName = "othercost_" + crypto.randomUUID() + "." + ext;
      const storagePath = user.orgId + "/" + jobId + "/" + fileName;

      const upload = await uploadPhoto("job-photos", storagePath, buffer, receipt.type);
      if (!upload.ok) {
        return NextResponse.json(
          { error: "Receipt upload failed" },
          { status: 500 }
        );
      }
      receiptStoragePath = upload.path!;
      photoMeta = { mimeType: receipt.type, fileSize: receipt.size };
    }

    const costId = "ojc_" + crypto.randomUUID();await prisma.$transaction(async (tx) => {
      await tx.otherJobCost.create({
        data: {
          id: costId,
          orgId: user.orgId,
          jobId: job.id,
          loggedByUserId: user.id,
          description,
          amount,
          receiptImageUrl: receiptStoragePath,
          notes: notes || null,
        },
      });

      if (receiptStoragePath && photoMeta) {
        await tx.jobPhoto.create({
          data: {
            id: "photo_" + crypto.randomUUID(),
            jobId: job.id,
            uploadedByUserId: user.id,
            otherJobCostId: costId,
            photoCategory: "other_job_cost",
            photoType: "receipt",
            imageUrl: receiptStoragePath,
            mimeType: photoMeta.mimeType,
            fileSize: photoMeta.fileSize,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId: user.orgId,
          actorUserId: user.id,
          actorRole: user.role,
          actionType: "log_other_job_cost",
          targetTable: "OtherJobCost",
          targetId: costId,
          newValue: amount.toFixed(2),
        },
      });
    });

    return NextResponse.json({ ok: true, costId });
  } catch (err: any) {
    console.error("Log other job cost error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
