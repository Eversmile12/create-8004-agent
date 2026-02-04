/**
 * A2A (Agent-to-Agent) Server
 * 
 * This server implements the A2A protocol for agent communication.
 * Learn more: https://a2a-protocol.org/
 * 
 * Endpoints:
 * - GET  /.well-known/agent-card.json  → Agent discovery card
 * - POST /a2a                          → JSON-RPC 2.0 endpoint
 * 
 * Supported methods:
 * - message/send   → Send a message and get a response
 * - tasks/get      → Get status of a previous task
 * - tasks/cancel   → Cancel a running task
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { streamResponse, type AgentMessage } from './agent.js';


const app = express();
app.use(express.json());

// ============================================================================
// In-Memory Storage
// In production, replace with a database (Redis, PostgreSQL, etc.)
// ============================================================================

/**
 * Task storage - tracks all tasks and their current state
 * A task represents a single request/response interaction
 */
const tasks = new Map<string, {
  id: string;
  contextId: string;
  status: 'submitted' | 'working' | 'input-required' | 'completed' | 'failed' | 'canceled';
  messages: Array<{ role: 'user' | 'agent'; parts: Array<{ type: 'text'; text: string }> }>;
  artifacts: Array<{ name: string; parts: Array<{ type: 'text'; text: string }> }>;
}>();

/**
 * Conversation history storage - maintains context across messages
 * The contextId allows multiple messages to share conversation history
 */
const conversationHistory = new Map<string, AgentMessage[]>();

// ============================================================================
// Middleware & Routes
// ============================================================================

/**
 * Agent Card endpoint - required for A2A discovery
 * Other agents use this to learn about your agent's capabilities
 */
app.get('/.well-known/agent-card.json', async (_req: Request, res: Response) => {
  const agentCard = await import('../.well-known/agent-card.json', { assert: { type: 'json' } });
  res.json(agentCard.default);
});

/**
 * Main JSON-RPC 2.0 endpoint
 * All A2A protocol methods are called through this single endpoint
 */
app.post('/a2a', async (req: Request, res: Response) => {
  const { jsonrpc, method, params, id } = req.body;

  // Validate JSON-RPC version
  if (jsonrpc !== '2.0') {
    return res.json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id });
  }

  try {
    const result = await handleMethod(method, params, res);
    // If result is null, response was already sent (streaming)
    if (result !== null) {
      res.json({ jsonrpc: '2.0', result, id });
    }
  } catch (error: any) {
    res.json({
      jsonrpc: '2.0',
      error: { code: -32603, message: error.message || 'Internal error' },
      id,
    });
  }
});

// ============================================================================
// Method Handlers
// ============================================================================

/**
 * Route JSON-RPC methods to their handlers
 * Add new methods here as needed
 */
async function handleMethod(method: string, params: any, res?: express.Response) {
  switch (method) {
    case 'message/send':
      return handleMessageSend(params, res);
    case 'tasks/get':
      return handleTasksGet(params);
    case 'tasks/cancel':
      return handleTasksCancel(params);
    default:
      throw new Error(`Method not found: ${method}`);
  }
}

/**
 * Handle message/send with streaming support
 * 
 * @param params.message - The user's message with role and parts
 * @param params.configuration.contextId - Optional ID to continue a conversation
 * @param res - Express response object for SSE streaming
 * @returns A task object (or streams response via SSE)
 */
async function handleMessageSend(
  params: {
    message: { role: string; parts: Array<{ type: string; text?: string }> };
    configuration?: { contextId?: string; streaming?: boolean };
  },
  res?: express.Response
) {
  const { message, configuration } = params;
  const streaming = configuration?.streaming ?? false;
  
  // Use existing contextId for conversation continuity, or create new one
  const contextId = configuration?.contextId || uuidv4();
  const taskId = uuidv4();

  // Extract text content from message parts
  const userText = message.parts
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text)
    .join('\n');

  // Get conversation history for context-aware responses
  const history = conversationHistory.get(contextId) || [];

  if (streaming && res) {
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Create initial task in 'working' state
    const task = {
      id: taskId,
      contextId,
      status: 'working' as const,
      messages: [
        { role: 'user' as const, parts: [{ type: 'text' as const, text: userText }] },
      ],
      artifacts: [],
    };
    tasks.set(taskId, task);

    // Send initial task state
    res.write(`data: ${JSON.stringify({ jsonrpc: '2.0', result: task })}\n\n`);

    // Stream the response
    let fullResponse = '';
    for await (const chunk of streamResponse(userText, history)) {
      fullResponse += chunk;
      
      // Send each chunk as an SSE event
      const partialTask = {
        ...task,
        status: 'working' as const,
        messages: [
          { role: 'user' as const, parts: [{ type: 'text' as const, text: userText }] },
          { role: 'agent' as const, parts: [{ type: 'text' as const, text: fullResponse }] },
        ],
      };
      res.write(`data: ${JSON.stringify({ jsonrpc: '2.0', result: partialTask })}\n\n`);
    }

    // Update conversation history
    history.push({ role: 'user', content: userText });
    history.push({ role: 'assistant', content: fullResponse });
    conversationHistory.set(contextId, history);

    // Send final completed task
    const completedTask = {
      id: taskId,
      contextId,
      status: 'completed' as const,
      messages: [
        { role: 'user' as const, parts: [{ type: 'text' as const, text: userText }] },
        { role: 'agent' as const, parts: [{ type: 'text' as const, text: fullResponse }] },
      ],
      artifacts: [],
    };
    tasks.set(taskId, completedTask);
    
    res.write(`data: ${JSON.stringify({ jsonrpc: '2.0', result: completedTask })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    
    return null; // Response already sent via SSE
  }

  // Non-streaming: generate complete response
  let responseText = '';
  for await (const chunk of streamResponse(userText, history)) {
    responseText += chunk;
  }

  // Update conversation history for future messages
  history.push({ role: 'user', content: userText });
  history.push({ role: 'assistant', content: responseText });
  conversationHistory.set(contextId, history);

  // Create the task response object
  const task = {
    id: taskId,
    contextId,
    status: 'completed' as const,
    messages: [
      { role: 'user' as const, parts: [{ type: 'text' as const, text: userText }] },
      { role: 'agent' as const, parts: [{ type: 'text' as const, text: responseText }] },
    ],
    artifacts: [],
  };

  tasks.set(taskId, task);
  return task;
}

/**
 * Handle tasks/get - retrieve a task by ID
 * Useful for checking status of async operations
 */
async function handleTasksGet(params: { taskId: string }) {
  const task = tasks.get(params.taskId);
  if (!task) {
    throw new Error('Task not found');
  }
  return task;
}

/**
 * Handle tasks/cancel - cancel a running task
 * For long-running tasks, this allows early termination
 */
async function handleTasksCancel(params: { taskId: string }) {
  const task = tasks.get(params.taskId);
  if (!task) {
    throw new Error('Task not found');
  }
  task.status = 'canceled';
  return task;
}

// ============================================================================
// Start Server
// ============================================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 A2A Server running on http://localhost:${PORT}`);
  console.log(`📋 Agent Card: http://localhost:${PORT}/.well-known/agent-card.json`);
  console.log(`🔗 JSON-RPC endpoint: http://localhost:${PORT}/a2a`);
});
