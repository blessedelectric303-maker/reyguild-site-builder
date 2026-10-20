# Session identity hardening: staged rollout notes

This patch is local and has not changed a live deployment, credential or database.
It preserves the existing schema, UI, logos, session lifetime and password login.

## Behavior

- `/tm/enter` clears its prior T&M cookie and verifies the current Suite identity,
  exactly one company membership, an explicit company-to-organization link and
  matching current role before issuing a session. Missing links must be repaired
  through the authorized company setup process, never guessed from a single org.
- Every newly issued JWT has a unique random JTI, including concurrent requests.
- Tokens record either password-login provenance or Suite provenance. Suite tokens
  bind the verified Suite user and company; every `getCurrentUser()` call rechecks
  Suite identity, membership, organization, email and role. Signed-out users,
  account switches, removed memberships, failed membership queries and role drift
  invalidate that request without exposing the old company's records.
- The Suite calendar resolves Suite identity directly rather than preferring any
  T&M cookie. Standalone T&M password sessions cannot choose the Suite calendar's
  tenant. Standalone T&M login and its other authorized T&M endpoints remain.
- Legacy tokens without provenance are rejected. Existing users may need to sign
  in again or reopen the Suite T&M entry link after deployment. No database purge
  is needed; an old session row cannot bypass the JWT provenance guard.
- No roles are silently elevated or synchronized. Inactive users are not recreated
  as active; duplicate case-insensitive email records are denied by the bridge and
  Suite calendar. Legitimate first-entry provisioning remains within a verified org.

## Review and release gates

Review this authentication behavior before deployment; it intentionally trades
old-session continuity for verified company isolation. Use an isolated test tenant
and real sign-ins to verify Suite owner/admin/tech/apprentice, password-only T&M,
account switches, sign-out, role changes, membership removal, duplicate identities,
missing company links, parallel entry and calendar reads/writes. Test the current
paperwork and subscription gates separately; this patch does not change their
policies. Do not relax containment or grant database access to pass these checks.

Offline tests use synthetic auth and database boundaries and do not prove live
Supabase RLS, actual PostgreSQL behavior, browser cookies or role configuration.
Roll back code only via an authorized deployment; rolling back to code accepting
unmarked sessions also reintroduces the old session-isolation behavior.
