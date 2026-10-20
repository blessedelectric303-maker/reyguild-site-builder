import { protectedResourceMetadata } from "@/lib/mcp/http";
import { getMcpIntegration } from "@/lib/mcp/runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = () => protectedResourceMetadata(getMcpIntegration());
