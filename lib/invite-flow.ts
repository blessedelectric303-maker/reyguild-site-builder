// Keep navigation and invitation decisions testable without contacting Supabase.
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw?.startsWith("/") || raw.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(raw)) return "/";
  try {
    const base = "https://reyguild.invalid";
    if (new URL(raw, base).origin === base) return raw;
  } catch { /* Invalid destinations stay on this site. */ }
  return "/";
}

type RpcResult = { data: unknown; error: unknown };
export type InviteLookup =
  | { kind: "pending"; token: string }
  | { kind: "none" }
  | { kind: "unavailable"; error: unknown };

export async function readInviteLookup(request: () => PromiseLike<RpcResult>): Promise<InviteLookup> {
  try {
    const { data, error } = await request();
    if (error) return { kind: "unavailable", error };
    // A failed or malformed response is never proof that an email is uninvited.
    if (!Array.isArray(data)) return { kind: "unavailable", error: null };
    if (!data.length) return { kind: "none" };
    const token = data[0]?.token;
    if (typeof token !== "string" || !token.trim()) return { kind: "unavailable", error: null };
    return { kind: "pending", token };
  } catch (error) {
    return { kind: "unavailable", error };
  }
}

export function hasVerifiedMembership(data: unknown, error: unknown, userId: string): boolean {
  if (error || !userId || !data || typeof data !== "object" || Array.isArray(data)) return false;
  const row = data as { company_id?: unknown; user_id?: unknown };
  return row.user_id === userId && typeof row.company_id === "string" && !!row.company_id.trim();
}

export function signInDestination(lookup: InviteLookup, next: string, verifiedMember: boolean): string | null {
  if (lookup.kind === "pending") return "/join/" + encodeURIComponent(lookup.token);
  if (lookup.kind === "none" || verifiedMember) return safeNextPath(next);
  return null;
}

export function inviteProblemMessage(error: unknown, operation: "lookup" | "accept" | "preview"): string {
  const detail = error && typeof error === "object" ? error as { code?: unknown; message?: unknown; status?: unknown } : {};
  const paused = detail.code === "42501" || detail.status === 403 || /permission denied/i.test(String(detail.message || ""));
  if (operation === "lookup") {
    return paused
      ? "Invitations and new-company sign-up are temporarily paused. Existing company members can still sign in. Please try again later."
      : "We couldn't check your invitation. Please try again before creating an account or opening your company.";
  }
  if (paused) return "Joining a company is temporarily paused. Please try again later or contact your office.";
  return operation === "preview"
    ? "We couldn't check this invite. Please try again or contact your office."
    : "We couldn't accept this invite. Please try again or contact your office.";
}

export function inviteEmailMatches(userEmail: unknown, inviteEmail: unknown): boolean {
  if (typeof userEmail !== "string" || typeof inviteEmail !== "string") return false;
  const actual = userEmail.trim().toLowerCase();
  return !!actual && actual === inviteEmail.trim().toLowerCase();
}

// React state is asynchronous; a synchronous lock also catches two taps in one render.
export function createSubmissionLock() {
  let locked = false;
  return {
    tryAcquire() {
      if (locked) return false;
      locked = true;
      return true;
    },
    release() { locked = false; },
    isLocked() { return locked; },
  };
}
