export type Entitlement = {
  status: string | null;
  trial_ends_at?: string | null;
};

export function entitlementState(
  entitlement: Entitlement | null | undefined,
  now = Date.now(),
): "active" | "trial" | "expired" | "locked" {
  if (entitlement?.status === "active") return "active";
  if (entitlement?.status !== "trial" && entitlement?.status !== "trialing") return "locked";
  const end = Date.parse(entitlement.trial_ends_at || "");
  return Number.isFinite(end) && end > now ? "trial" : "expired";
}

export function hasAppAccess(entitlements: Entitlement[] | null | undefined, now = Date.now()): boolean {
  return (entitlements || []).some((entitlement) => {
    const state = entitlementState(entitlement, now);
    return state === "active" || state === "trial";
  });
}

// Multiple legacy rows must not make access depend on whichever row arrived last.
export function bestEntitlement<T extends Entitlement>(entitlements: T[], now = Date.now()): T | undefined {
  const rank = { active: 3, trial: 2, expired: 1, locked: 0 };
  return [...entitlements].sort((a, b) =>
    rank[entitlementState(b, now)] - rank[entitlementState(a, now)] ||
    (Date.parse(b.trial_ends_at || "") || 0) - (Date.parse(a.trial_ends_at || "") || 0)
  )[0];
}
