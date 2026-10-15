# Scoped field assistant (draft integration)

This change is built against the current repository, not a recovered copy of the
previous field-assistant update ZIP. Do not enable in production until the release
checks below pass. It preserves the existing logo, gold/navy styling, pages,
forms, clock/GPS/photo requirements, roles and database permissions.

## Implemented scope

- Optional assistant panel, hidden unless the server flag is explicitly enabled.
- Questions about authorized job summaries, permitted job details and the signed-in
  user's own time entries. Owner/admin job prices are allowed; wage, payroll,
  private HR, GPS telemetry and credentials are not read by assistant tools.
- Server-created source links and bounded searches/date ranges. Instructions require
  current records, clarification of ambiguity and disclosure of missing data.
- Literal user-reported activity notes, reviewed before saving. Each save writes an
  existing JobStatusUpdate plus an AuditLog in one serializable transaction.
  Signed reviews bind note, job, user and company; retries use the same IDs.
- Optional browser dictation and spoken replies. In hands-free mode a note must
  finish its exact spoken readback before the user says exactly "confirm".
  "Cancel" does not write. Browser microphone support varies; typing remains.
- Existing workflow links for clocking, materials, procedures, proposals, invoices,
  schedule and audit, with role checks. These links do not execute those workflows.
- Friendly paused-invitation errors and fail-closed signup decisions. A failed
  invite lookup cannot silently turn an invited employee into a new owner.

## Deliberately not implemented

Automatic time entries or corrections; wages/payroll; job completion; dispatch;
material purchasing/request submission; measuring or pricing work; sending
proposals/invoices/messages; permission changes; broad document/procedure search;
background continuous recording; offline voice; unbounded autonomous actions.
The assistant is not the complete hands-free business workflow yet.

## Authentication and writes

Every request re-verifies the Suite user, exactly one company membership, its
T&M organization link, one active matching T&M user and synchronized role. No
stale T&M session, global-email or single-company fallback authorizes the assistant.
The existing paperwork and subscription rules still apply. Company queries always
include the organization; field job queries also require assignment. Apprentices
can read their assigned summaries and own hours, not job details or write notes.

POSTs require same-origin requests. No model tool writes directly. A confirmation
rechecks current access, subscription and job state. Activity is explicitly labeled
as user-reported; it never proves time worked, material use or job completion.
The same review token can safely be retried after an uncertain response. Review
expires after ten minutes; do not create a new note to resolve an uncertain save
without checking the job activity/audit first.

No migrations or database grants are included. Keep existing containment in place.

## Configuration and data handling

The server needs all of these to use OpenAI:

- REYGUILD_ASSISTANT_ENABLED=true (unset/false keeps the panel out of the layout)
- OPENAI_MODEL: an owner-approved Responses API model with function tools
- OPENAI_API_KEY: supplied only through the hosting provider's secure secret UI
- Existing JWT_SECRET, existing app/Supabase and Prisma configuration

Do not put credentials in source or browser variables. No credentials were added,
no paid API calls were made, and no production flag was changed for this patch.
Enabling requires explicit approval of credentials, model cost and the transmission
of questions plus authorized job records to OpenAI. The panel also asks for session
consent. Browser speech may use the browser vendor's speech service.

The Responses adapter uses strict allow-listed tools, store=false, encrypted
reasoning round-trips, bounded tool rounds and a timeout. Conversation is in browser
memory, not a database transcript. This is not a promise of provider zero retention;
review the organization's provider settings and data policy before enabling.
The inherited in-memory per-user rate limiter is not a distributed spending cap.
Set and verify account-level usage controls before any live testing.

## Validation

Run from a clean checkout using a supported Node version (Node 22 recommended):

```sh
npm ci
npm test
npm run build -- --webpack
npm run typecheck
```

The build uses the app's existing environment settings. Offline build validation
used synthetic Supabase placeholders and a non-running localhost PostgreSQL URL;
it did not connect to a customer database. Unit/route/component tests replace
OpenAI, Supabase, Prisma and speech boundaries with controlled synthetic fixtures.

Optional real React/Chromium fixture:

```sh
npx playwright install chromium
npm run test:browser
```

Set CHROMIUM_PATH only when using an existing compatible Chromium executable.
The browser fixture still mocks the API and microphone. Its presence is not proof
of live end-to-end behavior. Real-browser execution was blocked in the current
runner, so screenshots, device voice and live database behavior remain unverified.

## Release gates and rollback

1. Confirm this repository/commit maps to the intended ReyGuild hosting project.
2. Obtain authorized hosting access; do not bypass an unauthorized project scope.
3. Use an isolated preview/test tenant and verified auth redirect URLs. Preview
   Vercel hosts no longer redirect to production; production canonical behavior stays.
4. Verify owner/admin/technician/apprentice and cross-tenant denial with real sign-ins,
   including paperwork, revoked assignment, role drift and expired subscriptions.
5. Verify the real PostgreSQL transaction: two simultaneous same-token confirmations
   and a lost response must yield one note and one audit. Verify rollback on failure.
6. Test real provider answers against known records, adversarial embedded job text,
   missing/ambiguous facts, time zones and negated statements before enabling.
7. Test Chrome/Safari/mobile visual layout, microphone permissions, spoken readback,
   cancel, close/navigation, network failure, existing login and existing forms.
8. Confirm model budget/data-handling approval, then explicitly enable for preview.
   Only promote a verified preview after these checks; a passing build is not launch.

Rollback: unset REYGUILD_ASSISTANT_ENABLED and redeploy to remove the panel and
reject assistant API use. Existing confirmed notes/audit remain as ordinary records.
This additive patch does not require a schema rollback. Keep invite guards while
invitation RPCs remain paused.
