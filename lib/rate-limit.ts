// In-memory rate limiter. Per-instance on serverless (each warm Vercel
// instance has its own Map), so this is a brute-force speed bump, not a
// distributed-proof limiter. Upgrade path: swap the Map for the
// RateLimitAttempt table once a terminal + `prisma db push` are available.

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Returns ok:false once `limit` attempts happen within `windowMs` for a key.
 * Call once per attempt — it records the hit as a side effect.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  return {
    ok: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/**
 * Pulls a best-effort client IP from request headers. Vercel sets
 * x-forwarded-for; we take the first hop. Falls back to "unknown" so a
 * missing header doesn't crash — it just shares one bucket.
 */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
