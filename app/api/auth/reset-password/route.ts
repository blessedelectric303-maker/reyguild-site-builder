import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

const resetSchema = z.object({
  token: z.string().min(10).max(200),
  newPassword: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = resetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input. Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const { token, newPassword } = parsed.data;

    // Hash the incoming token to look it up
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: { id: true, isActive: true, orgId: true },
        },
      },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "This reset link is invalid or has already been used." },
        { status: 400 }
      );
    }

    if (resetToken.usedAt) {
      return NextResponse.json(
        { error: "This reset link has already been used. Please request a new one." },
        { status: 400 }
      );
    }

    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (!resetToken.user.isActive) {
      return NextResponse.json(
        { error: "This account is no longer active. Contact your administrator." },
        { status: 400 }
      );
    }

    const newPasswordHash = await hashPassword(newPassword);

    // Update password, mark token as used, invalidate all other sessions
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: newPasswordHash, updatedAt: new Date() },
      });

      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });

      // Kill all existing sessions — force re-login everywhere
      await tx.session.deleteMany({
        where: { userId: resetToken.userId },
      });

      await tx.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId: resetToken.user.orgId,
          actorUserId: resetToken.userId,
          actorRole: "system",
          actionType: "password_reset_completed",
          targetTable: "User",
          targetId: resetToken.userId,
          fieldChanged: "passwordHash",
          oldValue: "(hidden)",
          newValue: "(reset via email link)",
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Password reset error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
