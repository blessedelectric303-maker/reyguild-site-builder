# Read-only ChatGPT / MCP implementation

Status: **offline-tested, disabled implementation; ChatGPT is not connected.**
The real runtime factory returns undefined. Both MCP and discovery routes return
503 `not_connected`. No flag can enable them. No credentials, OAuth grants,
provider configuration, deployment, production queries or OpenAI API calls were
created. The existing in-app assistant and its default-off flag are unchanged.

## Implemented safely offline

- Official `@modelcontextprotocol/sdk` 1.32.1, pinned with lockfile, handles
  Streamable HTTP JSON-RPC initialization, tool listing and tool calls. No
  custom protocol implementation. Each request gets a fresh server/transport;
  JSON mode is stateless. GET/SSE and DELETE return 405 after authentication.
- `/api/mcp` and `/.well-known/oauth-protected-resource/api/mcp` have Next route
  handlers. Exact middleware bypasses prevent cookie refresh on these two paths.
  No other route's authentication changes.
- `lib/mcp/http.ts` provides RFC 9728 metadata and 401/403 WWW-Authenticate
  challenges, tool-level `mcp/www_authenticate` metadata, HTTPS canonical-host
  and explicit-origin guards, a 32 KiB observed body limit, and no-store responses.
- `search_jobs` and `get_job_status` reuse existing `createRecords` scopes.
  Every query is company-bound; field roles additionally require assignment.
  Status selects only job ID, customer name, address, status and scheduled dates.
  There is no pricing, notes, payroll, HR, customer contacts or GPS exposure.
- Strict bounded inputs accept no company, role, identity or authorization
  arguments. Both tools are annotated read-only. There are no write tools.
- `lib/mcp/auth.ts` uses existing `jose` to check signatures, explicit HTTPS
  issuer/resource audience, ES256/RS256 allowlist, access-token `at+jwt` type,
  subject, expiry and issue time. The generic profile requires `at+jwt` and
  exact `reyguild:jobs:read` scope. The explicit Supabase profile below uses
  resource/client/session/entitlement/grant validation instead of custom scopes.
  ID tokens, shared static tokens and browser cookies are rejected.
- Server-side account resolution runs on each discovery/call, including a fresh
  check at tool execution. Token email/company/role claims never select an actor.
  Account/membership revocation is distinguished from OAuth grant revocation:
  the latter needs a provider-specific check or reviewed expiry policy before
  activation; a signed JWT alone does not prove an OAuth grant remains active.
- Error responses do not expose database/provider internals. No tokens are logged.

## Deliberately missing production integration

`lib/mcp/runtime.ts` has no configured database/auth integration.
`McpAuthConfig.resolveActor({ issuer, subject })` has no production implementation.
Do not fill it with a fixture actor or assume an external `sub` is a Suite ID.
Never link by unverified email, reuse standalone `getCurrentUser`/calendar cookie
identity, or forward an MCP token to an unrelated API.

The resolver must establish verified Suite identity, required paperwork, exactly
one membership, supported Suite role mapping, the company's explicit `tm_org_id`,
exactly one active T&M user in that organization, and matching T&M role on every
request. Deny missing/ambiguous links, role drift, revoked membership and failed
gate reads. The existing `hasUnsignedDocuments` helper intentionally fails open
on database errors; do not reuse it as a connector authorization gate. A stricter
connector gate is an explicit new integration policy, not a claim that the
existing browser behavior changed.

## Existing Supabase Auth candidate

Supabase documents OAuth 2.1 with existing user identities, PKCE, discovery and
client registration, so it is the first provider to evaluate. Enabling the server,
registering a client or changing tokens/RLS requires owner approval; none was done.

Default Supabase tokens are incompatible: documented `aud` is `authenticated`,
and its OIDC scopes (`openid`, `email`, `profile`, `phone`) do not limit API data.
Supabase does support per-client audience/custom-claim changes through a Custom
Access Token Hook. It does not support requesting arbitrary custom OAuth scopes.

An explicit, **unconfigured** Supabase verifier profile is implemented locally:

- Exact singleton MCP resource audience and pinned issuer/key/algorithm.
- One configured/allowlisted OAuth `client_id`, `role=authenticated`,
  `is_anonymous=false`, nonempty `sub` and `session_id`.
- Signed top-level `reyguild_jobs_read === true`. This is our proposed custom
  entitlement, NOT an existing database column or a standard Supabase claim.
- Required live `verifyGrant({issuer,subject,clientId,sessionId})` returning
  literal true only for currently approved read-only consent and active grant/
  session. It has no production implementation and errors deny access.
- Standard requested scope `openid` in discovery/tools/challenges. This scope
  does not itself grant job access; all the checks above remain mandatory.
- `JWT` or `at+jwt` header types only for this explicit profile. Access/ID-token
  separation relies on exact resource audience plus client/session/entitlement,
  not header type. Normal ID tokens target the OAuth client ID, not this resource.

The eventual owner-approved hook must inspect `event.claims.client_id`, allowlist
only the intended registered client, and issue resource audience plus entitlement
only after explicit bounded read consent. Preserve required standard claims and
leave unrelated browser/client tokens unchanged. Do not copy examples assuming
`client_id` lives at the top level of the event. Verify actual minted access/ID
headers and claims, consent storage, grant APIs and revocation semantics before
activation. No hook, entitlement, consent schema or approved client exists merely
because the verifier profile is present. If the real provider cannot satisfy this
contract, retain 503 and choose a separately reviewed alternative.

## Exact remaining steps to a private connection

1. Confirm provider compatibility above, using official docs and the actual
   project's supported settings. Decide the issuer, canonical resource URL,
   app-specific permission and OAuth grant revocation policy.
2. Obtain owner approval for specific OAuth/server/client/security changes.
   Configure authorization-code PKCE S256, exact redirect URI, consent screen
   and supported predefined/CIMD/DCR client registration. Avoid unnecessary DCR.
3. Implement trusted issuer-pinned JWKS and subject-to-Suite resolution with a
   fail-closed onboarding check. Add grant/client checks and production rate
   limiting, timeouts/cancellation, and any host-required mTLS gateway checks.
   Never take JWKS URL, issuer or account mapping from unverified tokens/inputs.
4. Integration-test against at least two test tenants, changed/revoked roles and
   grants, completed/incomplete onboarding, real PostgreSQL scopes and RLS.
   Confirm tokens cannot be used at the wrong resource and that unrelated OAuth
   clients cannot access these tools. Review customer/address data consent.
5. Implement the runtime factory only after these checks, then obtain deployment
   approval and privately deploy to the verified canonical HTTPS URL. No public
   directory submission is necessary for an initial private developer connection.
6. Connect through the supported ChatGPT private/developer flow, complete real
   OAuth consent, and verify initialize/list/search/status plus refresh, denial,
   unlink/revoke, reconnect and tenant isolation. Do not describe it as connected
   until this end-to-end test succeeds.

Safe code already completed before provider authorization: official SDK transport,
disabled routes, metadata/challenges, token verifier, tenant-scoped tools, strict
schemas, redacted failures and offline transport/security tests. Provider-specific
account/grant wiring needs verified capabilities and approved security changes.
No `OPENAI_API_KEY`, model flag or paid Responses API request is needed for tools.

## Verification

Run `npm test` and `npm run typecheck`. Adapter tests use ephemeral in-memory keys
and DB/account fixtures. HTTP tests use the real SDK with synthetic Request objects,
including initialize/list/call, auth discovery, no cookies, wrong origins/hosts,
body limits, tool-time revocation, and disabled actual route exports. They do not
prove production OAuth consent, provider refresh/revocation, real RLS/PostgreSQL,
or an actual ChatGPT connection. Browser UI is unchanged.

## Official references

- https://developers.openai.com/plugins/build/auth
- https://developers.openai.com/plugins/build/mcp-server
- https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
- https://github.com/modelcontextprotocol/typescript-sdk/tree/v1.x
- https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication
- https://supabase.com/docs/guides/auth/oauth-server/token-security
- https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
- https://github.com/supabase/auth/blob/master/internal/tokens/service.go
