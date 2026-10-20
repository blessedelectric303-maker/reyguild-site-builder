import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { SignJWT, jwtVerify } from "jose";

function load(file: string, modules: Record<string, any>, globals: any = {}) {
  const source = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} as any };
  vm.runInNewContext(source, { module, exports: module.exports, TextEncoder, Date, ...globals, require(name: string) { assert.ok(name in modules, `Unexpected module ${name}`); return modules[name]; } });
  return module.exports;
}
const identity = { suiteUserId: "suite-a", companyId: "company-a", orgId: "org-a", email: "tech@example.test", role: "technician" };
const user = { id: "tm-a", orgId: "org-a", email: "Tech@Example.test", role: "technician", isActive: true };
const key = "synthetic-session-provenance-key";
async function session(options: any = {}) {
  let lookups = 0, dbReads = 0;
  const claims = options.claims === undefined ? { source: "suite", suiteUserId: "suite-a", companyId: "company-a" } : options.claims;
  const token = await new SignJWT({ userId: "tm-a", ...claims }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(key));
  const auth = load("lib/auth.ts", {
    "next/headers": { cookies: async () => ({ get: () => options.noCookie ? undefined : { value: token } }) },
    "bcryptjs": {}, "jose": { SignJWT, jwtVerify },
    "./suite-identity": { async verifiedSuiteIdentity() { lookups++; return "identity" in options ? options.identity : identity; } },
    "./prisma": { prisma: { session: { async findUnique() { dbReads++; return options.missing ? null : { expiresAt: new Date(Date.now() + (options.expired ? -1000 : 3600000)), user: options.user || user }; } } } },
  }, { process: { env: { JWT_SECRET: key } } });
  return { result: await auth.getCurrentUser(), lookups, dbReads };
}

test("Suite-derived session matches fresh identity, company, email and role", async () => {
  const h = await session(); assert.equal(h.result.id, "tm-a"); assert.equal(h.lookups, 1);
});
test("Suite session denies signed-out, switched account, revoked membership and changed company/role", async () => {
  for (const changed of [null, { ...identity, suiteUserId: "suite-b" }, { ...identity, companyId: "company-b" }, { ...identity, orgId: "org-b" }, { ...identity, email: "other@example.test" }, { ...identity, role: "owner" }]) {
    assert.equal((await session({ identity: changed })).result, null);
  }
});
test("Suite provenance requires both signed user and company binding", async () => {
  for (const claims of [{ source: "suite" }, { source: "suite", suiteUserId: "suite-a" }, { source: "suite", companyId: "company-a" }]) assert.equal((await session({ claims })).result, null);
});
test("password-derived standalone sessions remain valid without Suite authentication", async () => {
  const h = await session({ claims: { source: "password" }, identity: null }); assert.equal(h.result.id, "tm-a"); assert.equal(h.lookups, 0);
});
test("legacy unmarked and unknown-provenance sessions require reauthentication", async () => {
  for (const claims of [{}, { source: "legacy" }, { source: "__proto__" }, { source: ["password"] }]) {
    const h = await session({ claims }); assert.equal(h.result, null); assert.equal(h.dbReads, 0);
  }
});
test("missing, expired, inactive and mismatched session records cannot authorize either origin", async () => {
  for (const options of [{ noCookie: true }, { missing: true }, { expired: true }, { user: { ...user, isActive: false } }, { user: { ...user, id: "tm-b" } }]) {
    assert.equal((await session(options)).result, null);
    assert.equal((await session({ ...options, claims: { source: "password" } })).result, null);
  }
});

function suiteHarness(options: any = {}) {
  const calls: any[] = [];
  const module = load("lib/suite-identity.ts", {
    "@/utils/supabase/server": { createClient: async () => ({
      auth: { getUser: async () => ({ data: { user: options.noUser ? null : { id: "suite-a", email: " Tech@Example.test " } }, error: options.authError }) },
      schema(schema: string) { assert.equal(schema, "suite"); return { from(table: string) { return { select() { return { eq(column: string, value: string) {
        calls.push([table, column, value]); return {
          limit: async (n: number) => { assert.equal(n, 2); return { data: options.memberships === undefined ? [{ company_id: "company-a", role: "tech" }] : options.memberships, error: options.membershipError }; },
          maybeSingle: async () => ({ data: options.company === undefined ? { tm_org_id: "org-a" } : options.company, error: options.companyError }),
        };
      } }; } }; } }; },
    }) },
    "@/lib/prisma": { prisma: { user: { async findMany(query: any) {
      calls.push(["tm", query]); assert.deepEqual(JSON.parse(JSON.stringify(query.where)), { orgId: "org-a", email: { equals: "tech@example.test", mode: "insensitive" } });
      return options.matches === undefined ? [user] : options.matches;
    } } } },
  });
  return { module, calls };
}

test("fresh Suite identity scopes memberships, company and T&M lookup", async () => {
  const h = suiteHarness(); assert.deepEqual(JSON.parse(JSON.stringify(await h.module.verifiedSuiteIdentity())), identity);
  assert.equal((await h.module.verifiedSuiteTmUser()).id, "tm-a");
  assert.deepEqual(h.calls[0], ["memberships", "user_id", "suite-a"]);
  assert.deepEqual(h.calls[1], ["companies", "id", "company-a"]);
});
test("Suite resolver denies unavailable, ambiguous, unlinked and unknown-role identities before T&M", async () => {
  for (const options of [{ noUser: true }, { authError: {} }, { memberships: [] }, { memberships: null }, { memberships: [{ company_id: "a", role: "tech" }, { company_id: "b", role: "owner" }] }, { membershipError: {} }, { company: null }, { company: {} }, { companyError: {} }, { memberships: [{ company_id: "a", role: "__proto__" }] }]) {
    const h = suiteHarness(options); assert.equal(await h.module.verifiedSuiteTmUser(), null); assert.equal(h.calls.some(c => c[0] === "tm"), false);
  }
});
test("Suite calendar identity rejects duplicate, inactive and role-drift T&M users", async () => {
  for (const matches of [[], [user, { ...user, id: "tm-b" }], [{ ...user, isActive: false }], [{ ...user, role: "owner" }]]) {
    assert.equal(await suiteHarness({ matches }).module.verifiedSuiteTmUser(), null);
  }
});
test("calendar identity cannot select a tenant through the legacy cookie-first resolver", () => {
  const source = fs.readFileSync(new URL("../app/api/calendar/route.ts", import.meta.url), "utf8");
  assert.equal(source.includes("getCurrentUser"), false);
  assert.match(source, /const whoami = verifiedSuiteTmUser/);
});
