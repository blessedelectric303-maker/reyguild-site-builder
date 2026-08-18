import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  token: z.string().min(10).max(500),
});

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid or missing token." },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(parsed.data.token);

    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: {
        user: { select: { id: true, name: true, email: true, emailVerifiedAt: true } },
        org: { select: { id: true, name: true } },
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: "This link is invalid. Please request a new verification email." },
        { status: 400 }
      );
    }

    if (record.consumedAt) {
      // Already used — but if user is already verified, treat as success
      if (record.user.emailVerifiedAt) {
        return NextResponse.json({ ok: true, alreadyVerified: true });
      }
      return NextResponse.json(
        { error: "This link has already been used." },
        { status: 400 }
      );
    }

    if (record.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This link has expired. Please request a new verification email." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { tokenHash },
        data: { consumedAt: new Date() },
      });
      await tx.user.update({
        where: { id: record.user.id },
        data: { emailVerifiedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId: record.org.id,
          actorUserId: record.user.id,
          actorRole: "owner",
          actionType: "email_verified",
          targetTable: "User",
          targetId: record.user.id,
          newValue: record.user.email,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Verify email error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
