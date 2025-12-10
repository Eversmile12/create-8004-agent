export function generateMCPServer(answers) {
    return `/**
 * MCP (Model Context Protocol) Server
 * 
 * This server exposes tools that can be called by MCP-compatible clients
 * (like Claude Desktop, Cursor, or other AI assistants).
 * 
 * Learn more: https://modelcontextprotocol.io/
 * 
 * Communication: Uses stdio (standard input/output)
 * To test: npx @modelcontextprotocol/inspector
 */

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { tools, handleToolCall } from './tools.js';

// ============================================================================
// Server Setup
// ============================================================================

/**
 * Create MCP server with name and capabilities
 * The 'tools' capability tells clients this server provides callable tools
 */
const server = new Server(
  {
    name: '${answers.agentName.toLowerCase().replace(/\s+/g, "-")}-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {}, // Enable tools capability
    },
  }
);

// ============================================================================
// Request Handlers
// ============================================================================

/**
 * List available tools
 * Clients call this to discover what tools are available
 * The tools array is defined in tools.ts
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

/**
 * Handle tool calls
 * When a client wants to use a tool, this handler routes to the right function
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const result = await handleToolCall(name, args ?? {});
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: \`Error: \${error.message}\` }],
      isError: true,
    };
  }
});

// ============================================================================
// Start Server
// ============================================================================

async function main() {
  // MCP uses stdio for communication (not HTTP)
  // Messages are passed via stdin/stdout
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Log to stderr so it doesn't interfere with MCP protocol on stdout
  console.error('🔧 MCP Server running on stdio');
}

main().catch(console.error);
`;
}
export function generateMCPTools() {
    return `/**
 * MCP Tools Definition
 * 
 * This file defines the tools your MCP server exposes.
 * Each tool has:
 * - name: Unique identifier for the tool
 * - description: What the tool does (shown to AI clients)
 * - inputSchema: JSON Schema defining expected parameters
 * 
 * Add your own tools by:
 * 1. Adding a tool definition to the 'tools' array
 * 2. Adding a case in handleToolCall() to implement it
 */

import { generateResponse } from './agent.js';

// ============================================================================
// Tool Definitions
// Add new tools here - these are exposed to MCP clients
// ============================================================================

export const tools = [
  {
    name: 'chat',
    description: 'Have a conversation with the AI agent',
    inputSchema: {
      type: 'object' as const,
      properties: {
        message: {
          type: 'string',
          description: 'The message to send to the agent',
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'echo',
    description: 'Echo back the input message (for testing)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        message: {
          type: 'string',
          description: 'The message to echo',
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'get_time',
    description: 'Get the current time',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  // Add more tools here, for example:
  // {
  //   name: 'search_database',
  //   description: 'Search the database for records',
  //   inputSchema: {
  //     type: 'object' as const,
  //     properties: {
  //       query: { type: 'string', description: 'Search query' },
  //       limit: { type: 'number', description: 'Max results' },
  //     },
  //     required: ['query'],
  //   },
  // },
];

// ============================================================================
// Tool Implementations
// Add the logic for each tool here
// ============================================================================

export async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    // Chat tool - uses the LLM agent
    case 'chat': {
      const message = args.message as string;
      const response = await generateResponse(message);
      return { response };
    }
    
    // Echo tool - simple test tool
    case 'echo': {
      const message = args.message as string;
      return { echoed: message };
    }
    
    // Get time tool - returns current timestamp
    case 'get_time': {
      return { time: new Date().toISOString() };
    }
    
    // Add your tool implementations here:
    // case 'search_database': {
    //   const query = args.query as string;
    //   const limit = (args.limit as number) || 10;
    //   const results = await searchDB(query, limit);
    //   return { results };
    // }
    
    default:
      throw new Error(\`Unknown tool: \${name}\`);
  }
}
`;
}
