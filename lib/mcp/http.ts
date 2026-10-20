import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { PrismaClient } from "@prisma/client";
import { createMcpJobAdapter } from "./adapter";
import { createMcpAuthenticator, oauthScopes, McpAccessError, type McpAuthConfig } from "./auth";

export type McpIntegration = { db: PrismaClient; auth: McpAuthConfig; allowedOrigins: readonly string[] };
const noStore = { "Cache-Control": "no-store" };
const unavailable = () => Response.json({ error: "not_connected", message: "ChatGPT is not connected to ReyGuild." }, { status: 503, headers: noStore });
function metadataUrl(audience: string) {
  const url = new URL(audience);
  return `${url.origin}/.well-known/oauth-protected-resource${url.pathname === "/" ? "" : url.pathname}`;
}
export function authChallenge(config: McpAuthConfig, code: "invalid_token" | "insufficient_scope") {
  // URL configuration is validated before this is used; never reflect headers.
  return `Bearer resource_metadata="${metadataUrl(config.audience)}", error="${code}", scope="${oauthScopes(config).join(" ")}"`;
}
function validIntegration(value: McpIntegration | undefined): value is McpIntegration {
  if (!value || !value.db || typeof value.auth?.resolveActor !== "function" || !value.auth.key) return false;
  if (value.auth.supabase && (typeof value.auth.supabase.clientId !== "string" || !value.auth.supabase.clientId.trim() || typeof value.auth.supabase.verifyGrant !== "function")) return false;
  try {
    for (const url of [value.auth.issuer, value.auth.audience, ...value.allowedOrigins]) {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || /["\\\s]/.test(url)) return false;
    }
    return new URL(value.auth.audience).pathname === "/api/mcp";
  } catch { return false; }
}

export function protectedResourceMetadata(integration?: McpIntegration) {
  if (!validIntegration(integration)) return unavailable();
  return Response.json({ resource: integration.auth.audience, authorization_servers: [integration.auth.issuer],
    scopes_supported: oauthScopes(integration.auth), bearer_methods_supported: ["header"] }, { headers: noStore });
}

export async function handleMcpRequest(request: Request, integration?: McpIntegration): Promise<Response> {
  if (!validIntegration(integration)) return unavailable();
  const { auth, db, allowedOrigins } = integration;
  const resource = new URL(auth.audience);
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (url.origin !== resource.origin || url.pathname !== resource.pathname || (host && host !== resource.host)
    || (origin !== null && !allowedOrigins.includes(origin)))
    return Response.json({ error: "invalid_origin" }, { status: 403, headers: noStore });
  const authorization = request.headers.get("authorization");
  try { await createMcpAuthenticator(auth)(authorization); }
  catch (error) {
    if (!(error instanceof McpAccessError) || error.status === 503) return unavailable();
    return Response.json({ error: error.code }, { status: error.status,
      headers: { ...noStore, "WWW-Authenticate": authChallenge(auth, error.code as "invalid_token" | "insufficient_scope") } });
  }
  // Stateless JSON mode has no standalone SSE or session deletion endpoint.
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { ...noStore, Allow: "POST" } });
  const adapter = createMcpJobAdapter(db, auth);
  const server = new Server({ name: "reyguild-readonly", version: "0.1.0" }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, () => adapter.listTools(authorization));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    try { return await adapter.callTool(authorization, req.params.name, req.params.arguments ?? {}); }
    catch (error) {
      if (!(error instanceof McpAccessError)) throw error;
      return { isError: true, content: [{ type: "text", text: "ReyGuild authorization is required." }],
        _meta: { "mcp/www_authenticate": [authChallenge(auth, error.status === 401 ? "invalid_token" : "insufficient_scope")] } };
    }
  });
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined,
    enableJsonResponse: true, maxRequestBodySize: 32 * 1024 });
  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } finally { await server.close(); }
}
