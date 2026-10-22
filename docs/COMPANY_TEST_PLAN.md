# ReyGuild company testing

Status: development changes only. Company acceptance testing and full build verification are still required. No ChatGPT launch or live billing change is included.

## Intended flow

1. The owner signs in to the company workspace.
2. Invited employees join that company and receive their assigned access.
3. An estimator creates a proposal from the owner's outline, reviews its scope and prices, and saves it.
4. The proposal preview matches the saved version.
5. The customer receives the saved proposal and can accept it.
6. The office schedules the accepted work; the employee can record the work and hours.

This branch adds AI scope drafting to new proposals and a company assistant to the command center. Live generation remains disabled until the deployment has `REYGUILD_AI_ENABLED=true`, `AI_GATEWAY_API_KEY` and an explicitly chosen `REYGUILD_AI_MODEL`. Configure provider-side spending limits before enabling it. No live generation has been verified yet.

The assistant sees the signed-in company's name/trade and the user's message. It does not read other ChatGPT chats or all company records. It provides advice, not autonomous record changes. Drafting does not supply prices or send customer messages; the estimator applies the scope, reviews it, supplies a price, saves and sends through the existing flow.

## Commercial requirements from the owner

| Plan | Monthly price | Total people, including the owner |
| --- | --- | --- |
| Tier 1 | $25 | 3 |
| Tier 2 | $35 | 6 |
| Tier 3, working interpretation | $45 | 9 |

Free trial: 14 days. Tier 3 follows the same $10 / three-user increment; confirm that interpretation before enabling checkout. Prices are ReyGuild prices and do not include a ChatGPT subscription.

Current database billing functions use $99.99 for five people plus $5 per additional person. Keep the displayed current price consistent with those functions until the billing implementation is changed together. Payment processing is not connected in the current source.

## Changes in this branch

- Scope portal entitlements to the signed-in user; handle duplicate legacy rows consistently.
- Enforce valid trial expiry dates and accept both legacy trial status spellings.
- Require membership rather than defaulting a missing role to owner.
- Restore site-builder access for owners and administrators.
- Resolve the current portal identity and linked company before reusing a time-tracking session. Never guess an organization from an email or the number of organizations.
- Do not reactivate disabled employees during the sign-in handoff. Refresh the time-tracking role from company membership.
- Clear the previous time-tracking session during a new portal sign-in.
- Restrict sign-in, sign-out and confirmation return links to internal paths.
- Surface signup setup failures and expired confirmation links.
- Stop proposal sending when saving did not succeed; surface storage read, delete and listing errors.
- Remove the PostCSS configuration accidentally copied into the Next.js configuration.
- Allow Vercel previews to run their own code while retaining the production-domain redirect and cron exception.
- Preserve unscoped browser-local legacy data without automatically importing it into a new company.
- Add the company assistant and an outline-to-scope tool for new proposals, behind server configuration and access checks.

## Required acceptance checks

- Owner opens the command center, proposals, site builder and the time-tracking office portal.
- An invited technician reaches their own company's field portal. An apprentice cannot open estimating.
- On one shared browser, sign out of company A, sign into company B, and verify that A's jobs and hours never appear. Repeat using the same email in two companies.
- A disabled employee is refused access. A demoted employee receives the new role after opening the handoff.
- A company with no time-tracking link receives a setup explanation, not access to a different organization.
- Valid trial access works until its expiry. Expired and malformed trial records cannot grant access.
- Save a draft, reload and compare its customer, scope, line items and total.
- Simulate a failed storage read or write. Sending must stop and keep an error visible.
- Test proposal email and acceptance only with company-approved test recipients.
- Generate a scope from an outline, review questions, apply it, enter a price, save and preview. Generation must not send messages or change existing proposals.
- Confirm that missing AI configuration shows an error and preserves the outline.
- Have two estimators edit simultaneously. The legacy whole-list storage design still needs a transaction or conflict-checking review before wider rollout.

## Verification and blockers

Run `npm test` with Node.js 22.18+ or Node.js 24. Run `npm run typecheck` and `npm run build` after installing dependencies. Unit tests cover redirects, trial expiry, duplicate entitlements, role limits, T&M identity matching, preview routing, AI output validation, incomplete responses, missing configuration and provider failures. AI tests use mocked responses and do not establish live provider connectivity.

Local npm downloads are blocked by the execution environment. GitHub Actions run 39851064932 passed dependency installation, the regression tests, TypeScript and the Next.js build for commit a63b5144e2f7ba0d150a5ab5170e21c9c854099f. Browser acceptance checks and live AI verification remain outstanding. Additional route tests exercise the real AI and T&M handlers with mocked authentication, database and provider dependencies.

Vercel identified project `reyguild-site-builder` (`prj_b4zgglWccWe02xuXUj2uA7MyxCoM`) under team `team_w7Ls5kvXAegtCUav3f3Y6u3S`, but project/deployment reads returned 403 for scope `blessedelectric303-7315s-projects`. Team authorization is needed to inspect configuration, create a company test deployment, and verify it.

Supabase project: `blessed-track` (`axscfsoufvonymmjtszw`). Production schema and data have not been changed in this branch.

## Remaining implementation

1. Finish full build and browser checks, then provide a separate company test deployment.
2. Configure and verify live AI drafting and the assistant. Obtain the owner's reference outlines and confirm the first test scenario.
3. Review server-side proposal authorization, atomic storage writes and account/subscription synchronization before wider company use.
4. Implement the three plans, seat enforcement, checkout, subscription webhooks and trial lifecycle together.
5. Complete company acceptance testing before building or submitting the ChatGPT integration.
