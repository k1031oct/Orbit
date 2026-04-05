import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { NextResponse } from 'next/server';
import { MCPTools } from '../../../lib/mcp/tools';
import { GovernanceInterceptor } from '../../../lib/mcp/governance';

/**
 * AntiGravity (MCP) Server for Orbit
 * This endpoint allows AI agents to control the Orbit orchestration engine.
 */

// Tool handlers will be imported from src/lib/mcp/tools
// (We'll implement the tools.ts in the next step)

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { method, params, id } = body;

    // TODO: Integrate the full MCP SDK Request Handler for a cleaner bridge.
    // For now, we implement the essential CallTool and ListTools logic 
    // to provide immediate capability to agents.

    switch (method) {
      case 'listTools':
        return NextResponse.json({
          id,
          result: {
            tools: [
              {
                name: 'scan_node_context',
                description: 'Refreshes the metadata for a specific developer node.',
                inputSchema: {
                  type: 'object',
                  properties: { projectId: { type: 'string' } },
                  required: ['projectId']
                }
              },
              {
                name: 'build_node',
                description: 'Triggers a Debug Gradle build for the specified node.',
                inputSchema: {
                  type: 'object',
                  properties: { projectId: { type: 'string' } },
                  required: ['projectId']
                }
              },
              {
                name: 'build_release_node',
                description: 'Triggers a Release (AAB) Gradle build for the specified node.',
                inputSchema: {
                  type: 'object',
                  properties: { projectId: { type: 'string' } },
                  required: ['projectId']
                }
              },
              {
                name: 'deploy_node',
                description: 'Installs and launches the latest APK for the specified node.',
                inputSchema: {
                  type: 'object',
                  properties: { projectId: { type: 'string' } },
                  required: ['projectId']
                }
              },
              {
                name: 'write_governed_file',
                description: 'Writes a file to the project, strictly enforcing architecture rules and logging reasoning.',
                inputSchema: {
                  type: 'object',
                  properties: { 
                    projectId: { type: 'string', description: 'The project ID to associate this write with.' },
                    path: { type: 'string' },
                    content: { type: 'string' },
                    reasoning: { type: 'string', description: 'Briefly explain WHY this file is being written or modified.' }
                  },
                  required: ['projectId', 'path', 'content']
                }
              },
              {
                name: 'get_mission_telemetry',
                description: 'Retrieves the latest diagnostic logs and tactical decisions from Orbit.',
                inputSchema: {
                  type: 'object',
                  properties: { 
                    projectId: { type: 'string', description: 'Optional project ID to filter logs.' }
                  }
                }
              },
              {
                name: 'sync_requirements',
                description: 'Syncs mission requirements from the remote GAS hub.',
                inputSchema: {
                  type: 'object',
                  properties: { 
                    projectId: { type: 'string' }
                  },
                  required: ['projectId']
                }
              },
              {
                name: 'verify_mission',
                description: 'Runs an end-to-end verification (Build -> Deploy -> UI Audit -> Screenshot).',
                inputSchema: {
                  type: 'object',
                  properties: { 
                    projectId: { type: 'string' }
                  },
                  required: ['projectId']
                }
              },
              {
                name: 'autonomous_repair',
                description: 'Attempts to autonomously repair build errors by analyzing logs and retrying.',
                inputSchema: {
                  type: 'object',
                  properties: { 
                    projectId: { type: 'string' }
                  },
                  required: ['projectId']
                }
              },
              {
                name: 'report_mission_complete',
                description: 'Reports the final completion of a project to GAS and internal DB.',
                inputSchema: {
                  type: 'object',
                  properties: { 
                    projectId: { type: 'string' },
                    message: { type: 'string', description: 'Final summary of the work done.' }
                  },
                  required: ['projectId']
                }
              }
            ]
          }
        });

      case 'callTool':
        const { name, arguments: args } = params;
        let resultText = '';

        switch (name) {
          case 'scan_node_context':
            // Logic for manual scan (can reuse AndroidExecutor logic)
            resultText = 'Context scan triggered for node.';
            break;
          
          case 'build_node':
            resultText = await MCPTools.buildNode(args.projectId);
            break;
          
          case 'deploy_node':
            resultText = await MCPTools.deployNode(args.projectId);
            break;
          
          case 'sync_requirements':
            resultText = await MCPTools.syncRequirements(args.projectId);
            break;
          
          case 'verify_mission':
            resultText = await MCPTools.verifyMission(args.projectId);
            break;
          
          case 'report_mission_complete':
            resultText = await MCPTools.reportMissionComplete(args.projectId, args.message);
            break;
          
          case 'get_mission_telemetry':
            resultText = await MCPTools.getMissionTelemetry(args.projectId);
            break;
          
          case 'write_governed_file':
            const govRes = await MCPTools.writeGovernedFile(args.projectId, args.path, args.content, args.reasoning);
            return NextResponse.json({
              id,
              result: {
                content: [{ type: 'text', text: govRes.message }],
                isError: !govRes.success
              }
            });

          default:
            resultText = `Tool not found: ${name}`;
        }

        return NextResponse.json({
          id,
          result: {
            content: [{ type: 'text', text: resultText }]
          }
        });

      default:
        return NextResponse.json({
          id,
          error: { code: -32601, message: 'Method not found' }
        }, { status: 404 });
    }
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
