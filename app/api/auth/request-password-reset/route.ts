import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const requestSchema = z.object({
  email: z.string().email().max(255),
});

// Always responds with success, regardless of whether the email exists.
// This prevents account enumeration — attackers can't tell which emails are registered.
export async function POST(req: Request) {
  try {
    // Rate limit: 5 per hour per IP. To preserve anti-enumeration, a blocked
    // request still returns { ok: true } — it just silently skips the work.
    const ip = getClientIp(req);
    const limit = rateLimit("pwreset:" + ip, 5, 60 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json({ ok: true });
    }

    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      // Even on bad input, return generic success message
      return NextResponse.json({ ok: true });
    }

    const email = parsed.data.email.toLowerCase().trim();

    // Email is unique per-org, so one address can match users in multiple orgs.
    // Send a reset for every active matching account.
    const users = await prisma.user.findMany({
      where: { email, isActive: true },
      select: { id: true, name: true, email: true, orgId: true },
    });for (const user of users) {
      // Clean up any existing unused tokens for this user (1 active reset at a time)
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });

      // Generate a 32-byte random token, hex-encoded (64 chars)
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          id: "prt_" + crypto.randomUUID(),
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      // Send email (async, don't block response on send failure)
      await sendPasswordResetEmail({
        to: user.email,
        userName: user.name,
        resetToken: rawToken,
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId: user.orgId,
          actorUserId: user.id,
          actorRole: "system",
          actionType: "password_reset_requested",
          targetTable: "User",
          targetId: user.id,
          fieldChanged: null,
          oldValue: null,
          newValue: null,
        },
      });
    }

    // Always return success — don't leak whether the email exists
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Password reset request error:", err);
    // Even on server errors, return ok to avoid leaking info
    return NextResponse.json({ ok: true });
  }
}
