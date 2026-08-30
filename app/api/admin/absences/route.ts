import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUnlocked, ADMIN_ROLES } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  userId: z.string().min(1),
  absenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  excused: z.boolean(),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const actor = await requireUnlocked();
    if (!ADMIN_ROLES.includes(actor.role as any)) {
      return NextResponse.json({ error: "Only an owner or admin can record absences." }, { status: 403 });
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "That did not look right." }, { status: 400 });
    }
    const { userId, absenceDate, excused, notes } = parsed.data;

    // Same company only. Without this an admin could mark somebody at another
    // company absent.
    const target = await prisma.user.findFirst({
      where: { id: userId, orgId: actor.orgId },
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json({ error: "That person is not on your team." }, { status: 404 });
    }

    const created = await prisma.absenceNotice.create({
      data: {
        id: "abs_" + crypto.randomUUID(),
        userId,
        absenceDate: new Date(absenceDate + "T00:00:00Z"),
        excused,
        notes: notes || null,
        markedByAdminId: actor.id,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Something went wrong." }, { status: 500 });
  }
}
