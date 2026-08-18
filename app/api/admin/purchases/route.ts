import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ROLES } from "@/lib/auth";
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
      return NextResponse.json({ error: "Not allowed to log purchases" }, { status: 403 });
    }

    const formData = await req.formData();
    const jobId = formData.get("jobId") as string;
    const vendor = ((formData.get("vendor") as string) || "").slice(0, 200);
    const invoiceNumber = ((formData.get("invoiceNumber") as string) || "").slice(0, 100);
    const totalAmount = Number(formData.get("totalAmount"));
    const purchaseDate = formData.get("purchaseDate") as string;
    const notes = ((formData.get("notes") as string) || "").slice(0, 5000);
    const fulfillmentNotes = ((formData.get("fulfillmentNotes") as string) || "")
      .trim()
      .slice(0, 5000);
    const linkedRequestId = (formData.get("linkedRequestId") as string) || "";
    const receipt = formData.get("receipt") as File | null;

    if (!jobId || isNaN(totalAmount) || totalAmount <= 0 || !purchaseDate) {
      return NextResponse.json(
        { error: "Missing required fields (job, total amount, date)" },
        { status: 400 }
      );
    }

    // Sanity bound on the total amount (prevents accidental absurd values)
    if (totalAmount > 9999999.99) {
      return NextResponse.json(
        { error: "Total amount is unreasonably large." },
        { status: 400 }
      );
    }

    if (fulfillmentNotes.length < 10) {
      return NextResponse.json(
        {
          error:
            "Fulfillment instructions are required (at least 10 characters) so techs know how to get the material.",
        },
        { status: 400 }
      );
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, orgId: true },
    });
    if (!job || job.orgId !== user.orgId) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // If linking to a request, verify it exists and is approved
    let linkedRequest: { id: string; itemName: string; qty: number; unit: string | null } | null =
      null;
    if (linkedRequestId) {
      const reqRow = await prisma.materialRequest.findUnique({
        where: { id: linkedRequestId },
        include: { job: { select: { orgId: true } } },
      });
      if (!reqRow || reqRow.job.orgId !== user.orgId) {
        return NextResponse.json({ error: "Linked request not found" }, { status: 404 });
      }
      if (reqRow.status !== "approved") {
        return NextResponse.json(
          { error: "Can only link approved requests" },
          { status: 400 }
        );
      }
      linkedRequest = {
        id: reqRow.id,
        itemName: reqRow.itemName,
        qty: Number(reqRow.qty),
        unit: reqRow.unit,
      };
    }

    let receiptStoragePath: string | null = null;
    let photoMeta: { mimeType: string; fileSize: number } | null = null;

    if (receipt && receipt.size > 0) {
      if (receipt.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "Receipt must be under 10 MB" }, { status: 400 });
      }
      // Only accept image files for receipts
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
      if (!allowedTypes.includes(receipt.type)) {
        return NextResponse.json(
          { error: "Receipt must be an image (JPEG, PNG, WebP, or HEIC)." },
          { status: 400 }
        );
      }
      const arrayBuffer = await receipt.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = (receipt.type.split("/")[1] || "jpg").split("+")[0];
      const fileName = "receipt_" + crypto.randomUUID() + "." + ext;
      const storagePath = user.orgId + "/" + jobId + "/" + fileName;

      const upload = await uploadPhoto("job-photos", storagePath, buffer, receipt.type);
      if (!upload.ok) {
        return NextResponse.json({ error: "Receipt upload failed" }, { status: 500 });
      }
      receiptStoragePath = upload.path!;
      photoMeta = { mimeType: receipt.type, fileSize: receipt.size };
    }

    const purchaseId = "mpur_" + crypto.randomUUID();

    await prisma.$transaction(async (tx) => {
      await tx.materialPurchase.create({
        data: {
          id: purchaseId,
          jobId: job.id,
          purchasedByUserId: user.id,
          vendor: vendor || null,
          invoiceNumber: invoiceNumber || null,
          totalAmount,
          purchaseDate: new Date(purchaseDate),
          receiptImageUrl: receiptStoragePath,
          notes: notes || null,
          fulfillmentNotes: fulfillmentNotes,
        },
      });

      // Optional line item linking back to the approved request
      if (linkedRequest) {
        await tx.materialPurchaseItem.create({
          data: {
            id: "mpitem_" + crypto.randomUUID(),
            purchaseId,
            fromRequestId: linkedRequest.id,
            itemName: linkedRequest.itemName,
            qty: linkedRequest.qty,
            unit: linkedRequest.unit,
            unitCost: 0,
            lineTotal: totalAmount,
          },
        });

        // Mark the request as purchased AND save fulfillment notes to it
        // so the requesting tech sees the instructions on the request itself
        await tx.materialRequest.update({
          where: { id: linkedRequest.id },
          data: {
            status: "purchased",
            fulfillmentNotes: fulfillmentNotes,
          },
        });
      }

      if (receiptStoragePath && photoMeta) {
        await tx.jobPhoto.create({
          data: {
            id: "photo_" + crypto.randomUUID(),
            jobId: job.id,
            uploadedByUserId: user.id,
            materialPurchaseId: purchaseId,
            photoCategory: "material",
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
          actionType: "log_purchase",
          targetTable: "MaterialPurchase",
          targetId: purchaseId,
          newValue: totalAmount.toFixed(2),
        },
      });
    });

    return NextResponse.json({ ok: true, purchaseId });
  } catch (err: any) {
    console.error("Log purchase error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
