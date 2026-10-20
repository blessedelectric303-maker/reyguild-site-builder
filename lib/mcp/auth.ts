import { jwtVerify, type JWTVerifyGetKey, type KeyLike } from "jose";
import { assertActor, type Actor } from "../assistant/core";

export const JOBS_READ_SCOPE = "reyguild:jobs:read";
export class McpAccessError extends Error {
  constructor(public status: 401 | 403 | 503, public code: "invalid_token" | "insufficient_scope" | "not_connected") {
    super(code === "not_connected" ? "ChatGPT is not connected to ReyGuild." : "ReyGuild authorization is required.");
  }
}
export type VerifiedSubject = Readonly<{ issuer: string; subject: string }>;
export type VerifiedGrant = VerifiedSubject & { clientId: string; sessionId: string };
export type McpAuthConfig = {
  // Optional explicit provider profile. Does not configure Supabase remotely.
  supabase?: {
    clientId: string;
    // Must verify current approved read-only consent and grant/session status.
    // A signed entitlement is necessary but is not a live revocation check.
    verifyGrant: (grant: VerifiedGrant) => Promise<boolean>;
  };
  issuer: string;
  audience: string;
  key: KeyLike | JWTVerifyGetKey;
  // Implement only after the OAuth issuer-to-Suite identity mapping is verified.
  // On EVERY call: verify identity, required paperwork, exactly one membership,
  // company.tm_org_id, and active T&M user with matching role. Gate read errors
  // must deny access (do not reuse fail-open hasUnsignedDocuments). Never trust JWT
  // email/role/company claims or accept model arguments as this mapping.
  resolveActor: (identity: VerifiedSubject) => Promise<Actor | null>;
};

export function oauthScopes(config?: McpAuthConfig): string[] {
  return config?.supabase ? ["openid"] : [JOBS_READ_SCOPE];
}

function httpsUrl(value: string) {
  try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password && !u.hash && !u.search; }
  catch { return false; }
}

// Deliberately unconfigured by default. No environment flag can supply a missing
// OAuth provider or account-linking implementation. No cookie/token passthrough.
export function createMcpAuthenticator(config?: McpAuthConfig) {
  const configured = !!config && httpsUrl(config.issuer) && httpsUrl(config.audience)
    && !!config.key && typeof config.resolveActor === "function"
    && (!config.supabase || (typeof config.supabase.clientId === "string" && !!config.supabase.clientId.trim()
      && typeof config.supabase.verifyGrant === "function"));
  return async (authorization: string | null): Promise<Actor> => {
    if (!configured || !config) throw new McpAccessError(503, "not_connected");
    if (!authorization || authorization.length > 16384 || !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/i.test(authorization))
      throw new McpAccessError(401, "invalid_token");
    let payload;
    try {
      const result = await jwtVerify(authorization.slice(7), config.key as JWTVerifyGetKey, {
        issuer: config.issuer, audience: config.audience, algorithms: ["RS256", "ES256"],
        requiredClaims: ["sub", "iss", "aud", "exp", "iat"],
        ...(config.supabase ? {} : {typ: "at+jwt"}), clockTolerance: 0,
      });
      payload = result.payload;
      if (config.supabase && !["JWT", "at+jwt"].includes(result.protectedHeader.typ || ""))
        throw new Error("Invalid token type");
      if (!payload.sub?.trim() || typeof payload.iat !== "number" || payload.iat > Date.now() / 1000)
        throw new Error("Invalid subject or issue time");
    } catch { throw new McpAccessError(401, "invalid_token"); }
    if (config.supabase) {
      // Supabase scopes describe OIDC information, not app authorization. Only
      // an approved custom access-token hook may mint this app-specific claim.
      // Exact audience + client/session/entitlement distinguish access from ID
      // and regular browser tokens; JWT header type alone cannot do that.
      if (payload.aud !== config.audience || payload.client_id !== config.supabase.clientId
        || payload.role !== "authenticated" || payload.is_anonymous !== false
        || typeof payload.session_id !== "string" || !payload.session_id.trim()
        || payload.reyguild_jobs_read !== true)
        throw new McpAccessError(403, "insufficient_scope");
      try {
        if (await config.supabase.verifyGrant({issuer:config.issuer,subject:payload.sub!,
          clientId:config.supabase.clientId,sessionId:payload.session_id}) !== true) throw new Error("Grant denied");
      } catch { throw new McpAccessError(403, "insufficient_scope"); }
    } else if (typeof payload.scope !== "string" || !payload.scope.split(/\s+/).includes(JOBS_READ_SCOPE)) {
      throw new McpAccessError(403, "insufficient_scope");
    }
    // No identity or role cache: account-link/membership changes apply next call.
    // Individual OAuth grant/token revocation needs a provider-specific check
    // before runtime activation; signature verification alone is not revocation.
    try {
      const actor = await config.resolveActor({ issuer: config.issuer, subject: payload.sub! });
      if (!actor) throw new Error("Unlinked subject");
      assertActor(actor);
      return { ...actor };
    } catch { throw new McpAccessError(403, "insufficient_scope"); }
  };
}
