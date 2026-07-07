// Central role rules for the whole suite. One place decides who sees what.

export function isStaff(role: string): boolean {
  return role === "owner" || role === "admin";
}

// Where each employee role lands when they log in.
export const ROLE_HOME: Record<string, string> = {
  estimator: "/apps/estimating",
  sales_rep: "/apps/field-log",
  tech: "https://tm.serviceopspro.com",
};

// Which app_keys each employee role may open (owner/admin get everything).
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
