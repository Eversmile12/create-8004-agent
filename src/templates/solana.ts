/**
 * Solana-specific templates for 8004 protocol
 *
 * This file is separate from base.ts (EVM templates) for maintainability.
 * Uses the 8004-solana SDK for Solana blockchain interactions.
 *
 * @see https://www.npmjs.com/package/8004-solana
 */

import type { WizardAnswers } from "../wizard.js";
import { hasFeature } from "../wizard.js";
import type { SOLANA_CHAINS } from "../config-solana.js";

type SolanaChainConfig = (typeof SOLANA_CHAINS)[keyof typeof SOLANA_CHAINS];

export function generateSolanaPackageJson(answers: WizardAnswers): string {
    const scripts: Record<string, string> = {
        build: "tsc",
        register: "tsx src/register.ts",
    };

    const dependencies: Record<string, string> = {
        "8004-solana": "^0.2.1",
        "@solana/web3.js": "^1.98.0",
        bs58: "^6.0.0",
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
        dependencies["@x402/svm"] = "^2.0.0";
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

export function generateSolanaEnv(answers: WizardAnswers): string {
    // Solana uses base58 private keys (the full 64-byte secret key)
    const privateKeyValue = answers.generatedPrivateKey || "your_solana_private_key_base58";

    const x402Config = hasFeature(answers, "x402")
        ? `
# x402 Payment Configuration (optional overrides)
# X402_PAYEE_ADDRESS=${answers.agentWallet}
# X402_PRICE=$0.001
`
        : "";

    // Solana always needs IPFS for metadata (no on-chain base64 like EVM)
    return `# Required for registration
# This is your Solana wallet's secret key in base58 format
SOLANA_PRIVATE_KEY=${privateKeyValue}

# Pinata JWT for IPFS metadata upload (required for Solana)
# Get one at https://pinata.cloud (free tier works)
PINATA_JWT=your_pinata_jwt_here

# OpenAI API key for LLM agent
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Custom Solana RPC (recommended for production)
# SOLANA_RPC_URL=https://your-rpc-provider.com
${x402Config}`;
}

export function generateSolanaRegistrationJson(answers: WizardAnswers, chain: SolanaChainConfig): string {
    const agentSlug = answers.agentName.toLowerCase().replace(/\s+/g, "-");
    // SDK expects: { type, value, meta } format for endpoints
    const endpoints: Array<{ type: string; value: string; meta?: Record<string, unknown> }> = [];

    if (hasFeature(answers, "a2a")) {
        endpoints.push({
            type: "A2A",
            value: `https://${agentSlug}.example.com/.well-known/agent-card.json`,
            meta: { version: "0.3.0" },
        });
    }

    if (hasFeature(answers, "mcp")) {
        endpoints.push({
            type: "MCP",
            value: `https://${agentSlug}.example.com/mcp`,
            meta: { version: "2025-06-18" },
        });
    }

    // Solana wallet address format (CAIP-2)
    endpoints.push({
        type: "agentWallet",
        value: `solana:${chain.cluster}:${answers.agentWallet}`,
    });

    // RegistrationFile format for buildRegistrationFileJson()
    // The SDK will add the correct type/version automatically
    const registration: Record<string, unknown> = {
        name: answers.agentName,
        description: answers.agentDescription,
        image: answers.agentImage,
        endpoints,
        // Best practice: Keep active=false until production-ready
        active: false,
        // OASF taxonomy - https://github.com/agntcy/oasf
        skills: answers.skills || [],
        domains: answers.domains || [],
        trustModels: answers.trustModels, // SDK uses trustModels, not supportedTrust
    };

    // Add x402 support flag if x402 feature was selected
    if (hasFeature(answers, "x402")) {
        registration.x402support = true;
    }

    return JSON.stringify(registration, null, 2);
}

export function generateSolanaRegisterScript(_answers: WizardAnswers, chain: SolanaChainConfig): string {
    return `/**
 * Solana 8004 Agent Registration Script
 * 
 * This script registers your agent on the 8004 Solana program.
 * It performs the following steps:
 * 
 * 1. Reads your registration.json metadata
 * 2. Validates metadata using buildRegistrationFileJson() (adds correct type/version)
 * 3. Uploads validated metadata to IPFS via Pinata
 * 4. Calls the 8004 program to mint your agent NFT
 * 5. Returns your agent address for future reference
 * 
 * Requirements:
 * - SOLANA_PRIVATE_KEY in .env (wallet with SOL for fees)
 * - PINATA_JWT in .env (for IPFS uploads)
 * - ~0.01 SOL for transaction fees
 * 
 * Run with: npm run register
 *
 * @see https://www.npmjs.com/package/8004-solana
 */

import 'dotenv/config';
import fs from 'fs/promises';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { SolanaSDK, IPFSClient, buildRegistrationFileJson } from '8004-solana';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Solana cluster configuration
 * Change to 'mainnet-beta' for production
 */
const CLUSTER = '${chain.cluster}' as const;
// ============================================================================
// Main Registration Flow
// ============================================================================

async function main() {
  // Step 1: Load environment variables
  const privateKeyBase58 = process.env.SOLANA_PRIVATE_KEY;
  if (!privateKeyBase58) {
    throw new Error('SOLANA_PRIVATE_KEY not set in .env');
  }

  const pinataJwt = process.env.PINATA_JWT;
  if (!pinataJwt) {
    throw new Error('PINATA_JWT not set in .env - required for metadata upload');
  }
  
  // Step 2: Setup Solana keypair
    const secretKey = bs58.decode(privateKeyBase58);
  const keypair = Keypair.fromSecretKey(secretKey);
  console.log('🔑 Registering from:', keypair.publicKey.toBase58());

  // Step 3: Read registration.json
  const registrationData = await fs.readFile('registration.json', 'utf-8');
  const registration = JSON.parse(registrationData);

  // Step 4: Validate and build proper registration JSON using SDK
  // This validates OASF skills/domains and adds correct version/type
  console.log('📋 Validating registration metadata...');
  const validatedJson = buildRegistrationFileJson(registration);
  console.log('✅ Metadata validated');

  // Step 5: Upload validated metadata to IPFS via SDK's built-in client
  console.log('📤 Uploading to IPFS via Pinata...');
  const ipfsClient = new IPFSClient({
    pinataEnabled: true,
    pinataJwt: pinataJwt,
  });
  const cid = await ipfsClient.add(JSON.stringify(validatedJson));
  const metadataUri = \`ipfs://\${cid}\`; // Must include ipfs:// prefix for explorers
  console.log('✅ Uploaded to IPFS:', metadataUri);

  // Step 6: Initialize 8004-solana SDK
  const sdk = new SolanaSDK({
    cluster: CLUSTER,
    signer: keypair,
    rpcUrl: process.env.SOLANA_RPC_URL, // Optional custom RPC
  });

  // Step 7: Register the agent
  console.log('📝 Registering agent on ${chain.name}...');
  
  const result = await sdk.registerAgent(metadataUri);

  if ('transaction' in result) {
    // skipSend mode - shouldn't happen in our flow
    throw new Error('Unexpected skipSend result');
  }

  // Step 8: Output results
  console.log('\\n✅ Agent registered successfully!');
  console.log('📋 Transaction:', \`${chain.explorer}/tx/\${result.signature}${chain.explorerSuffix}\`);
  console.log('🆔 Agent ID:', result.agentId?.toString() ?? 'Unknown');
  console.log('🔗 Asset:', result.asset?.toBase58() ?? 'Unknown');
    console.log('📄 Metadata URI:', metadataUri);

    // Update registration.json with the Solana reference
    registration.registrations = [{
    agentId: result.agentId?.toString(),
    asset: result.asset?.toBase58(),
    signature: result.signature,
    cluster: CLUSTER,
    }];
    await fs.writeFile('registration.json', JSON.stringify(registration, null, 2));
  console.log('\\n✅ registration.json updated with agent ID:', result.agentId?.toString());
}

main().catch((err) => {
  console.error('❌ Registration failed:', err.message);
  process.exit(1);
});
`;
}

/**
 * Generate agent.ts for Solana projects
 * This is identical to EVM - the LLM logic doesn't depend on blockchain
 */
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
    content: 'You are a helpful AI assistant registered on the 8004 protocol (Solana). Be concise and helpful.',
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
    content: 'You are a helpful AI assistant registered on the 8004 protocol (Solana). Be concise and helpful.',
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

export function generateSolanaReadme(answers: WizardAnswers, chain: SolanaChainConfig): string {
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
SOLANA_PRIVATE_KEY=your_base58_private_key

# Get from https://pinata.cloud (free tier works)
PINATA_JWT=your_pinata_jwt

# Get from https://platform.openai.com
OPENAI_API_KEY=your_openai_key
\`\`\`

### 3. Fund your wallet

Your agent wallet: \`${answers.agentWallet}\`

Get devnet SOL from: https://faucet.solana.com/

### 4. Register on-chain

\`\`\`bash
npm run register
\`\`\`

This will:
- Validate your metadata using the 8004-solana SDK
- Upload your agent metadata to IPFS
- Register your agent on ${chain.name}
- Output your agent address
${
    hasA2A
        ? `
### 5. Start the A2A server

\`\`\`bash
npm run start:a2a
\`\`\`

Test locally: http://localhost:3000/.well-known/agent-card.json
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
│   ├── agent.ts         # LLM logic${hasA2A ? "\n│   └── a2a-server.ts   # A2A server" : ""}${
        hasMCP ? "\n│   └── mcp-server.ts   # MCP server" : ""
    }
├── registration.json    # Agent metadata
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

Edit \`registration.json\` and add:

\`\`\`json
{
  "skills": [
    "natural_language_processing/natural_language_generation/summarization",
    "analytical_skills/coding_skills/text_to_code"
  ],
  "domains": [
    "technology/software_engineering",
    "finance_and_business/investment_services"
  ]
}
\`\`\`

Browse the full taxonomy: https://schema.oasf.outshift.com/0.8.0

## Going Live

By default, your agent is registered with \`active: false\`. This is intentional - it lets you test without appearing in explorer listings.

When you're ready for production:
1. Edit \`registration.json\` and change \`"active": false\` to \`"active": true\`
2. Re-run \`npm run register\` to update your agent's metadata

## Next Steps

1. Update the endpoint URLs in \`registration.json\` with your production domain
2. Customize the agent logic in \`src/agent.ts\`
3. Deploy to a cloud provider (Vercel, Railway, etc.)
4. Re-run \`npm run register\` if you change metadata

## Resources

- [8004 Protocol](https://eips.ethereum.org/EIPS/eip-8004)
- [8004scan Explorer](https://www.8004scan.io/)
- [8004-solana SDK](https://www.npmjs.com/package/8004-solana)
- [OASF Taxonomy](https://github.com/8004-org/oasf)
`;
}
