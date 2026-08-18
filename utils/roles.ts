// Central role rules for the whole suite. One place decides who sees what.

// Owner + Admin: full access, INCLUDING sensitive HR documents (W-9, ID,
// background checks). Supervisor is deliberately excluded from this tier.
export function isOwnerOrAdmin(role: string): boolean {
  return role === "owner" || role === "admin";
}

// Staff = who lands on the admin command center and can run the calendar:
// owner, admin, and supervisor. (Supervisor is blocked from HR docs above.)
export function isStaff(role: string): boolean {
  return role === "owner" || role === "admin" || role === "supervisor";
}

// Where each employee role lands when they log in.
export const ROLE_HOME: Record<string, string> = {
  supervisor: "/",
  estimator: "/apps/estimating",
  sales_rep: "/apps/field-log",
  tech: "/tm/enter",
};

// Which app_keys each employee role may open (owner/admin/supervisor get all).
const ROLE_APPS: Record<string, string[]> = {
  estimator: ["estimating"],
  sales_rep: ["app_four"],
  tech: ["time_material"],
};

export function canAccess(role: string, appKey: string): boolean {
  if (isStaff(role)) return true;
  return (ROLE_APPS[role] || []).includes(appKey);
}

export function homeFor(role: string): string {
  return ROLE_HOME[role] || "/";
}
