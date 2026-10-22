import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { registerHooks } from "node:module";

let state;
const moduleUrl = (source) => "data:text/javascript," + encodeURIComponent(source);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    const mocks = {
      "next/server": "export const NextResponse = { redirect: (url) => Response.redirect(url, 307) };",
      "@/utils/supabase/server": "export async function createClient() { return globalThis.__tmBridge.client; }",
      "@/lib/prisma": "export const prisma = { user: { findFirst: async (query) => { globalThis.__tmBridge.lookups.push(query); return globalThis.__tmBridge.found; }, upsert: async (query) => { globalThis.__tmBridge.upserts.push(query); return { id: 'tm-user', ...query.create }; } } };",
      "@/lib/auth": "export async function getCurrentUser() { return globalThis.__tmBridge.existing; } export async function clearSessionCookie() { globalThis.__tmBridge.cleared++; } export async function createSessionToken(id) { globalThis.__tmBridge.minted.push(id); return 'test-token'; } export async function setSessionCookie(token) { globalThis.__tmBridge.cookie = token; }",
      "@/lib/signingGate": "export async function hasUnsignedDocuments() { return false; }",
    };
    if (mocks[specifier]) return { url: moduleUrl(mocks[specifier]), shortCircuit: true };
    if (specifier.startsWith("@/")) return { url: new URL("../" + specifier.slice(2) + ".ts", import.meta.url).href, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const { GET } = await import("../app/tm/enter/route.ts");

beforeEach(() => {
  state = {
    user: { id: "portal-user", email: "employee@example.com", email_confirmed_at: "2026-10-01", user_metadata: {} },
    membership: { company_id: "company-b", role: "tech" },
    company: { tm_org_id: "org-b" },
    existing: null, found: null, cleared: 0, minted: [], lookups: [], upserts: [],
  };
  state.client = {
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    schema() { return { from(table) {
      const query = { select() { return query; }, eq() { return query; }, limit() { return query; },
        maybeSingle: async () => ({ data: table === "memberships" ? state.membership : state.company, error: state.error ? { message: "offline" } : null }) };
      return query;
    } }; },
  };
  globalThis.__tmBridge = state;
});
after(() => { hooks.deregister(); delete globalThis.__tmBridge; });
const open = (query = "") => GET(new Request("https://reyguild.invalid/tm/enter" + query));

test("an old T&M session cannot bypass a missing portal login", async () => {
  state.user = null;
  state.existing = { orgId: "org-a", role: "owner", email: "owner@example.com", isActive: true };
  const result = await open("?next=/tm/admin/jobs");
  assert.match(result.headers.get("location"), /^https:\/\/reyguild.invalid\/login\?/);
  assert.equal(state.cleared, 1);
  assert.equal(state.lookups.length, 0);
});

test("missing membership and missing company links cannot fall back to another organization", async () => {
  state.membership = null;
  assert.match((await open()).headers.get("location"), /reason=membership/);
  state.membership = { company_id: "company-b", role: "tech" };
  state.company = { tm_org_id: null };
  assert.match((await open()).headers.get("location"), /reason=nolink/);
  assert.equal(state.lookups.length, 0);
  assert.equal(state.minted.length, 0);
});

test("cross-company cookies are replaced using only the linked organization", async () => {
  state.existing = { orgId: "org-a", email: state.user.email, role: "owner", isActive: true };
  assert.equal((await open()).headers.get("location"), "https://reyguild.invalid/tm/tech");
  assert.equal(state.lookups[0].where.orgId, "org-b");
  assert.deepEqual(state.upserts[0].where.orgId_email, { orgId: "org-b", email: "employee@example.com" });
  assert.equal(state.upserts[0].update.role, "technician");
  assert.equal(state.cleared, 1);
  assert.deepEqual(state.minted, [state.upserts[0].create.id]);
});

test("a matching current session is reused without minting another one", async () => {
  state.existing = { orgId: "org-b", email: state.user.email, role: "technician", isActive: true };
  assert.equal((await open()).headers.get("location"), "https://reyguild.invalid/tm/tech");
  assert.equal(state.cleared, 0);
  assert.equal(state.lookups.length, 0);
  assert.equal(state.minted.length, 0);
});

test("disabled employees and unverified email addresses cannot create sessions", async () => {
  state.found = { email: state.user.email, isActive: false };
  assert.match((await open()).headers.get("location"), /reason=inactive/);
  assert.equal(state.upserts.length, 0);
  state.user.email_confirmed_at = null;
  assert.match((await open()).headers.get("location"), /reason=unverified/);
  assert.equal(state.minted.length, 0);
});

test("a role change replaces old privileges and external return paths are ignored", async () => {
  state.existing = { orgId: "org-b", email: state.user.email, role: "owner", isActive: true };
  assert.equal((await open("?next=//example.com")).headers.get("location"), "https://reyguild.invalid/tm/tech");
  assert.equal(state.upserts[0].update.role, "technician");
});
