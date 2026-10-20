// Synthetic boundaries only. No real auth, database, credentials or writes.
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { safeNextPath } from "../lib/invite-flow";

function harness(options: any = {}) {
  const events: any[] = [];
  const user = options.user === undefined ? { id: "suite-a", email: " Tech@Example.test ", user_metadata: { full_name: "Test Tech" } } : options.user;
  const memberships = options.memberships === undefined ? [{ company_id: "company-a", role: "tech" }] : options.memberships;
  let matches = options.matches === undefined ? [{ id: "tm-a", orgId: "org-a", role: "technician", isActive: true }] : options.matches;
  const company = options.company === undefined ? { tm_org_id: "org-a" } : options.company;
  const sb = {
    auth: { async getUser() { events.push(["identity"]); return { data: { user }, error: options.authError }; } },
    schema(name: string) { assert.equal(name, "suite"); return { from(table: string) { return { select() { return { eq(column: string, value: string) {
      events.push([table, column, value]);
      return { async limit(n: number) { assert.equal(n, 2); return { data: memberships, error: options.membershipError }; }, async maybeSingle() { return { data: company, error: options.companyError }; } };
    } }; } }; } }; },
  };
  const modules: Record<string, any> = {
    "next/server": { NextResponse: { redirect: (url: URL) => Response.redirect(url, 307) } },
    "@/lib/signingGate": { async hasUnsignedDocuments() { events.push(["paperwork"]); return options.paperwork || false; } },
    "@/utils/supabase/server": { createClient: async () => sb },
    "@/lib/invite-flow": { safeNextPath },
    "@/lib/auth": {
      async clearSessionCookie() { events.push(["clear"]); if (options.clearError) throw new Error("cookie failed"); },
      async getCurrentUser() { assert.fail("An old T&M session cannot authorize entry"); },
      async createSessionToken(id: string, provenance: any) { assert.deepEqual(JSON.parse(JSON.stringify(provenance)), { source: "suite", suiteUserId: "suite-a", companyId: "company-a" }); events.push(["mint", id]); return "synthetic-token"; },
      async setSessionCookie(token: string) { events.push(["cookie", token]); },
    },
    "@/lib/prisma": { prisma: { user: {
      async findMany(query: any) { events.push(["find", query]); assert.equal(query.where.orgId, "org-a"); assert.deepEqual(JSON.parse(JSON.stringify(query.where.email)), { equals: "tech@example.test", mode: "insensitive" }); assert.equal(query.take, 2); return matches; },
      async create(args: any) { events.push(["create", args]); matches = [{ id: args.data.id, orgId: args.data.orgId, role: args.data.role, isActive: true }]; if (options.createError) throw { code: options.createError }; return matches[0]; },
    }, organization: { findMany() { assert.fail("No global/single-org fallback"); } } } },
  };
  const source = ts.transpileModule(fs.readFileSync(new URL("../app/tm/enter/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} as any };
  vm.runInNewContext(source, { module, exports: module.exports, URL, Response, crypto: { randomUUID: () => "test-id" }, require(name: string) { assert.ok(name in modules, `Unexpected module ${name}`); return modules[name]; } });
  return { events, async enter(next = "") { return module.exports.GET(new Request("https://reyguild.test/tm/enter" + (next ? "?next=" + encodeURIComponent(next) : ""))); } };
}
function location(response: Response) { return new URL(response.headers.get("location")!); }
function noMint(h: ReturnType<typeof harness>) { assert.equal(h.events.some(e => ["mint", "cookie", "create"].includes(e[0])), false); assert.equal(h.events[0][0], "clear"); }

test("T&M bridge clears stale cookie and verifies current identity before issuing an org-bound session", async () => {
  const h = harness(); assert.equal(location(await h.enter()).pathname, "/tm/tech");
  assert.deepEqual(h.events.slice(0, 3), [["clear"], ["identity"], ["paperwork"]]);
  assert.deepEqual(h.events.find(e => e[0] === "memberships"), ["memberships", "user_id", "suite-a"]);
  assert.deepEqual(h.events.find(e => e[0] === "companies"), ["companies", "id", "company-a"]);
  assert.deepEqual(h.events.find(e => e[0] === "mint"), ["mint", "tm-a"]);
});

test("signed-out and failed-auth identities go to login regardless of requested destination", async () => {
  for (const option of [{ user: null }, { authError: new Error("expired") }]) {
    const h = harness(option); assert.equal(location(await h.enter("/tm/admin")).pathname, "/login"); noMint(h);
    assert.equal(h.events.some(e => e[0] === "find"), false);
  }
});

test("missing email, unsigned paperwork and failed cookie clearing cannot create sessions", async () => {
  for (const [options, pathname] of [[{ user: { id: "a" } }, "/tm/no-access"], [{ paperwork: true }, "/onboarding"], [{ clearError: true }, "/tm/no-access"]] as const) {
    const h = harness(options); assert.equal(location(await h.enter()).pathname, pathname); noMint(h);
  }
});

test("missing, denied, duplicate or unknown-role memberships fail closed before any T&M lookup", async () => {
  for (const options of [{ memberships: [] }, { memberships: null }, { membershipError: {} }, { memberships: [{ company_id: "a", role: "tech" }, { company_id: "b", role: "owner" }] }, { memberships: [{ company_id: "a", role: "unknown" }] }, { memberships: [{ role: "tech" }] }, { memberships: [{ company_id: "a", role: "__proto__" }] }]) {
    const h = harness(options); assert.equal(location(await h.enter()).searchParams.get("reason"), "nolink"); noMint(h); assert.equal(h.events.some(e => e[0] === "find"), false);
  }
});

test("missing company links never use a single organization or global email as a fallback", async () => {
  for (const options of [{ company: null }, { company: {} }, { companyError: {} }]) {
    const h = harness(options); assert.equal(location(await h.enter()).searchParams.get("reason"), "nolink"); noMint(h); assert.equal(h.events.some(e => e[0] === "find"), false);
  }
});

test("inactive, duplicate or role-drift T&M identities are denied without repair or reactivation", async () => {
  for (const matches of [[{ id: "x", role: "technician", isActive: false }], [{ id: "x", role: "owner", isActive: true }], [{ id: "x", role: "technician", isActive: true }, { id: "y", role: "technician", isActive: true }]]) {
    const h = harness({ matches }); assert.equal(location(await h.enter()).searchParams.get("reason"), "nouser"); noMint(h);
  }
});

test("one-invite provisioning retains only verified company and recognized role", async () => {
  const h = harness({ matches: [] }); assert.equal(location(await h.enter()).pathname, "/tm/tech");
  const data = h.events.find(e => e[0] === "create")[1].data;
  assert.equal(data.orgId, "org-a"); assert.equal(data.role, "technician"); assert.equal(data.email, "tech@example.test"); assert.equal(data.name, "Test Tech");
  assert.equal(h.events.filter(e => e[0] === "mint").length, 1);
});

test("parallel provisioning rereads a uniqueness conflict; other creation failures cannot mint", async () => {
  const parallel = harness({ matches: [], createError: "P2002" }); assert.equal(location(await parallel.enter()).pathname, "/tm/tech"); assert.equal(parallel.events.filter(e => e[0] === "find").length, 2);
  const failed = harness({ matches: [], createError: "P1001" }); assert.equal(location(await failed.enter()).searchParams.get("reason"), "nouser"); assert.equal(failed.events.some(e => e[0] === "mint"), false);
});

test("bridge rejects protocol-relative, backslash and control-character redirects", async () => {
  for (const next of ["//evil.test", "/\\evil.test", "/\tevil.test", "https://evil.test"]) {
    const h = harness(); const target = location(await h.enter(next)); assert.equal(target.origin, "https://reyguild.test"); assert.equal(target.pathname, "/tm/tech");
  }
  assert.equal(location(await harness().enter("/tm/tech/jobs/a?tab=hours#activity")).href, "https://reyguild.test/tm/tech/jobs/a?tab=hours#activity");
});

test("owner/admin aliases and apprentice land in their established portals", async () => {
  for (const [suiteRole, role, home] of [["owner", "owner", "/tm/admin"], ["administrator", "admin", "/tm/admin"], ["apprentice", "apprentice", "/tm/tech"], ["supervisor", "technician", "/tm/tech"]]) {
    const h = harness({ memberships: [{ company_id: "company-a", role: suiteRole }], matches: [{ id: "x", role, isActive: true }] }); assert.equal(location(await h.enter()).pathname, home);
  }
});
