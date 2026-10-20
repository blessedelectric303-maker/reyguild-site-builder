import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
import ts from "typescript";
import { SignJWT, jwtVerify, decodeJwt } from "jose";

test("same-second and concurrent session creation produce unique tokens without changing identity or expiry", async () => {
  const rows: any[] = [];
  const key = "synthetic-offline-only-session-signing-key";
  // Freeze signer timestamps by subclassing the real jose signer; cryptography
  // and JTI handling stay real. Prisma is the only persistence boundary.
  const now = Math.floor(Date.now() / 1000);
  class FixedTimeSignJWT extends SignJWT {
    setIssuedAt() { return super.setIssuedAt(now); }
    setExpirationTime() { return super.setExpirationTime(now + 365 * 86400); }
  }
  const modules: Record<string, any> = {
    "next/headers": { cookies() { assert.fail("No browser cookie needed to mint tokens"); } },
    "bcryptjs": {},
    "jose": { SignJWT: FixedTimeSignJWT, jwtVerify },
    "./suite-identity": { verifiedSuiteIdentity() { assert.fail("Minting never reads identity"); } },
    "./prisma": { prisma: { session: { async create({ data }: any) {
      assert.equal(rows.some(row => row.token === data.token), false, "Session.token must be unique even within one second"); rows.push(data);
    } } } },
  };
  const module = { exports: {} as any };
  const source = ts.transpileModule(fs.readFileSync(new URL("../lib/auth.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, TextEncoder, Date, crypto, process: { env: { JWT_SECRET: key } }, require(name: string) { assert.ok(name in modules); return modules[name]; } });
  const tokens = await Promise.all([module.exports.createSessionToken("user-a", { source: "password" }), module.exports.createSessionToken("user-a", { source: "password" }), module.exports.createSessionToken("user-a", { source: "password" })]);
  assert.equal(new Set(tokens).size, 3); assert.equal(rows.length, 3);
  for (const token of tokens) {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(key));
    assert.equal(payload.userId, "user-a"); assert.equal(payload.source, "password"); assert.equal(payload.iat, now); assert.equal(payload.exp, now + 365 * 86400);
    assert.match(String(payload.jti), /^[a-f0-9-]{36}$/);
  }
  assert.equal(new Set(tokens.map((token: string) => decodeJwt(token).jti)).size, 3);
});
