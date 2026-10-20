import type { McpIntegration } from "./http";

// Deliberately disabled. A real issuer/account-linking resolver, fail-closed
// onboarding checks, grant revocation policy and deployment security review are
// required before implementing this factory. An environment flag alone cannot
// enable the route. Never populate this with a test actor or shared token.
export function getMcpIntegration(): McpIntegration | undefined {
  return undefined;
}
