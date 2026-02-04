import { hasFeature, isSolanaChain } from "../wizard.js";
import { CHAINS } from "../config.js";
import { SOLANA_CHAINS } from "../config-solana.js";
function getX402Network(answers) {
    if (isSolanaChain(answers.chain)) {
        return SOLANA_CHAINS[answers.chain].x402Network;
    }
    return CHAINS[answers.chain].x402Network;
}
function getX402Provider(answers) {
    if (isSolanaChain(answers.chain)) {
        return "payai";
    }
    const chainConfig = CHAINS[answers.chain];
    return (answers.x402Provider ?? chainConfig.x402DefaultProvider ?? chainConfig.x402Providers?.[0]) ?? null;
}
function getFacilitatorUrl(answers, provider) {
    if (provider === "4mica") {
        return "https://x402.4mica.xyz";
    }
    if (isSolanaChain(answers.chain)) {
        // Solana uses PayAI facilitator
        return "https://facilitator.payai.network";
    }
    const chainConfig = CHAINS[answers.chain];
    return chainConfig.facilitatorUrl || "https://facilitator.payai.network";
}
function getUsdcConfig(answers) {
    if (isSolanaChain(answers.chain)) {
        return null; // Solana handles USDC differently
    }
    const chainConfig = CHAINS[answers.chain];
    if (!chainConfig.usdcAddress)
        return null;
    return {
        address: chainConfig.usdcAddress,
        name: chainConfig.usdcName || "USD Coin",
        version: chainConfig.usdcVersion || "2",
    };
}
export function generateA2AServer(answers) {
    const isSolana = isSolanaChain(answers.chain);
    const x402Network = hasFeature(answers, "x402") ? getX402Network(answers) : "";
    const x402Provider = hasFeature(answers, "x402") ? getX402Provider(answers) : null;
    const resolvedProvider = x402Provider ?? "payai";
    const facilitatorUrl = hasFeature(answers, "x402")
        ? getFacilitatorUrl(answers, x402Provider)
        : "";
    const usdcConfig = hasFeature(answers, "x402") && resolvedProvider === "payai" ? getUsdcConfig(answers) : null;
    // x402 v2 imports - @x402/evm for EVM chains, @x402/svm for Solana
    const x402SchemePackage = isSolana ? "@x402/svm" : "@x402/evm";
    const x402SchemeClass = isSolana ? "ExactSvmScheme" : "ExactEvmScheme";
    const x402Import = hasFeature(answers, "x402")
        ? resolvedProvider === "4mica"
            ? `import { paymentMiddlewareFromConfig } from '@4mica/x402/server/express';`
            : `import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ${x402SchemeClass} } from '${x402SchemePackage}/exact/server';`
        : "";
    const streamingImport = answers.a2aStreaming
        ? `import { streamResponse, type AgentMessage } from './agent.js';`
        : `import { generateResponse, type AgentMessage } from './agent.js';`;
    // Determine which facilitator is being used for the comment
    const facilitatorComment = resolvedProvider === "4mica" ? "4mica facilitator" : "PayAI facilitator (Base, Polygon)";
    // Generate custom USDC parser if needed (for networks without SDK defaults)
    const customUsdcParser = resolvedProvider !== "payai"
        ? ""
        : usdcConfig
        ? `
// Custom USDC configuration for this network (not in SDK defaults)
const USDC_ADDRESS = '${usdcConfig.address}';
const USDC_NAME = '${usdcConfig.name}';
const USDC_VERSION = '${usdcConfig.version}';
const USDC_DECIMALS = 6;

// Create scheme with custom USDC parser including EIP-712 domain params
const evmScheme = new ${x402SchemeClass}();
evmScheme.registerMoneyParser(async (amount) => {
  // Convert dollar amount to USDC units (6 decimals)
  const units = Math.floor(amount * Math.pow(10, USDC_DECIMALS));
  return {
    amount: units.toString(),
    asset: USDC_ADDRESS,
    extra: {
      name: USDC_NAME,
      version: USDC_VERSION,
    },
  };
});
`
        : `
// Create scheme (using SDK default USDC address)
const evmScheme = new ${x402SchemeClass}();
`;
    const x402Setup = hasFeature(answers, "x402")
        ? resolvedProvider === "4mica"
            ? `
// x402 v2 payment middleware - protects the /a2a endpoint
// Facilitator: ${facilitatorComment}
const PAYEE_ADDRESS = process.env.X402_PAYEE_ADDRESS || '${answers.agentWallet}';
const X402_NETWORK = '${x402Network}'; // CAIP-2 EVM network
const X402_TAB_ENDPOINT =
  process.env.X402_TAB_ENDPOINT || \`http://localhost:\${process.env.PORT || 3000}/x402/tab\`;

app.use(
  paymentMiddlewareFromConfig(
    {
      'POST /a2a': {
        accepts: {
          scheme: '4mica-credit',
          price: process.env.X402_PRICE || '$0.001',
          network: X402_NETWORK,
          payTo: PAYEE_ADDRESS,
        },
        description: '${answers.agentDescription.replace(/'/g, "\\'")}',
        mimeType: 'application/json',
      },
    },
    {
      advertisedEndpoint: X402_TAB_ENDPOINT,
    },
  ),
);
`
            : `
// x402 v2 payment middleware - protects the /a2a endpoint
// Facilitator: ${facilitatorComment}
const PAYEE_ADDRESS = process.env.X402_PAYEE_ADDRESS || '${answers.agentWallet}';
const X402_NETWORK = '${x402Network}'; // CAIP-2 ${isSolana ? "Solana" : "EVM"} network

// Create facilitator client
const facilitatorClient = new HTTPFacilitatorClient({
  url: '${facilitatorUrl}',
});
${customUsdcParser}
// Register ${isSolana ? "SVM" : "EVM"} scheme for payment verification
const x402Server = new x402ResourceServer(facilitatorClient)
  .register(X402_NETWORK, evmScheme);

app.use(
  paymentMiddleware(
  {
    'POST /a2a': {
        accepts: [
          {
            scheme: 'exact',
      price: process.env.X402_PRICE || '$0.001',
            network: X402_NETWORK,
            payTo: PAYEE_ADDRESS,
          },
        ],
        description: '${answers.agentDescription.replace(/'/g, "\\'")}',
        mimeType: 'application/json',
    },
  },
    x402Server,
  ),
);
`
        : "";
    return `/**
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
${streamingImport}
${x402Import}

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
${x402Setup}
/**
 * Agent Card endpoint - required for A2A discovery
 * Other agents use this to learn about your agent's capabilities
 */
app.get('/.well-known/agent-card.json', async (_req: Request, res: Response) => {
  const agentCard = await import('../.well-known/agent-card.json', { assert: { type: 'json' } });
  res.json(agentCard.default);
});

${answers.a2aStreaming
        ? `/**
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
});`
        : `/**
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
    const result = await handleMethod(method, params);
    res.json({ jsonrpc: '2.0', result, id });
  } catch (error: any) {
    res.json({
      jsonrpc: '2.0',
      error: { code: -32603, message: error.message || 'Internal error' },
      id,
    });
  }
});`}

// ============================================================================
// Method Handlers
// ============================================================================

${answers.a2aStreaming
        ? `/**
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
      throw new Error(\`Method not found: \${method}\`);
  }
}`
        : `/**
 * Route JSON-RPC methods to their handlers
 * Add new methods here as needed
 */
async function handleMethod(method: string, params: any) {
  switch (method) {
    case 'message/send':
      return handleMessageSend(params);
    case 'tasks/get':
      return handleTasksGet(params);
    case 'tasks/cancel':
      return handleTasksCancel(params);
    default:
      throw new Error(\`Method not found: \${method}\`);
  }
}`}

${answers.a2aStreaming
        ? `/**
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
    .join('\\n');

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
    res.write(\`data: \${JSON.stringify({ jsonrpc: '2.0', result: task })}\\n\\n\`);

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
      res.write(\`data: \${JSON.stringify({ jsonrpc: '2.0', result: partialTask })}\\n\\n\`);
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
    
    res.write(\`data: \${JSON.stringify({ jsonrpc: '2.0', result: completedTask })}\\n\\n\`);
    res.write('data: [DONE]\\n\\n');
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
}`
        : `/**
 * Handle message/send - the main method for chatting with the agent
 * 
 * @param params.message - The user's message with role and parts
 * @param params.configuration.contextId - Optional ID to continue a conversation
 * @returns A task object with the agent's response
 */
async function handleMessageSend(params: {
  message: { role: string; parts: Array<{ type: string; text?: string }> };
  configuration?: { contextId?: string };
}) {
  const { message, configuration } = params;
  
  // Use existing contextId for conversation continuity, or create new one
  const contextId = configuration?.contextId || uuidv4();
  const taskId = uuidv4();

  // Extract text content from message parts
  // A2A messages can have multiple parts (text, files, etc.)
  const userText = message.parts
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text)
    .join('\\n');

  // Get conversation history for context-aware responses
  const history = conversationHistory.get(contextId) || [];

  // Generate response using the LLM (see agent.ts)
  const responseText = await generateResponse(userText, history);

  // Update conversation history for future messages
  history.push({ role: 'user', content: userText });
  history.push({ role: 'assistant', content: responseText });
  conversationHistory.set(contextId, history);

  // Create the task response object
  // This follows the A2A protocol task structure
  const task = {
    id: taskId,
    contextId,
    status: 'completed' as const,
    messages: [
      { role: 'user' as const, parts: [{ type: 'text' as const, text: userText }] },
      { role: 'agent' as const, parts: [{ type: 'text' as const, text: responseText }] },
    ],
    artifacts: [], // Add any generated files/data here
  };

  tasks.set(taskId, task);

  return task;
}`}

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
  console.log(\`🤖 A2A Server running on http://localhost:\${PORT}\`);
  console.log(\`📋 Agent Card: http://localhost:\${PORT}/.well-known/agent-card.json\`);
  console.log(\`🔗 JSON-RPC endpoint: http://localhost:\${PORT}/a2a\`);
});
`;
}
export function generateAgentCard(answers) {
    const skills = [
        {
            id: "chat",
            name: "Chat",
            description: "General conversation and question answering",
            tags: ["conversation", "qa"],
            examples: ["Hello, how are you?", "What can you help me with?"],
        },
    ];
    const agentCard = {
        name: answers.agentName,
        description: answers.agentDescription,
        url: "http://localhost:3000",
        version: "1.0.0",
        capabilities: {
            streaming: answers.a2aStreaming,
            pushNotifications: false,
            stateTransitionHistory: false,
        },
        authentication: hasFeature(answers, "x402")
            ? {
                schemes: ["x402"],
                credentials: null,
            }
            : null,
        defaultInputModes: ["text"],
        defaultOutputModes: ["text"],
        skills,
    };
    return JSON.stringify(agentCard, null, 2);
}
