import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  companyName: z.string().min(2).max(200),
  ownerName: z.string().min(2).max(100),
  email: z.string().email().max(200).toLowerCase(),
  phone: z.string().max(50).optional().nullable(),
  password: z.string().min(8).max(200),
  acceptedTerms: z.boolean(),
});

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function POST(req: Request) {
  try {
    // Rate limit: 3 signups per hour per IP, before any DB work.
    const ip = getClientIp(req);
    const limit = rateLimit("signup:" + ip, 3, 60 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please wait a while and try again." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || "Invalid input. Please check all fields." },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (!data.acceptedTerms) {
      return NextResponse.json(
        { error: "You must accept the Terms to sign up." },
        { status: 400 }
      );
    }

    // Email uniqueness is now per-org. A signup always creates a NEW org, so it
    // can never collide with an existing one — no pre-check needed. The same
    // email is allowed to own more than one company.

    const orgId = "org_" + crypto.randomUUID();
    const userId = "user_" + crypto.randomUUID();
    const tokenId = "evt_" + crypto.randomUUID();

    const passwordHash = await hashPassword(data.password);
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);

    const now = new Date();
    const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const verifyExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000);await prisma.$transaction(async (tx) => {
      // Create org
      await tx.organization.create({
        data: {
          id: orgId,
          name: data.companyName.trim(),
          tradeType: "electrical",
          ownerName: data.ownerName.trim(),
          phone: data.phone || null,
          subscriptionStatus: "trial",
          trialEndsAt: trialEnds,
        },
      });

      // Create owner user
      await tx.user.create({
        data: {
          id: userId,
          orgId,
          email: data.email,
          name: data.ownerName.trim(),
          passwordHash,
          role: "owner",
          phone: data.phone || null,
          isActive: true,
        },
      });

      // Create verification token
      await tx.emailVerificationToken.create({
        data: {
          id: tokenId,
          userId,
          orgId,
          tokenHash,
          expiresAt: verifyExpires,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          id: "audit_" + crypto.randomUUID(),
          orgId,
          actorUserId: userId,
          actorRole: "owner",
          actionType: "org_signup",
          targetTable: "Organization",
          targetId: orgId,
          newValue: data.companyName.trim() + " (" + data.email + ")",
        },
      });
    });

    // Send verification email (non-fatal if it fails — user can request resend)
    try {
      await sendVerificationEmail({
        to: data.email,
        userName: data.ownerName.trim(),
        companyName: data.companyName.trim(),
        verificationToken: rawToken,
      });
    } catch (emailErr) {
      console.error("Signup email send failed (non-fatal):", emailErr);
    }

    return NextResponse.json({
      ok: true,
      email: data.email,
    });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
