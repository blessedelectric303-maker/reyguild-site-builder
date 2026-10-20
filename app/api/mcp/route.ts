import { handleMcpRequest } from "@/lib/mcp/http";
import { getMcpIntegration } from "@/lib/mcp/runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handle = (request: Request) => handleMcpRequest(request, getMcpIntegration());
export { handle as POST, handle as GET, handle as DELETE, handle as OPTIONS };
