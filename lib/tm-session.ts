type Identity = {
  orgId: string;
  email: string;
  role: string;
};

export function canReuseTmSession(
  sessionUser: (Identity & { isActive: boolean }) | null,
  identity: Identity,
): boolean {
  return !!sessionUser && sessionUser.isActive &&
    sessionUser.orgId === identity.orgId &&
    sessionUser.email.trim().toLowerCase() === identity.email.trim().toLowerCase() &&
    sessionUser.role === identity.role;
}
