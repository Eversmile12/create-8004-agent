import type { WizardAnswers } from "../wizard.js";
import { hasFeature } from "../wizard.js";
import type { CHAINS } from "../config.js";

type ChainConfig = (typeof CHAINS)[keyof typeof CHAINS];

// Helper to get funding instructions based on chain
function getFundingInstructions(chain: ChainConfig): string {
    // Mainnets need real tokens
    const mainnetChains: Record<number, string> = {
        1: "ETH", // Ethereum
        8453: "ETH", // Base
        137: "MATIC", // Polygon
        143: "MON", // Monad
    };

    if (mainnetChains[chain.chainId]) {
        const token = mainnetChains[chain.chainId];
        return `\n**⚠️ Mainnet: You need real ${token} for gas fees.** Transfer ${token} to your wallet before registering.\n`;
    }

    // Testnets have faucets
    const faucets: Record<number, string> = {
        11155111: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia", // Eth Sepolia
        84532: "https://www.coinbase.com/faucets/base-ethereum-goerli-faucet", // Base Sepolia
        80002: "https://faucet.polygon.technology/", // Polygon Amoy
        10143: "https://faucet.monad.xyz/", // Monad Testnet
    };

    const faucetUrl = faucets[chain.chainId];
    if (faucetUrl) {
        return `\nGet testnet tokens from: ${faucetUrl}\n`;
    }

    return "\nFund your wallet with native tokens for gas fees.\n";
}

export function generatePackageJson(answers: WizardAnswers): string {
    const scripts: Record<string, string> = {
        build: "tsc",
        register: "tsx src/register.ts",
    };

    const dependencies: Record<string, string> = {
        "agent0-sdk": "latest",
        dotenv: "^16.3.1",
        openai: "^4.68.0",
    };

    const devDependencies: Record<string, string> = {
        "@types/node": "^20.10.0",
        tsx: "^4.7.0",
        typescript: "^5.3.0",
    };

    if (hasFeature(answers, "a2a")) {
        scripts["start:a2a"] = "tsx src/a2a-server.ts";
        scripts["a2a:discover"] = "tsx src/a2a-client.ts --discover";
        scripts["a2a:chat"] = "tsx src/a2a-client.ts --interactive";
        scripts["a2a:test"] = "tsx src/a2a-client.ts --test";
        dependencies["express"] = "^4.18.2";
        dependencies["uuid"] = "^9.0.0";
        devDependencies["@types/express"] = "^4.17.21";
        devDependencies["@types/uuid"] = "^9.0.7";
    }

    if (hasFeature(answers, "mcp")) {
        scripts["start:mcp"] = "tsx src/mcp-server.ts";
        dependencies["@modelcontextprotocol/sdk"] = "^1.0.0";
    }

    if (hasFeature(answers, "x402")) {
        dependencies["@x402/express"] = "^2.0.0";
        dependencies["@x402/core"] = "^2.0.0";
        dependencies["@x402/evm"] = "^2.0.0";
    }

    return JSON.stringify(
        {
            name: answers.agentName.toLowerCase().replace(/\s+/g, "-"),
            version: "1.0.0",
            description: answers.agentDescription,
            type: "module",
            scripts,
            dependencies,
            devDependencies,
        },
        null,
        2
    );
}

export function generateEnvExample(answers: WizardAnswers, chain: ChainConfig): string {
    // If we generated a private key, use it directly
    const privateKeyValue = answers.generatedPrivateKey || "your_private_key_here";

    let env = `# Required for registration
PRIVATE_KEY=${privateKeyValue}

# RPC URL for ${chain.name}
RPC_URL=${chain.rpcUrl}

# Pinata for IPFS uploads (required for agent0-sdk)
PINATA_JWT=your_pinata_jwt_here

# OpenAI API key for LLM agent
OPENAI_API_KEY=your_openai_api_key_here
`;

    if (hasFeature(answers, "x402")) {
        env += `
# x402 Payment Configuration (optional overrides)
X402_PAYEE_ADDRESS=${answers.agentWallet}
X402_PRICE=$0.001
`;
    }

    return env;
}

export function generateRegisterScript(answers: WizardAnswers, chain: ChainConfig): string {
    const agentSlug = answers.agentName.toLowerCase().replace(/\s+/g, "-");
    const hasA2A = hasFeature(answers, "a2a");
    const hasMCP = hasFeature(answers, "mcp");
    const hasX402 = hasFeature(answers, "x402");

    // Build trust model arguments
    const trustArgs = [
        answers.trustModels.includes("reputation"),
        answers.trustModels.includes("crypto-economic"),
        answers.trustModels.includes("tee-attestation"),
    ];

    return `/**
 * ERC-8004 Agent Registration Script
 * 
 * Uses the Agent0 SDK (https://sdk.ag0.xyz/) for registration.
 * The SDK handles:
 * - Two-step registration flow (mint → upload → setAgentURI)
 * - IPFS uploads via Pinata
 * - Proper metadata format with registrations array
 * 
 * Requirements:
 * - PRIVATE_KEY in .env (wallet with ETH for gas)
 * - PINATA_JWT in .env (for IPFS uploads)
 * - RPC_URL in .env (optional, defaults to public endpoint)
 * 
 * Run with: npm run register
 */

import 'dotenv/config';
import { SDK } from 'agent0-sdk';

// ============================================================================
// Agent Configuration
// ============================================================================

const AGENT_CONFIG = {
  name: '${answers.agentName.replace(/'/g, "\\'")}',
  description: '${answers.agentDescription.replace(/'/g, "\\'")}',
  image: '${answers.agentImage}',
  // Update these URLs when you deploy your agent
  a2aEndpoint: 'https://${agentSlug}.example.com/.well-known/agent-card.json',
  mcpEndpoint: 'https://${agentSlug}.example.com/mcp',
};

// ============================================================================
// Main Registration Flow
// ============================================================================

async function main() {
  // Validate environment
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not set in .env');
  }

  const pinataJwt = process.env.PINATA_JWT;
  if (!pinataJwt) {
    throw new Error('PINATA_JWT not set in .env');
  }

  const rpcUrl = process.env.RPC_URL || '${chain.rpcUrl}';

  // Initialize SDK
  console.log('🔧 Initializing Agent0 SDK...');
  const sdk = new SDK({
    chainId: ${chain.chainId},
    rpcUrl,
    signer: privateKey,
    ipfs: 'pinata',
    pinataJwt,
  });

  // Create agent
  console.log('📝 Creating agent...');
  const agent = sdk.createAgent(
    AGENT_CONFIG.name,
    AGENT_CONFIG.description,
    AGENT_CONFIG.image
  );

  // Configure endpoints
${
    hasA2A
        ? `  console.log('🔗 Setting A2A endpoint...');
  await agent.setA2A(AGENT_CONFIG.a2aEndpoint);
`
        : ""
}${
        hasMCP
            ? `  console.log('🔗 Setting MCP endpoint...');
  await agent.setMCP(AGENT_CONFIG.mcpEndpoint);
`
            : ""
    }
  // Configure trust models
  console.log('🔐 Setting trust models...');
  agent.setTrust(${trustArgs[0]}, ${trustArgs[1]}, ${trustArgs[2]});

  // Set status flags
  // Best practice: Keep active=false until your agent is production-ready
  // Change to true when you're ready for users to discover your agent
  agent.setActive(false);
  agent.setX402Support(${hasX402});

  // Optional: Add OASF skills and domains for better discoverability
  // Browse taxonomy: https://github.com/agntcy/oasf
  // agent.addSkill('natural_language_processing/natural_language_generation/summarization');
  // agent.addDomain('technology/software_engineering');

  // Register on-chain with IPFS
  console.log('⛓️  Registering agent on ${chain.name}...');
  console.log('   This will:');
  console.log('   1. Mint agent NFT on-chain');
  console.log('   2. Upload metadata to IPFS');
  console.log('   3. Set agent URI on-chain');
  console.log('');

  const txHandle = await agent.registerIPFS();
  const { result } = await txHandle.waitMined();

  // Set agent wallet via ERC-8004 v2 setAgentWallet() (not deprecated metadata)
  // This uses EIP-712 signature verification for security
  console.log('');
  console.log('🔐 Setting agent wallet via setAgentWallet()...');
  const walletTx = await agent.setWallet('${answers.agentWallet}');
  await walletTx.waitMined();

  // Output results
  console.log('');
  console.log('✅ Agent registered successfully!');
  console.log('');
  console.log('🆔 Agent ID:', result.agentId);
  console.log('📄 Agent URI:', result.agentURI);${
      chain.scanPath
          ? `
  console.log('');
  console.log('🌐 View your agent on 8004scan:');
  const agentIdNum = result.agentId?.split(':')[1] || result.agentId;
  console.log(\`   https://www.8004scan.io/agents/${chain.scanPath}/\${agentIdNum}\`);`
          : ""
  }
  console.log('');
  console.log('📋 Next steps:');
  console.log('   1. Update AGENT_CONFIG endpoints with your production URLs');
  console.log('   2. Run \`npm run start:a2a\` to start your A2A server');
  console.log('   3. Deploy your agent to a public URL');
}

main().catch((error) => {
  console.error('❌ Registration failed:', error.message || error);
  process.exit(1);
});
`;
}

export function generateAgentTs(answers: WizardAnswers): string {
    const streamingCode = answers.a2aStreaming
        ? `
/**
 * Stream a response to a user message (generator function)
 * Yields chunks of text as they are generated by the LLM
 * 
 * @param userMessage - The user's input
 * @param history - Previous conversation messages (for context)
 * @yields Text chunks as they are generated
 */
export async function* streamResponse(userMessage: string, history: AgentMessage[] = []): AsyncGenerator<string> {
  const systemPrompt: AgentMessage = {
    role: 'system',
    content: 'You are a helpful AI assistant registered on the ERC-8004 protocol. Be concise and helpful.',
  };

  const messages: AgentMessage[] = [
    systemPrompt,
    ...history,
    { role: 'user', content: userMessage },
  ];

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
`
        : "";

    return `/**
 * LLM Agent
 * 
 * This file contains the AI logic for your agent.
 * By default, it uses OpenAI's GPT-4o-mini model.
 * 
 * To customize:
 * - Change the model in chat() (e.g., 'gpt-4o', 'gpt-3.5-turbo')
 * - Modify the system prompt in generateResponse()
 * - Add custom logic, tools, or RAG capabilities
 * 
 * To use a different LLM provider:
 * - Replace the OpenAI import with your preferred SDK
 * - Update the chat() function accordingly
 */

import OpenAI from 'openai';

// Initialize OpenAI client
// API key is loaded from OPENAI_API_KEY environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Types
// ============================================================================

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Send messages to the LLM and get a response
 * This is the low-level function that calls the OpenAI API
 * 
 * @param messages - Array of conversation messages
 * @returns The assistant's response text
 */
export async function chat(messages: AgentMessage[]): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Change model here if needed
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    // Add more options as needed:
    // temperature: 0.7,
    // max_tokens: 1000,
  });

  return response.choices[0]?.message?.content ?? 'No response';
}

/**
 * Generate a response to a user message
 * This is the main function called by A2A and MCP handlers
 * 
 * @param userMessage - The user's input
 * @param history - Previous conversation messages (for context)
 * @returns The agent's response
 */
export async function generateResponse(userMessage: string, history: AgentMessage[] = []): Promise<string> {
  // System prompt defines your agent's personality and behavior
  // Customize this to match your agent's purpose
  const systemPrompt: AgentMessage = {
    role: 'system',
    content: 'You are a helpful AI assistant registered on the ERC-8004 protocol. Be concise and helpful.',
  };

  // Build the full message array: system prompt + history + new message
  const messages: AgentMessage[] = [
    systemPrompt,
    ...history,
    { role: 'user', content: userMessage },
  ];

  return chat(messages);
}
${streamingCode}`;
}

export function generateReadme(answers: WizardAnswers, chain: ChainConfig): string {
    const hasA2A = hasFeature(answers, "a2a");
    const hasMCP = hasFeature(answers, "mcp");
    const hasX402 = hasFeature(answers, "x402");

    return `# ${answers.agentName}

${answers.agentDescription}

## Quick Start

### 1. Install dependencies

\`\`\`bash
npm install
\`\`\`

### 2. Configure environment

Edit \`.env\` and add your API keys:

\`\`\`env
# Already set if wallet was auto-generated
PRIVATE_KEY=your_private_key

# Get from https://pinata.cloud (free tier works)
PINATA_JWT=your_pinata_jwt

# Get from https://platform.openai.com
OPENAI_API_KEY=your_openai_key
\`\`\`

### 3. Fund your wallet

Your agent wallet: \`${answers.agentWallet}\`
${getFundingInstructions(chain)}

### 4. Register on-chain

\`\`\`bash
npm run register
\`\`\`

This will:
- Upload your agent metadata to IPFS
- Register your agent on ${chain.name}
- Output your agent ID and 8004scan link
${
    hasA2A
        ? `
### 5. Start the A2A server

\`\`\`bash
npm run start:a2a
\`\`\`

Test locally: http://localhost:3000/.well-known/agent-card.json

#### Test your agent

\\\`\\\`\\\`bash
# Discover agent capabilities
npm run a2a:discover

# Interactive chat mode
npm run a2a:chat

# Run automated tests
npm run a2a:test
\\\`\\\`\\\`
`
        : ""
}${
        hasMCP
            ? `
### ${hasA2A ? "6" : "5"}. Start the MCP server

\`\`\`bash
npm run start:mcp
\`\`\`
`
            : ""
    }
## Project Structure

\`\`\`
${answers.agentName.toLowerCase().replace(/\s+/g, "-")}/
├── src/
│   ├── register.ts      # Registration script
│   ├── agent.ts         # LLM logic${hasA2A ? "\n│   ├── a2a-server.ts   # A2A server\n│   └── a2a-client.ts   # A2A testing client" : ""}${
        hasMCP ? "\n│   └── mcp-server.ts   # MCP server" : ""
    }
├── .env                 # Environment variables (keep secret!)
└── package.json
\`\`\`
${
    hasX402
        ? `
## x402 Payments

This agent has x402 payment support enabled. Protected endpoints require USDC payment.

Payment configuration in \`.env\`:
- \`X402_PAYEE_ADDRESS\` - Wallet to receive payments
- \`X402_PRICE\` - Price per request (e.g., $0.001)
`
        : ""
}
## OASF Skills & Domains (Optional)

Add capabilities and domain expertise to help others discover your agent.

Edit \`src/register.ts\` and uncomment/add before \`registerIPFS()\`:

\`\`\`typescript
// Add skills (what your agent can do)
agent.addSkill('natural_language_processing/natural_language_generation/summarization');
agent.addSkill('analytical_skills/coding_skills/text_to_code');

// Add domains (areas of expertise)  
agent.addDomain('technology/software_engineering');
agent.addDomain('finance_and_business/investment_services');
\`\`\`

Browse the full taxonomy: https://schema.oasf.outshift.com/0.8.0

## Going Live

By default, your agent is registered with \`active: false\`. This is intentional - it lets you test without appearing in explorer listings.

When you're ready for production:
1. Edit \`src/register.ts\` and change \`agent.setActive(false)\` to \`agent.setActive(true)\`
2. Re-run \`npm run register\` to update your agent's metadata

## Next Steps

1. Update the endpoint URLs in \`src/register.ts\` with your production domain
2. Customize the agent logic in \`src/agent.ts\`
3. Deploy to a cloud provider (Vercel, Railway, etc.)
4. Re-run \`npm run register\` if you change metadata

## Resources

- [ERC-8004 Standard](https://eips.ethereum.org/EIPS/eip-8004)
- [8004scan Explorer](https://www.8004scan.io/)
- [Agent0 SDK Docs](https://sdk.ag0.xyz/)
- [OASF Taxonomy](https://github.com/8004-org/oasf)
`;
}
