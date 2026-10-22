import assert from "node:assert/strict";
import { beforeEach, after, test } from "node:test";
import { registerHooks } from "node:module";

const originalFetch = globalThis.fetch;
const originalEnv = Object.fromEntries(["REYGUILD_AI_ENABLED", "AI_GATEWAY_API_KEY", "REYGUILD_AI_MODEL"].map((key) => [key, process.env[key]]));
let state;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") return { url: "data:text/javascript,export const NextResponse = { json: (...args) => Response.json(...args) };", shortCircuit: true };
    if (specifier === "@/utils/supabase/server") return { url: "data:text/javascript,export async function createClient() { return globalThis.__reyguildTestClient; }", shortCircuit: true };
    if (specifier.startsWith("@/")) return { url: new URL("../" + specifier.slice(2) + ".ts", import.meta.url).href, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});

const { POST } = await import("../app/api/ai/route.ts");

beforeEach(() => {
  state = {
    user: { id: "user-1", email: "test@example.com" },
    membership: { company_id: "company-1", role: "owner" },
    entitlements: [{ status: "active", trial_ends_at: null }],
    company: { name: "Test Electric", trade: "electrical" },
    queries: [], calls: 0,
  };
  globalThis.__reyguildTestClient = {
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    schema(name) {
      assert.equal(name, "suite");
      return { from(table) {
        const query = { table, filters: {} };
        state.queries.push(query);
        const result = () => ({ data: table === "memberships" ? state.membership : table === "entitlements" ? state.entitlements : state.company, error: state.errorTable === table ? { message: "unavailable" } : null });
        const builder = {
          select() { return builder; },
          eq(key, value) { query.filters[key] = value; return builder; },
          limit() { return builder; },
          maybeSingle: async () => result(),
          then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
        };
        return builder;
      } };
    },
  };
  process.env.REYGUILD_AI_ENABLED = "true";
  process.env.AI_GATEWAY_API_KEY = "test-only";
  process.env.REYGUILD_AI_MODEL = "test/model";
  globalThis.fetch = async (_url, options) => {
    state.calls++;
    state.providerRequest = JSON.parse(options.body);
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ answer: "Test answer" }) } }] });
  };
});

after(() => {
  hooks.deregister();
  globalThis.fetch = originalFetch;
  delete globalThis.__reyguildTestClient;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

function request(body = { task: "assistant", input: "Help me plan a test job" }) {
  return new Request("https://reyguild.invalid/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

test("unauthenticated AI requests cannot reach the provider", async () => {
  state.user = null;
  assert.equal((await POST(request())).status, 401);
  assert.equal(state.calls, 0);
});

test("AI requires company membership and a role allowed to draft proposals", async () => {
  state.membership = null;
  assert.equal((await POST(request())).status, 403);
  state.membership = { company_id: "company-1", role: "apprentice" };
  assert.equal((await POST(request({ task: "proposal", input: "Replace an outlet" }))).status, 403);
  assert.equal(state.calls, 0);
});

test("expired trial access is rejected before paid provider usage", async () => {
  state.entitlements = [{ status: "trialing", trial_ends_at: "2020-01-01" }];
  assert.equal((await POST(request())).status, 403);
  assert.equal(state.calls, 0);
});

test("company and subscription lookups are scoped to the current user", async () => {
  const response = await POST(request({ task: "assistant", input: "Plan a job", company_id: "other-company", user_id: "other-user" }));
  assert.equal(response.status, 200);
  assert.deepEqual(state.queries.find((query) => query.table === "memberships").filters, { user_id: "user-1" });
  assert.deepEqual(state.queries.find((query) => query.table === "entitlements").filters, { user_id: "user-1", app_key: "time_material" });
  assert.deepEqual(state.queries.find((query) => query.table === "companies").filters, { id: "company-1" });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("missing setup and database failures fail closed", async () => {
  process.env.REYGUILD_AI_ENABLED = "false";
  assert.equal((await POST(request())).status, 503);
  process.env.REYGUILD_AI_ENABLED = "true";
  for (const table of ["memberships", "entitlements", "companies"]) {
    state.errorTable = table;
    assert.equal((await POST(request())).status, 503);
  }
  assert.equal(state.calls, 0);
});

test("invalid and oversized input never causes a model call", async () => {
  for (const body of [{ task: "send", input: "Send an email" }, { task: "assistant", input: " " }, { task: "proposal", input: "x".repeat(10001) }]) {
    const response = await POST(request(body));
    assert.ok(response.status === 400 || response.status === 413);
  }
  assert.equal(state.calls, 0);
});
