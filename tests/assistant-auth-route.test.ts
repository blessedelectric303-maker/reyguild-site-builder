// All service boundaries are replaced in this VM: no Supabase account access,
// real Prisma connection, OpenAI requests, app credentials or external writes.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as zod from "zod";
import * as core from "../lib/assistant/core";

const actor: core.Actor = { id: "tech-a", orgId: "org-a", name: "Alex", role: "technician", locked: false };
const normal = (value: unknown) => JSON.parse(JSON.stringify(value));
function load(file: string, modules: Record<string, unknown>, env: Record<string, string | undefined> = {}) {
  const source = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} as any };
  vm.runInNewContext(source, {
    module, exports: module.exports, process: { env }, console, URL, Request, Response, Intl, Date,
    fetch: () => { throw new Error("Real network requests are forbidden in tests"); },
    require(name: string) { if (name in modules) return modules[name]; throw new Error(`Unmocked module: ${name}`); },
  });
  return module.exports;
}

type AuthOptions = { user?: any; authError?: unknown; memberships?: any; membershipError?: unknown; company?: any; companyError?: unknown; matches?: any[]; paperwork?: boolean; locked?: boolean };
function authHarness(options: AuthOptions = {}) {
  const user = "user" in options ? options.user : { id: "suite-user", email: " Tech@Example.test " };
  const calls: any[] = [];
  const memberships = "memberships" in options ? options.memberships : [{ role: "tech", company_id: "company-a" }];
  const company = "company" in options ? options.company : { tm_org_id: "org-a" };
  const client = {
    auth: { async getUser() { calls.push(["identity"]); return { data: { user }, error: options.authError || null }; } },
    schema(schema: string) { assert.equal(schema, "suite"); return { from(table: string) { return {
      select(columns: string) { return { eq(column: string, value: string) {
        calls.push([table, columns, column, value]);
        return {
          async limit(limit: number) { assert.equal(limit, 2); return { data: memberships, error: options.membershipError || null }; },
          async maybeSingle() { return { data: company, error: options.companyError || null }; },
        };
      } }; },
    }; } }; },
  };
  const module = load("lib/assistant/auth.ts", {
    "@/utils/supabase/server": { createClient: async () => client },
    "@/lib/signingGate": { async hasUnsignedDocuments() { calls.push(["paperwork"]); return options.paperwork || false; } },
    "@/lib/auth": { isOrgLocked: () => options.locked || false },
    "./core": core,
    "@/lib/prisma": { prisma: { user: { async findMany(args: any) { calls.push(["prisma", args]); return options.matches || [{ ...actor, org: {} }]; } } } },
  }, { REYGUILD_ASSISTANT_ENABLED: "true", OPENAI_API_KEY: "test-only", OPENAI_MODEL: "test-only", JWT_SECRET: "test-only" });
  return { module, calls };
}

test("assistant auth derives tenant and user from verified Suite identity with no global fallback", async () => {
  const h = authHarness(); const result = await h.module.assistantActor();
  assert.deepEqual(normal(result), actor);
  assert.deepEqual(normal(h.calls.find(c => c[0] === "memberships")), ["memberships", "role,company_id", "user_id", "suite-user"]);
  assert.deepEqual(normal(h.calls.find(c => c[0] === "companies")), ["companies", "tm_org_id", "id", "company-a"]);
  const query = h.calls.find(c => c[0] === "prisma")[1];
  assert.deepEqual(normal(query.where), { orgId: "org-a", email: { equals: "Tech@Example.test", mode: "insensitive" }, isActive: true });
  assert.equal(query.take, 2); assert.equal(query.select.org.select.subscriptionStatus, true);
  assert.equal(h.module.assistantConfigured(), true);
});

test("unauthenticated, failed auth and pending-paperwork users cannot reach company records", async () => {
  for (const opt of [{ user: null }, { user: { id: "user", email: "" } }, { authError: new Error("not authenticated") }, { paperwork: true }]) {
    const h = authHarness(opt);
    await assert.rejects(h.module.assistantActor(), (e: unknown) => e instanceof core.AssistantError && [401, 403].includes(e.status));
    assert.equal(h.calls.some(c => c[0] === "prisma"), false);
  }
});

test("missing, denied or ambiguous membership and company links fail closed before Prisma", async () => {
  for (const opt of [
    { memberships: [] }, { memberships: null }, { memberships: [{ role: "tech", company_id: "a" }, { role: "owner", company_id: "b" }] },
    { membershipError: { code: "42501" } }, { memberships: [{ role: "root", company_id: "a" }] },
    { company: null }, { company: { tm_org_id: "" } }, { companyError: { code: "42501" } },
  ]) {
    const h = authHarness(opt);
    await assert.rejects(h.module.assistantActor(), (e: unknown) => e instanceof core.AssistantError && e.status === 403);
    assert.equal(h.calls.some(c => c[0] === "prisma"), false);
  }
});

test("duplicate TM identities and Suite/TM role drift are denied rather than granting higher privileges", async () => {
  for (const matches of [[], [{ ...actor, org: {} }, { ...actor, id: "duplicate", org: {} }], [{ ...actor, role: "owner", org: {} }]]) {
    const h = authHarness({ matches });
    await assert.rejects(h.module.assistantActor(), (e: unknown) => e instanceof core.AssistantError && e.status === 403);
  }
  for (const [suiteRole, tmRole] of [["owner", "owner"], ["manager", "owner"], ["admin", "admin"], ["administrator", "admin"], ["supervisor", "technician"], ["estimator", "technician"], ["sales_rep", "technician"], ["apprentice", "apprentice"]]) {
    const h = authHarness({ memberships: [{ role: suiteRole, company_id: "company-a" }], matches: [{ ...actor, role: tmRole, org: {} }] });
    assert.equal((await h.module.assistantActor()).role, tmRole);
  }
  assert.equal((await authHarness({ locked: true }).module.assistantActor()).locked, true);
});

function routeHarness(options: { confirm?: boolean; enabled?: boolean; authError?: unknown; rateLimited?: boolean; saveError?: unknown; actor?: core.Actor } = {}) {
  const counts = { auth: 0, answer: 0, save: 0, provider: 0 };
  let captured: any;
  const module = load(options.confirm ? "app/api/assistant/confirm/route.ts" : "app/api/assistant/route.ts", {
    "next/server": { NextResponse: { json: Response.json } },
    "zod": zod,
    "@/lib/prisma": { prisma: {} },
    "@/lib/rate-limit": { rateLimit: () => ({ ok: !options.rateLimited }) },
    "@/lib/assistant/auth": { async assistantActor() { counts.auth++; if (options.authError) throw options.authError; return options.actor || actor; }, assistantConfigured: () => options.enabled !== false },
    "@/lib/assistant/core": core,
    "@/lib/assistant/records": { createRecords: () => ({ async saveNote(note: unknown) { counts.save++; captured = note; if (options.saveError) throw options.saveError; return { ok: true, message: "saved", source: { label: "Job", href: "/tm/tech/jobs/job-a" } }; } }) },
    "@/lib/assistant/service": {
      openAIProvider: () => { counts.provider++; return async () => ({ output: [] }); },
      async answerQuestion(input: unknown) { counts.answer++; captured = input; return { reply: "Mock answer", sources: [] }; },
    },
  }, { JWT_SECRET: "test-only", OPENAI_API_KEY: "test-only", OPENAI_MODEL: "test-only" });
  return { module, counts, captured: () => captured };
}
const question = { messages: [{ role: "user", content: "What is scheduled?" }], consent: true, timeZone: "UTC" };
const request = (body: unknown, headers = { origin: "https://reyguild.test" }) => new Request("https://reyguild.test/api/assistant", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });

test("API discovery requires auth, reports disabled state and never calls OpenAI", async () => {
  const ready = routeHarness({ enabled: false });
  const response = await ready.module.GET(); assert.equal(response.status, 200); assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual((await response.json()).actor, { name: "Alex" }); assert.equal(ready.counts.provider, 0);
  const denied = routeHarness({ authError: new core.AssistantError("Sign in", 401) });
  const error = await denied.module.GET(); assert.equal(error.status, 401); assert.equal((await error.json()).available, false);
});

test("chat API rejects CSRF, disabled service, missing consent, extra fields and bad time zones before model use", async () => {
  for (const [opt, body, headers, status] of [
    [{}, question, { origin: "https://attacker.test" }, 403],
    [{ enabled: false }, question, undefined, 503],
    [{ rateLimited: true }, question, undefined, 429],
    [{}, { ...question, consent: false }, undefined, 400],
    [{}, { ...question, role: "owner" }, undefined, 400],
    [{}, { ...question, timeZone: "fake/not-a-zone" }, undefined, 400],
    [{}, "not JSON", undefined, 400],
    [{}, "x".repeat(24001), undefined, 413],
  ] as const) {
    const h = routeHarness(opt);
    const result = await h.module.POST(request(body, headers));
    assert.equal(result.status, status); assert.equal(h.counts.answer, 0); assert.equal(h.counts.provider, 0); assert.equal(h.counts.save, 0);
    assert.equal(result.headers.get("Cache-Control"), "no-store");
  }
});

test("discovered capabilities reflect apprentice/estimator detail limits and subscription write lock", async () => {
  for (const role of ["apprentice", "estimator"]) {
    const h = routeHarness({ actor: { ...actor, role } });
    const body = await (await h.module.GET()).json();
    assert.ok(body.capabilities.includes("Read your hours")); assert.ok(body.capabilities.includes("Find authorized jobs"));
    assert.equal(body.capabilities.includes("Save a reviewed activity note"), false);
    assert.equal(body.capabilities.includes("Read job descriptions and permitted prices"), false);
  }
  const h = routeHarness({ actor: { ...actor, locked: true } });
  assert.equal((await (await h.module.GET()).json()).capabilities.includes("Save a reviewed activity note"), false);
});

test("valid chat passes server-derived actor and secrets, never writes records", async () => {
  const h = routeHarness(); const result = await h.module.POST(request(question));
  assert.equal(result.status, 200); assert.equal(h.counts.answer, 1); assert.equal(h.counts.save, 0);
  assert.deepEqual(normal(h.captured().actor), actor); assert.equal(h.captured().secret, "test-only");
});

test("confirmation requires explicit true, valid exact signed token and fresh auth", async () => {
  const token = core.createNoteToken(actor, { jobId: "job-a", text: "Installed fixture." }, "test-only");
  for (const body of ["not JSON", { token, confirmed: false }, { token }, { token, confirmed: true, text: "Invented replacement" }, { token: "invalid", confirmed: true }, { token: core.createNoteToken({ ...actor, orgId: "other" }, { jobId: "job-a", text: "Installed fixture." }, "test-only"), confirmed: true }]) {
    const h = routeHarness({ confirm: true }); const result = await h.module.POST(request(body));
    assert.equal(result.status, 400); assert.equal(h.counts.save, 0);
  }
  const h = routeHarness({ confirm: true }); const result = await h.module.POST(request({ token, confirmed: true }));
  assert.equal(result.status, 200); assert.equal(h.counts.auth, 1); assert.equal(h.counts.save, 1);
  assert.equal(h.captured().text, "Installed fixture."); assert.equal(h.captured().actorId, actor.id);
  assert.equal(result.headers.get("Cache-Control"), "no-store");
});

test("confirmation failure distinguishes definite denial from unknown result and advises same-token retry", async () => {
  const token = core.createNoteToken(actor, { jobId: "job-a", text: "Installed fixture." }, "test-only");
  for (const [saveError, status, pattern] of [[new core.AssistantError("Job closed", 409), 409, /Job closed/], [new Error("private database details"), 500, /Retry the same confirmation/]] as const) {
    const h = routeHarness({ confirm: true, saveError }); const result = await h.module.POST(request({ token, confirmed: true }));
    assert.equal(result.status, status); const body = await result.json(); assert.match(body.error, pattern); assert.doesNotMatch(body.error, /private database/);
  }
});
