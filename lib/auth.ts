import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";

const SESSION_COOKIE = "blessed_track_session";
const SESSION_DAYS = 30;

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET env var is not set");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(userId: string): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  const jwt = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());

  await prisma.session.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      token: jwt,
      expiresAt,
    },
  });

  return jwt;
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = payload.userId as string;
    if (!userId) return null;

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: { include: { org: true } } },
    });

    if (!session || session.expiresAt < new Date()) return null;
    if (!session.user.isActive) return null;

    return session.user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireRole(roles: string[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}// Returns true when an org's trial has ended and they are not on a paid plan.
// Deliberately fail-OPEN: a null trialEndsAt or "active" status never locks,
// so we never accidentally lock out a paying customer or a manually-created org.
export function isOrgLocked(org: {
  subscriptionStatus: string | null;
  trialEndsAt: Date | null;
}): boolean {
  if (!org) return false;
  if (org.subscriptionStatus === "active") return false;
  if (!org.trialEndsAt) return false;
  return org.trialEndsAt.getTime() < Date.now();
}

// Write-lock guard for MUTATING routes only (POST/PATCH/DELETE).
// Combines role check + org trial-lock so a locked org goes read-only:
// reads still work, writes throw ORG_LOCKED. Pass roles to enforce role in
// the same call; omit roles to lock writes for any logged-in user (tech
// write endpoints). Prisma-backed  -  route handlers ONLY, never Edge middleware.
export async function requireUnlocked(roles?: string[]) {
  const user = roles ? await requireRole(roles) : await requireUser();
  if (isOrgLocked(user.org)) throw new Error("ORG_LOCKED");
  return user;
}

export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  ESTIMATOR: "estimator",
  TECHNICIAN: "technician",
  APPRENTICE: "apprentice",
} as const;

export const ADMIN_ROLES = [ROLES.OWNER, ROLES.ADMIN];
export const ALL_OFFICE_ROLES = [ROLES.OWNER, ROLES.ADMIN, ROLES.ESTIMATOR];
