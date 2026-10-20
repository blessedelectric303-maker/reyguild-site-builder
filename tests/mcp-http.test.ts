import assert from "node:assert/strict";
import test from "node:test";
import { generateKeyPairSync } from "node:crypto";
import { SignJWT } from "jose";
import type { PrismaClient } from "@prisma/client";
import { handleMcpRequest, protectedResourceMetadata, type McpIntegration } from "../lib/mcp/http";
import { JOBS_READ_SCOPE } from "../lib/mcp/auth";
import { getMcpIntegration } from "../lib/mcp/runtime";
import { POST, GET, DELETE, OPTIONS } from "../app/api/mcp/route";
import { GET as metadataGET } from "../app/.well-known/oauth-protected-resource/api/mcp/route";
const keys=generateKeyPairSync("ec",{namedCurve:"P-256"});
const issuer="https://identity.example.test/", audience="https://reyguild.example.test/api/mcp";
const actor={id:"tech-a",orgId:"org-a",name:"Alex",role:"technician",locked:false};
let id=0;
function request(method="initialize",params:unknown={protocolVersion:"2025-11-25",capabilities:{},clientInfo:{name:"offline-test",version:"1"}},bearer?:string,extra:Record<string,string>={}) {
  return new Request(audience,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json, text/event-stream",...(bearer?{Authorization:bearer}:{}),...extra},body:JSON.stringify({jsonrpc:"2.0",id:++id,method,params})});
}
async function token(scope=JOBS_READ_SCOPE) {
  return "Bearer "+await new SignJWT({scope}).setProtectedHeader({alg:"ES256",typ:"at+jwt"})
    .setSubject("suite-a").setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime("5m").sign(keys.privateKey);
}
function integration():McpIntegration {
  return {db:{job:{findMany:async(args:any)=>{assert.equal(args.where.orgId,"org-a");assert.equal(args.where.assignments.some.userId,"tech-a");return [];} }} as unknown as PrismaClient,
    auth:{issuer,audience,key:keys.publicKey,resolveActor:async()=>actor},allowedOrigins:["https://chatgpt.com"]};
}

test("all actual Next routes and metadata stay disabled regardless of bearer or feature flag",async()=>{
  assert.equal(getMcpIntegration(),undefined);
  for(const handler of [POST,GET,DELETE,OPTIONS]) {
    const result=await handler(request());assert.equal(result.status,503);assert.equal(result.headers.get("cache-control"),"no-store");
  }
  assert.equal((await metadataGET()).status,503);
  assert.equal((await handleMcpRequest(request("initialize",{},await token()))).status,503);
});

test("SDK HTTP boundary returns resource-discovery challenges and rejects browser-cookie-only auth",async()=>{
  const config=integration();
  for (const extra of [{},{Cookie:"tm_session=fake; sb-access-token=fake"}] as Record<string,string>[]) {
    const result=await handleMcpRequest(request("initialize",{},undefined,extra),config);
    assert.equal(result.status,401);
    assert.match(result.headers.get("www-authenticate")!,/resource_metadata="https:\/\/reyguild.example.test\/\.well-known\/oauth-protected-resource\/api\/mcp"/);
    assert.equal(result.headers.get("set-cookie"),null);
  }
  const scope=await handleMcpRequest(request("initialize",{},await token("openid")),config);
  assert.equal(scope.status,403);assert.match(scope.headers.get("www-authenticate")!,/insufficient_scope/);
});

test("metadata describes only the explicit MCP resource/issuer/scope and bad config stays closed",async()=>{
  const config=integration();const result=protectedResourceMetadata(config);
  assert.equal(result.status,200);
  assert.deepEqual(await result.json(),{resource:audience,authorization_servers:[issuer],scopes_supported:[JOBS_READ_SCOPE],bearer_methods_supported:["header"]});
  for(const bad of ["http://reyguild.example.test/api/mcp",audience+'?x=1',audience+'\"',"https://reyguild.example.test/other"])
    assert.equal(protectedResourceMetadata({...config,auth:{...config.auth,audience:bad}}).status,503);
});

test("SDK handles actual initialize, tools/list and tools/call in stateless JSON mode",async()=>{
  const config=integration(),bearer=await token();
  const init=await handleMcpRequest(request(undefined,undefined,bearer),config);
  assert.equal(init.status,200);assert.equal(init.headers.get("mcp-session-id"),null);
  const initialized=await init.json();assert.equal(initialized.result.serverInfo.name,"reyguild-readonly");
  const list=await handleMcpRequest(request("tools/list",{},bearer),config);
  const listed=await list.json();assert.deepEqual(listed.result.tools.map((t:any)=>t.name),["search_jobs","get_job_status"]);
  const called=await handleMcpRequest(request("tools/call",{name:"search_jobs",arguments:{query:""}},bearer),config);
  const data=await called.json();assert.deepEqual(data.result.structuredContent,{jobs:[],truncated:false,limit:20});
  assert.equal(called.headers.get("cache-control"),"no-store");
});

test("origin, canonical host and observed body size are guarded before record access",async()=>{
  const config=integration(),bearer=await token();
  for(const extra of [{Origin:"https://evil.example.test"},{Origin:"null"},{Host:"evil.example.test"}] as Record<string,string>[])
    assert.equal((await handleMcpRequest(request("tools/list",{},bearer,extra),config)).status,403);
  const oversized=await handleMcpRequest(request("tools/call",{name:"search_jobs",arguments:{query:"x".repeat(40000)}},bearer),config);
  assert.equal(oversized.status,413);
  const foreign=new Request("https://foreign.example.test/api/mcp",{method:"POST",headers:{Authorization:bearer}});
  assert.equal((await handleMcpRequest(foreign,config)).status,403);
});

test("tool-time membership revocation returns MCP auth metadata, never records",async()=>{
  const config=integration(),bearer=await token();let calls=0;
  config.auth.resolveActor=async()=>++calls===1?actor:null;
  const result=await handleMcpRequest(request("tools/call",{name:"search_jobs",arguments:{query:""}},bearer),config);
  const data=await result.json();assert.equal(data.result.isError,true);
  assert.match(data.result._meta["mcp/www_authenticate"][0],/insufficient_scope/);
});

test("GET/SSE and DELETE are explicitly unsupported and still require authentication",async()=>{
  const config=integration(),bearer=await token();
  for(const method of ["GET","DELETE"]) {
    assert.equal((await handleMcpRequest(new Request(audience,{method}),config)).status,401);
    const result=await handleMcpRequest(new Request(audience,{method,headers:{Authorization:bearer}}),config);
    assert.equal(result.status,405);assert.equal(result.headers.get("allow"),"POST");
  }
});

test("Supabase discovery advertises supported OIDC scopes while server permission stays separate",async()=>{
  const config=integration();config.auth.supabase={clientId:"approved-client",verifyGrant:async()=>true};
  const metadata=await protectedResourceMetadata(config).json();assert.deepEqual(metadata.scopes_supported,["openid"]);
  const result=await handleMcpRequest(request(),config);
  assert.match(result.headers.get("www-authenticate")!,/scope="openid"/);
  assert.equal(result.status,401);
  config.auth.supabase.verifyGrant=undefined as any;
  assert.equal(protectedResourceMetadata(config).status,503);
});
