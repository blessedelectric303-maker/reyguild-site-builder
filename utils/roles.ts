// Central role rules for the whole suite. One place decides who sees what.
//
// FIVE ROLES. Anything else is a leftover and gets treated as tech.
//
//   owner       Owner / Manager - everything
//   admin       Administrator   - everything
//   supervisor  Supervisor      - both apps, no command center
//   tech        Tech / Estimator- both apps, no command center
//   apprentice  Apprentice      - T and M and P and L only
//
// "estimator" and "sales_rep" used to be separate roles. They are folded into
// tech, because a tech who prices work is still the same person on the phone.

export type RoleKey = "owner" | "admin" | "supervisor" | "tech" | "apprentice";

export const ROLE_LABELS: Record<string, string> = {
  owner: "Owner / Manager",
  admin: "Administrator",
  supervisor: "Supervisor",
  tech: "Tech / Estimator",
  apprentice: "Apprentice",
};

// The order they are offered and listed in - most senior first.
export const ROLE_ORDER: RoleKey[] = [
  "owner",
  "admin",
  "supervisor",
  "tech",
  "apprentice",
];

// Old role names still sitting in the database map onto the new ones.
const ALIASES: Record<string, RoleKey> = {
  manager: "owner",
  administrator: "admin",
  estimator: "tech",
  sales_rep: "tech",
  technician: "tech",
};

export function normalizeRole(role: string | null | undefined): RoleKey {
  const r = (role || "").trim().toLowerCase();
  if (r === "owner" || r === "admin" || r === "supervisor" || r === "tech" || r === "apprentice") {
    return r as RoleKey;
  }
  return ALIASES[r] || "tech";
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[normalizeRole(role)] || role;
}

// Owner + Admin: everything, INCLUDING sensitive HR documents.
export function isOwnerOrAdmin(role: string): boolean {
  const r = normalizeRole(role);
  return r === "owner" || r === "admin";
}

// Who gets the command center. Only the office tier. A supervisor runs the
// work from his phone, not from the calendar - that was Ben's call and it is
// the one thing here that is a business decision rather than a technical one.
export function isStaff(role: string): boolean {
  return isOwnerOrAdmin(role);
}

// Which apps each role may open.
//   time_material = T and M and P and L
//   estimating    = Proposals and Invoicing
const ROLE_APPS: Record<RoleKey, string[]> = {
  owner: ["time_material", "estimating", "app_four"],
  admin: ["time_material", "estimating", "app_four"],
  supervisor: ["time_material", "estimating"],
  tech: ["time_material", "estimating"],
  apprentice: ["time_material"],
};

export function canAccess(role: string, appKey: string): boolean {
  return (ROLE_APPS[normalizeRole(role)] || []).includes(appKey);
}

// Where each role lands after signing in.
export const ROLE_HOME: Record<RoleKey, string> = {
  owner: "/",
  admin: "/",
  supervisor: "/tm/enter",
  tech: "/tm/enter",
  apprentice: "/tm/enter",
};

export function homeFor(role: string): string {
  return ROLE_HOME[normalizeRole(role)] || "/tm/enter";
}

// The suite role decides the T and M role. Supervisor, tech and apprentice
// all live on the phone; only the office tier gets the T and M admin screens.
export function tmRoleFor(role: string): string {
  const r = normalizeRole(role);
  if (r === "owner") return "owner";
  if (r === "admin") return "admin";
  if (r === "apprentice") return "apprentice";
  return "technician";
}
