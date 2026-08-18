import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUnlocked, ROLES } from "@/lib/auth";
import { distanceMiles } from "@/lib/geo";
import { uploadPhoto } from "@/lib/supabase-storage";

const itemSchema = z.object({
  itemName: z.string().min(1).max(200),
  qty: z.number().positive(),
  unit: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUnlocked([ROLES.TECHNICIAN]);

    const formData = await req.formData();
    const jobId = formData.get("jobId") as string;
    const notesRaw = formData.get("notes") as string | null;
    const itemsJson = formData.get("items") as string;
    const lat = Number(formData.get("lat"));
    const lng = Number(formData.get("lng"));
    const photo = formData.get("photo") as File | null;

    if (!jobId || !itemsJson || isNaN(lat) || isNaN(lng) || !photo) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let items: z.infer<typeof itemSchema>[];
    let rawParsed: any;
    try {
      rawParsed = JSON.parse(itemsJson);
    } catch (e) {
      return NextResponse.json({ error: "Invalid items format." }, { status: 400 });
    }
    const validation = z.array(itemSchema).min(1).safeParse(rawParsed);
    if (!validation.success) {
      return NextResponse.json({ error: "Check the items — each needs a name and quantity." }, { status: 400 });
    }
    items = validation.data;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { assignments: { where: { userId: user.id }, select: { id: true } } },
    });

    if (!job || job.orgId !== user.orgId) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.assignments.length === 0) {
      return NextResponse.json({ error: "You are not assigned to this job" }, { status: 403 });
    }

    const dist =
      job.lat !== null && job.lng !== null ? distanceMiles(lat, lng, job.lat, job.lng) : null;
    const withinGeofence = dist !== null && dist <= job.geofenceMiles;

    if (!withinGeofence) {
      return NextResponse.json(
        {
          error:
            "You must be within " +
            job.geofenceMiles +
            " mile(s) of the job to submit a material request.",
        },
        { status: 403 }
      );
    }

    if (photo.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Photo must be under 10 MB" }, { status: 400 });
    }

    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = (photo.type.split("/")[1] || "jpg").split("+")[0];
    const fileName = "material-request_" + crypto.randomUUID() + "." + ext;
    const storagePath = user.orgId + "/" + jobId + "/" + fileName;

    const uploadResult = await uploadPhoto("job-photos", storagePath, buffer, photo.type);
    if (!uploadResult.ok) {
      return NextResponse.json({ error: "Photo upload failed. Try again." }, { status: 500 });
    }

    const firstRequestId = await prisma.$transaction(async (tx) => {
      const createdRequests = [];

      for (const item of items) {
        const reqId = "mreq_" + crypto.randomUUID();
        await tx.materialRequest.create({
          data: {
            id: reqId,
            jobId: job.id,
            requestedByUserId: user.id,
            itemName: item.itemName,
            qty: item.qty,
            unit: item.unit || null,
            notes: item.notes || notesRaw || null,
            status: "pending",
          },
        });
        createdRequests.push(reqId);
      }

      const photoId = "photo_" + crypto.randomUUID();
      await tx.jobPhoto.create({
        data: {
          id: photoId,
          jobId: job.id,
          uploadedByUserId: user.id,
          materialRequestId: createdRequests[0],
          photoCategory: "material",
          photoType: "request",
          imageUrl: uploadResult.path!,
          lat,
          lng,
          distanceFromJobMiles: dist,
          wasWithinGeofence: withinGeofence,
          mimeType: photo.type,
          fileSize: photo.size,
        },
      });

      return createdRequests[0];
    });

    return NextResponse.json({ ok: true, requestId: firstRequestId });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    if (err?.message === "ORG_LOCKED") {
      return NextResponse.json({ error: "This account's trial has ended. Ask your office to renew." }, { status: 403 });
    }
    console.error("Material request error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
