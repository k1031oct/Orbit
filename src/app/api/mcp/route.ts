import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getProjects } from '@/lib/db';
import { fetchRequirements } from '@/lib/gas';
import { z } from 'zod';

let globalServer: Server | null = null;
let globalTransport: SSEServerTransport | null = null;
let sessionId = 0;

function getServer() {
  if (!globalServer) {
    globalServer = new Server(
      { name: "UAAM-Web-MCP", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );
    
    // Setup tools
    globalServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "getProjects",
            description: "Lists all managed Android projects and their configurations",
            inputSchema: { type: "object", properties: {} },
          },
          {
            name: "fetchRequirements",
            description: "Fetches and strictly validates the requirement list from the given project's GAS Spreadsheet URL",
            inputSchema: {
              type: "object",
              properties: {
                projectId: { type: "string", description: "The internal UAAM Project ID" }
              },
              required: ["projectId"]
            }
          }
        ]
      } as any;
    });

    globalServer.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      if (request.params.name === "getProjects") {
        const projects = await getProjects();
        return { content: [{ type: "text", text: JSON.stringify(projects, null, 2) }] };
      }
      
      if (request.params.name === "fetchRequirements") {
        const { projectId } = request.params.arguments;
        const projects = await getProjects();
        const target = projects.find(p => p.id === projectId);
        if (!target) {
            return { content: [{ type: "text", text: "Project not found" }], isError: true };
        }
        
        if (!target.gasUrl) {
            return { content: [{ type: "text", text: "GAS URL is not configured for this project." }], isError: true };
        }

        try {
            const data = await fetchRequirements(target.gasUrl);
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        } catch (e: any) {
            return { content: [{ type: "text", text: `GAS Fetch/Validation Error: ${e.message}` }], isError: true };
        }
      }
      
      return { content: [{ type: "text", text: "Tool not found" }], isError: true };
    });
  }
  return globalServer;
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const messagesUrl = new URL('/api/mcp/messages', url.origin);
  
  const transport = new (SSEServerTransport as any)(messagesUrl.pathname + "?sessionId=" + (++sessionId));
  globalTransport = transport;
  
  const server = getServer();
  await server.connect(transport);

  // Return the standard Next.js Web Response with SSE ReadableStream if possible
  // NOTE: In standard Next.js, tying a persistent object to responses requires specific handling.
  // For the sake of this scaffold, we return a basic 200 indicating it is not fully implemented for standard Edge.
  
  // This is a placeholder for the actual SSE readable stream logic.
  return new Response("SSE Endpoint Ready. Please note full Next.js App Router SSE mapping requires a custom stream wrapper.", {
    headers: { 'Content-Type': 'text/plain' }
  });
}
