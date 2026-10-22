import assert from "node:assert/strict";
import test from "node:test";
import { safePath } from "../lib/safe-path.ts";
import { bestEntitlement, entitlementState, hasAppAccess } from "../lib/entitlements.ts";
import { canAccess, tmRoleFor } from "../utils/roles.ts";
import { canReuseTmSession } from "../lib/tm-session.ts";
import { shouldRedirectDeployment } from "../lib/deployment-routing.ts";

test("auth redirects preserve internal pages and query parameters", () => {
  assert.equal(safePath("/apps/estimating?tab=clients#new"), "/apps/estimating?tab=clients#new");
  assert.equal(safePath("/reset-password"), "/reset-password");
});

test("auth redirects reject external URLs and browser normalization tricks", () => {
  for (const value of [null, "", "https://example.com", "//example.com", "/\\example.com", "/\t/example.com", "/\n/example.com", "javascript:alert(1)"]) {
    assert.equal(safePath(value), "/", JSON.stringify(value));
  }
  assert.equal(safePath("//example.com", "/tm/admin"), "/tm/admin");
});

const now = Date.parse("2026-10-22T12:00:00Z");

test("active access does not depend on an old trial date", () => {
  assert.equal(entitlementState({ status: "active", trial_ends_at: "2020-01-01" }, now), "active");
});

test("both trial spellings require a valid future expiry", () => {
  for (const status of ["trial", "trialing"]) {
    assert.equal(entitlementState({ status, trial_ends_at: "2026-10-23T12:00:00Z" }, now), "trial");
    for (const trial_ends_at of [null, "invalid", "2026-10-22T12:00:00Z", "2026-10-21T12:00:00Z"]) {
      assert.equal(entitlementState({ status, trial_ends_at }, now), "expired");
    }
  }
});

test("canceled, unknown and missing access stay locked", () => {
  for (const status of ["canceled", "past_due", "paused", "unknown", null]) {
    assert.equal(hasAppAccess([{ status }], now), false);
  }
  assert.equal(hasAppAccess(null, now), false);
});

test("duplicate records cannot hide an active plan or valid trial", () => {
  const rows = [
    { status: "trialing", trial_ends_at: "2026-10-20" },
    { status: "active", trial_ends_at: null },
    { status: "locked", trial_ends_at: null },
  ];
  assert.equal(bestEntitlement(rows, now)?.status, "active");
  assert.equal(hasAppAccess(rows, now), true);
  assert.equal(hasAppAccess(rows.reverse(), now), true);
  assert.equal(bestEntitlement([], now), undefined);
});

test("site builder is available to office roles, while field roles retain their limits", () => {
  for (const role of ["owner", "admin"]) assert.equal(canAccess(role, "site_builder"), true);
  for (const role of ["tech", "supervisor", "apprentice"]) assert.equal(canAccess(role, "site_builder"), false);
  assert.equal(canAccess("apprentice", "estimating"), false);
  assert.equal(tmRoleFor("tech"), "technician");
  assert.equal(tmRoleFor("supervisor"), "technician");
});

test("a T&M session is reusable only for the current company, person and role", () => {
  const identity = { orgId: "company-b", email: "employee@example.com", role: "technician" };
  assert.equal(canReuseTmSession({ ...identity, isActive: true }, identity), true);
  assert.equal(canReuseTmSession({ ...identity, email: "EMPLOYEE@example.com", isActive: true }, identity), true);
  for (const session of [
    null,
    { ...identity, isActive: false },
    { ...identity, orgId: "company-a", isActive: true },
    { ...identity, email: "owner@example.com", isActive: true },
    { ...identity, role: "owner", isActive: true },
  ]) assert.equal(canReuseTmSession(session, identity), false);
});

test("company previews run preview code while production keeps its canonical domain", () => {
  assert.equal(shouldRedirectDeployment("preview.vercel.app", "/apps/estimating", "preview"), false);
  assert.equal(shouldRedirectDeployment("production.vercel.app", "/apps/estimating", "production"), true);
  assert.equal(shouldRedirectDeployment("production.vercel.app", "/api/cron/snapshot", "production"), false);
  assert.equal(shouldRedirectDeployment("tm.serviceopspro.com", "/", "production"), false);
});
