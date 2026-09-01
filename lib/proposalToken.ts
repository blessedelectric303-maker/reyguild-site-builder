import { createHmac, timingSafeEqual } from "crypto";

// The link a customer clicks in a follow-up email.
//
// It is signed, not guessable. A raw estimate id in a URL would let anybody
// accept anybody else's proposal by editing a number in the address bar, and
// would let a competitor walk the whole list. The signature is an HMAC over
// company + estimate, so a token only works for the one proposal it was made
// for, and only if it came from us.
//
// No expiry in the token itself. The 60 day proposal window is a business
// rule and lives with the proposal, not in the cryptography - a customer who
// clicks an old link should be told it has expired, not shown a broken page.

function secret(): string {
  const s =
    process.env.PROPOSAL_LINK_SECRET ||
    process.env.CRON_SECRET ||
    process.env.JWT_SECRET ||
    "";
  if (!s) throw new Error("No signing secret set.");
  return s;
}

function b64url(b: Buffer): string {
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function signProposal(companyId: string, refId: string): string {
  const payload = b64url(Buffer.from(companyId + "." + refId, "utf8"));
  const mac = b64url(createHmac("sha256", secret()).update(payload).digest()).slice(0, 27);
  return payload + "." + mac;
}

export function verifyProposal(token: string): { companyId: string; refId: string } | null {
  try {
    const bits = String(token || "").split(".");
    if (bits.length !== 2) return null;
    const [payload, mac] = bits;

    const expect = b64url(createHmac("sha256", secret()).update(payload).digest()).slice(0, 27);
    // Constant time, so the comparison cannot be timed to guess a signature
    // one character at a time.
    const a = Buffer.from(mac);
    const b = Buffer.from(expect);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const raw = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const i = raw.indexOf(".");
    if (i < 0) return null;
    return { companyId: raw.slice(0, i), refId: raw.slice(i + 1) };
  } catch {
    return null;
  }
}
