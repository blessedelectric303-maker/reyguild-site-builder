import assert from "node:assert/strict";
import test from "node:test";
import { generateKeyPairSync } from "node:crypto";
import { generateKeyPair, SignJWT, type KeyLike } from "jose";
import type { PrismaClient } from "@prisma/client";
import { createMcpJobAdapter, mcpJobTools } from "../lib/mcp/adapter";
import { createMcpAuthenticator, JOBS_READ_SCOPE, McpAccessError, type McpAuthConfig } from "../lib/mcp/auth";
import type { Actor } from "../lib/assistant/core";

// Ephemeral test keys only, generated in memory, never saved or registered.
const keys = generateKeyPairSync("ec", { namedCurve: "P-256" });
const issuer = "https://identity.example.test/";
const audience = "https://reyguild.example.test/mcp";
const actor: Actor = { id: "tech-a", orgId: "org-a", role: "technician", name: "Alex", locked: false };
const auth: McpAuthConfig = { issuer, audience, key: keys.publicKey, resolveActor: async () => actor };
async function token(claims: Record<string, unknown> = {}, key: KeyLike = keys.privateKey, typ = "at+jwt") {
  return "Bearer " + await new SignJWT({ scope: JOBS_READ_SCOPE, ...claims })
    .setProtectedHeader({ alg: "ES256", typ }).setSubject(String(claims.sub ?? "suite-user-a"))
    .setIssuer(String(claims.iss ?? issuer)).setAudience(String(claims.aud ?? audience))
    .setIssuedAt(Number(claims.iat ?? Math.floor(Date.now() / 1000)))
    .setExpirationTime(Number(claims.exp ?? Math.floor(Date.now() / 1000) + 300)).sign(key);
}
const denied = (status: number) => (error: unknown) => error instanceof McpAccessError && error.status === status;

test("default and incomplete configuration fail closed without querying anything", async () => {
  const adapter = createMcpJobAdapter({} as PrismaClient);
  await assert.rejects(adapter.callTool(null, "search_jobs", {query:""}), denied(503));
  await assert.rejects(adapter.listTools(await token()), denied(503));
  await assert.rejects(createMcpAuthenticator({...auth, issuer:"http://identity.example.test"})(await token()), denied(503));
  await assert.rejects(createMcpAuthenticator({...auth, resolveActor: undefined} as unknown as McpAuthConfig)(await token()), denied(503));
});

test("missing, malformed, expired, wrong signature/issuer/audience and ID tokens denied before identity lookup", async () => {
  let lookups = 0;
  const authenticate = createMcpAuthenticator({...auth, resolveActor:async () => { lookups++; return actor; }});
  const wrongKey = await generateKeyPair("ES256");
  for (const value of [null, "", "Basic fake", "Bearer fake", "Bearer a.b.c", await token({exp:1}),
    await token({iss:"https://attacker.example.test/"}), await token({aud:issuer}),
    await token({}, wrongKey.privateKey), await token({}, keys.privateKey, "JWT"),
    await token({iat:Math.floor(Date.now()/1000)+1000}), await token({sub:" "})])
    await assert.rejects(authenticate(value), denied(401));
  assert.equal(lookups, 0);
});

test("unsigned, symmetric, premature and incomplete access tokens are denied", async () => {
  const authenticate = createMcpAuthenticator(auth);
  const validClaims = {iss:issuer,aud:audience,sub:"suite-user-a",iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300,scope:JOBS_READ_SCOPE};
  for (const absent of ["exp","iat","sub","iss","aud"]) {
    const claims:Record<string,unknown>={...validClaims};delete claims[absent];
    const value=await new SignJWT(claims).setProtectedHeader({alg:"ES256",typ:"at+jwt"}).sign(keys.privateKey);
    await assert.rejects(authenticate("Bearer "+value),denied(401));
  }
  await assert.rejects(authenticate(await token({nbf:Math.floor(Date.now()/1000)+1000})),denied(401));
  const symmetric=await new SignJWT(validClaims).setProtectedHeader({alg:"HS256",typ:"at+jwt"}).sign(new Uint8Array(32));
  await assert.rejects(authenticate("Bearer "+symmetric),denied(401));
  const unsigned=Buffer.from(JSON.stringify({alg:"none",typ:"at+jwt"})).toString("base64url")+"."+Buffer.from(JSON.stringify(validClaims)).toString("base64url")+".";
  await assert.rejects(authenticate("Bearer "+unsigned),denied(401));
});

test("scope is exact and identity/role/company are never taken from token claims", async () => {
  let identity: unknown;
  const authenticate = createMcpAuthenticator({...auth,resolveActor:async value => {identity=value; return actor;}});
  for (const scope of [undefined, "", "reyguild:jobs:read-all", "openid", [JOBS_READ_SCOPE]])
    await assert.rejects(authenticate(await token({scope})),denied(403));
  const result = await authenticate(await token({role:"owner",orgId:"org-b",email:"owner@example.test"}));
  assert.deepEqual(result, actor);
  assert.deepEqual(identity,{issuer,subject:"suite-user-a"});
});

test("account resolver runs on every call and revocation immediately denies access", async () => {
  let active=true, lookups=0;
  const adapter=createMcpJobAdapter({} as PrismaClient,{...auth,resolveActor:async () => {lookups++;return active?actor:null;}});
  const bearer=await token();
  assert.equal((await adapter.listTools(bearer)).tools.length,2);
  active=false;
  await assert.rejects(adapter.callTool(bearer,"search_jobs",{query:""}),denied(403));
  assert.equal(lookups,2);
  for (const resolveActor of [async()=>{throw new Error("database credentials must not leak");},async()=>({...actor,role:"unknown"})])
    await assert.rejects(createMcpAuthenticator({...auth,resolveActor})(bearer),denied(403));
});

function fixture(role="technician") {
  const queries: any[]=[];
  const rows=[
    {id:"a",orgId:"org-a",assigned:["tech-a"],customerName:"A",jobAddress:"A road",status:"scheduled",scheduledStart:new Date("2026-10-21T12:00:00Z"),scheduledEnd:null,salePrice:999},
    {id:"a-other",orgId:"org-a",assigned:["tech-other"],customerName:"Other",jobAddress:"B road",status:"scheduled",scheduledStart:null,scheduledEnd:null,salePrice:999},
    {id:"b",orgId:"org-b",assigned:["tech-a"],customerName:"Foreign",jobAddress:"Secret road",status:"scheduled",scheduledStart:null,scheduledEnd:null,salePrice:999},
  ];
  function query(args:any) {
    queries.push(args);
    assert.equal(args.where.orgId,"org-a");
    assert.deepEqual(Object.keys(args.select).sort(),["customerName","id","jobAddress","scheduledStart",...(args.select.scheduledEnd?["scheduledEnd"]:[]),"status"].sort());
    return rows.filter(r=>r.orgId===args.where.orgId&&(!args.where.id||r.id===args.where.id)&&(!args.where.assignments||r.assigned.includes(args.where.assignments.some.userId)))
      .map(row=>Object.fromEntries(Object.keys(args.select).map(key=>[key,(row as any)[key]])));
  }
  const db={job:{findFirst:async(args:any)=>query(args)[0]??null,findMany:async(args:any)=>query(args)},
    $transaction:()=>assert.fail("Read-only tools must never start writes") } as unknown as PrismaClient;
  return {queries,adapter:createMcpJobAdapter(db,{...auth,resolveActor:async()=>({...actor,role})})};
}

test("tools enforce tenant and assignment boundaries, exposing only bounded job summaries/status", async () => {
  const {adapter,queries}=fixture();const bearer=await token();
  const search=await adapter.callTool(bearer,"search_jobs",{query:""});
  assert.deepEqual((search.structuredContent?.jobs as any[]).map(j=>j.id),["a"]);
  assert.equal(queries[0].take,21);
  const status=await adapter.callTool(bearer,"get_job_status",{jobId:"a"});
  assert.equal(status.structuredContent?.scheduledStart,"2026-10-21T12:00:00.000Z");
  assert.equal("salePrice" in status.structuredContent!,false);
  const failures=[];
  for (const jobId of ["b","a-other","missing"])
    failures.push(await adapter.callTool(bearer,"get_job_status",{jobId}));
  assert.ok(failures.every(r=>r.isError));
  assert.deepEqual(failures[0],failures[1]);assert.deepEqual(failures[1],failures[2]);
  assert.ok(queries.every(q=>q.where.assignments.some.userId==="tech-a"));
});

test("office can read own-company jobs only; apprentice remains assignment-scoped", async () => {
  const bearer=await token();
  for (const role of ["owner","admin","apprentice"]) {
    const {adapter}=fixture(role);
    const result=await adapter.callTool(bearer,"search_jobs",{query:""});
    assert.deepEqual((result.structuredContent?.jobs as any[]).map(j=>j.id),role==="apprentice"?["a"]:["a","a-other"]);
    assert.equal((await adapter.callTool(bearer,"get_job_status",{jobId:"b"})).isError,true);
  }
});

test("extra tenant/role/auth arguments, invalid inputs and all write tools are rejected without DB calls", async () => {
  const {adapter,queries}=fixture();const bearer=await token();
  for (const [name,input] of [["search_jobs",{query:"",orgId:"org-b"}],["search_jobs",{query:"",role:"owner"}],
    ["search_jobs",{query:"",authorization:bearer}],["search_jobs",{query:"x".repeat(201)}],
    ["get_job_status",{jobId:""}],["get_job_status",{jobId:"a",companyId:"org-b"}],
    ["save_note",{}],["propose_activity_note",{}],["clock_in",{}],["__proto__",{}]] as const)
    assert.equal((await adapter.callTool(bearer,name,input)).isError,true);
  assert.equal(queries.length,0);
  assert.ok(mcpJobTools.every(t=>t.annotations.readOnlyHint&&!t.annotations.destructiveHint&&!t.annotations.openWorldHint));
});

test("database failures return no credentials, internal details or record data", async () => {
  const adapter=createMcpJobAdapter({job:{findMany:async()=>{throw new Error("postgres://secret@host foreign-customer");}}} as unknown as PrismaClient,auth);
  const result=await adapter.callTool(await token(),"search_jobs",{query:""});
  assert.equal(result.isError,true);assert.doesNotMatch(JSON.stringify(result),/secret|foreign-customer|postgres/);
});

const supabaseClaims = { client_id:"approved-client",role:"authenticated",is_anonymous:false,
  session_id:"session-a",reyguild_jobs_read:true,scope:undefined };
function supabaseAuth():McpAuthConfig {
  return {...auth,supabase:{clientId:"approved-client",verifyGrant:async()=>true}};
}
test("explicit Supabase profile requires resource audience, client, session, non-anonymous identity and signed entitlement",async()=>{
  const config=supabaseAuth();const authenticate=createMcpAuthenticator(config);
  assert.deepEqual(await authenticate(await token(supabaseClaims,keys.privateKey,"JWT")),actor);
  for (const mutation of [{aud:"authenticated"},{aud:"approved-client"},{client_id:"other-client"},{client_id:undefined},
    {role:"service_role"},{is_anonymous:true},{is_anonymous:undefined},{session_id:""},{session_id:undefined},
    {reyguild_jobs_read:false},{reyguild_jobs_read:"true"},{reyguild_jobs_read:undefined}])
    await assert.rejects(authenticate(await token({...supabaseClaims,...mutation},keys.privateKey,"JWT")),McpAccessError);
  // A normal browser/ID token cannot be made acceptable by this explicit profile.
  await assert.rejects(authenticate(await token({scope:"openid"},keys.privateKey,"JWT")),denied(403));
  await assert.rejects(createMcpAuthenticator(auth)(await token(supabaseClaims,keys.privateKey,"JWT")),denied(401));
});

test("Supabase profile requires singleton resource audience, not a multi-resource token",async()=>{
  const jwt=await new SignJWT({...supabaseClaims,aud:[audience,"authenticated"]}).setProtectedHeader({alg:"ES256",typ:"JWT"})
    .setSubject("suite-user-a").setIssuer(issuer).setIssuedAt().setExpirationTime("5m").sign(keys.privateKey);
  await assert.rejects(createMcpAuthenticator(supabaseAuth())("Bearer "+jwt),denied(403));
});

test("live Supabase read consent and grant/session verification is mandatory and rechecked",async()=>{
  const config=supabaseAuth();let active=true;const grants:unknown[]=[];
  config.supabase!.verifyGrant=async grant=>{grants.push(grant);return active;};
  const authenticate=createMcpAuthenticator(config),bearer=await token(supabaseClaims,keys.privateKey,"JWT");
  await authenticate(bearer);active=false;
  await assert.rejects(authenticate(bearer),denied(403));
  assert.deepEqual(grants,[{issuer,subject:"suite-user-a",clientId:"approved-client",sessionId:"session-a"},
    {issuer,subject:"suite-user-a",clientId:"approved-client",sessionId:"session-a"}]);
  config.supabase!.verifyGrant=async()=>{throw new Error("private provider failure");};
  await assert.rejects(authenticate(bearer),denied(403));
  await assert.rejects(createMcpAuthenticator({...config,supabase:{clientId:"approved-client"} as any})(bearer),denied(503));
});

test("Supabase tool OAuth descriptors request standard openid, never claim it grants app permission",async()=>{
  const adapter=createMcpJobAdapter({} as PrismaClient,supabaseAuth());
  const listed=await adapter.listTools(await token(supabaseClaims,keys.privateKey,"JWT"));
  assert.ok(listed.tools.every(t=>JSON.stringify(t.securitySchemes)===JSON.stringify([{type:"oauth2",scopes:["openid"]}])));
  // Shared generic descriptors were not mutated by provider-specific discovery.
  assert.deepEqual(mcpJobTools[0].securitySchemes[0].scopes,[JOBS_READ_SCOPE]);
});
