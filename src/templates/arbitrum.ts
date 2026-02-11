/**
 * Custom Arbitrum registration templates
 *
 * This bypasses agent0-sdk and talks directly to the ERC-8004
 * Identity Registry on Arbitrum using viem, similar to the Monad flow.
 */

import type { WizardAnswers } from "../wizard.js";
import { hasFeature } from "../wizard.js";
import type { CHAINS } from "../config.js";

type ChainConfig = (typeof CHAINS)[keyof typeof CHAINS];

// Arbitrum contract addresses
export const ARBITRUM_CONTRACTS = {
  mainnet: {
    identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    reputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
  },
  testnet: {
    identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    reputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
  },
} as const;

export function isArbitrumChain(chain: string): boolean {
  return chain === "arbitrum-mainnet" || chain === "arbitrum-sepolia";
}

export function getArbitrumContracts(chain: string) {
  return chain === "arbitrum-mainnet" ? ARBITRUM_CONTRACTS.mainnet : ARBITRUM_CONTRACTS.testnet;
}

export function generateArbitrumPackageJson(answers: WizardAnswers): string {
  const scripts: Record<string, string> = {
    build: "tsc",
    register: "tsx src/register.ts",
  };

  const dependencies: Record<string, string> = {
    viem: "^2.21.0",
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
    dependencies["express"] = "^4.18.2";
    dependencies["uuid"] = "^9.0.0";
    devDependencies["@types/express"] = "^4.17.21";
    devDependencies["@types/uuid"] = "^9.0.7";
  }

  if (hasFeature(answers, "mcp")) {
    scripts["start:mcp"] = "tsx src/mcp-server.ts";
    dependencies["@modelcontextprotocol/sdk"] = "^1.0.0";
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

export function generateArbitrumEnv(answers: WizardAnswers, chain: ChainConfig): string {
  const privateKeyValue = answers.generatedPrivateKey || "your_private_key_here";

  return `# Required for registration
PRIVATE_KEY=${privateKeyValue}

# RPC URL for ${chain.name}
RPC_URL=${chain.rpcUrl}

# Pinata JWT for IPFS upload (get from https://pinata.cloud)
PINATA_JWT=your_pinata_jwt_here

# OpenAI API key for LLM agent
OPENAI_API_KEY=your_openai_api_key_here
`;
}

export function generateArbitrumRegisterScript(answers: WizardAnswers, chain: ChainConfig): string {
  const contracts = getArbitrumContracts(answers.chain);
  const agentSlug = answers.agentName.toLowerCase().replace(/\s+/g, "-");
  const hasA2A = hasFeature(answers, "a2a");
  const hasMCP = hasFeature(answers, "mcp");

  // Build services array
  const services: string[] = [];
  if (hasA2A) {
    services.push(`    {
      name: "A2A",
      endpoint: "https://${agentSlug}.example.com/.well-known/agent-card.json",
      version: "0.3.0",
    }`);
  }
  if (hasMCP) {
    services.push(`    {
      name: "MCP", 
      endpoint: "https://${agentSlug}.example.com/mcp",
      version: "2025-06-18",
    }`);
  }

  const servicesCode = services.length > 0 
    ? `[\n${services.join(",\n")}\n  ]` 
    : "[]";

  // Build trust models
  const trustModels = answers.trustModels.map(t => `"${t}"`).join(", ");

  return `/**
 * ERC-8004 Agent Registration Script for Arbitrum
 * 
 * Direct contract interaction (custom registries on Arbitrum)
 * 
 * Requirements:
 * - PRIVATE_KEY in .env (wallet with ETH for gas)
 * - PINATA_JWT in .env (for IPFS upload)
 * - RPC_URL in .env (optional, defaults to public endpoint)
 * 
 * Run with: npm run register
 */

import 'dotenv/config';
import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';

// ============================================================================
// Arbitrum Chain Definition
// ============================================================================

const arbitrum${chain.chainId === 42161 ? "" : "Sepolia"} = defineChain({
  id: ${chain.chainId},
  name: '${chain.name}',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['${chain.rpcUrl}'] },
  },
});

// ============================================================================
// Contract Configuration
// ============================================================================

const IDENTITY_REGISTRY = '${contracts.identityRegistry}';

const IDENTITY_REGISTRY_ABI = parseAbi([
  'function register(string agentURI) external returns (uint256 agentId)',
  'function balanceOf(address owner) external view returns (uint256)',
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)',
]);

// ============================================================================
// Agent Configuration
// ============================================================================

const AGENT_METADATA = {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: "${answers.agentName.replace(/"/g, '\\"')}",
  description: "${answers.agentDescription.replace(/"/g, '\\"')}",
  image: "${answers.agentImage}",
  services: ${servicesCode},
  x402Support: false,
  active: true,
  registrations: [],
  supportedTrust: [${trustModels}],
};

// ============================================================================
// IPFS Upload via Pinata
// ============================================================================

async function uploadToIPFS(metadata: object): Promise<string> {
  const pinataJwt = process.env.PINATA_JWT;
  if (!pinataJwt) {
    throw new Error('PINATA_JWT not set in .env. Get one at https://pinata.cloud');
  }

  console.log('📤 Uploading metadata to IPFS...');

  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${pinataJwt}\`,
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: {
        name: \`agent-metadata-\${Date.now()}.json\`,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(\`Pinata upload failed: \${error}\`);
  }

  const result = await response.json() as { IpfsHash: string };
  const ipfsUri = \`ipfs://\${result.IpfsHash}\`;
  
  console.log(\`   IPFS hash: \${result.IpfsHash}\`);
  console.log(\`   Gateway: https://gateway.pinata.cloud/ipfs/\${result.IpfsHash}\`);
  
  return ipfsUri;
}

// ============================================================================
// Main Registration Flow
// ============================================================================

async function main() {
  // Validate environment
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not set in .env');
  }

  const rpcUrl = process.env.RPC_URL || '${chain.rpcUrl}';

  // Initialize clients
  console.log('🔧 Initializing Arbitrum client...');
  const account = privateKeyToAccount(privateKey as \`0x\${string}\`);
  
  const walletClient = createWalletClient({
    account,
    chain: arbitrum${chain.chainId === 42161 ? "" : "Sepolia"},
    transport: http(rpcUrl),
  });

  const publicClient = createPublicClient({
    chain: arbitrum${chain.chainId === 42161 ? "" : "Sepolia"},
    transport: http(rpcUrl),
  });

  console.log(\`   Wallet: \${account.address}\`);

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(\`   Balance: \${Number(balance) / 1e18} ETH\`);
  
  if (balance === 0n) {
    throw new Error('Wallet has no ETH. Fund it first on Arbitrum.');
  }

  // Check if wallet already has agents registered
  const agentCount = await publicClient.readContract({
    address: IDENTITY_REGISTRY,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });

  if (agentCount > 0n) {
    console.log('');
    console.log(\`⚠️  This wallet already owns \${agentCount} agent(s).\`);
    console.log('   Running register again will create a NEW agent.');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('');
  console.log('📝 Agent metadata:');
  console.log(\`   Name: \${AGENT_METADATA.name}\`);
  console.log(\`   Description: \${AGENT_METADATA.description}\`);
  console.log('');

  // Upload to IPFS
  const agentURI = await uploadToIPFS(AGENT_METADATA);
  console.log('');

  // Register on-chain
  console.log('⛓️  Registering agent on ${chain.name}...');
  console.log(\`   Registry: \${IDENTITY_REGISTRY}\`);
  console.log(\`   Agent URI: \${agentURI}\`);

  // Estimate gas first
  const gasEstimate = await publicClient.estimateContractGas({
    address: IDENTITY_REGISTRY,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'register',
    args: [agentURI],
    account: account.address,
  });

  console.log(\`   Estimated gas: \${gasEstimate}\`);

  // Send transaction with buffer
  const hash = await walletClient.writeContract({
    address: IDENTITY_REGISTRY,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'register',
    args: [agentURI],
    gas: gasEstimate * 120n / 100n, // 20% buffer
  });

  console.log(\`   Tx hash: \${hash}\`);
  console.log('   Waiting for confirmation...');

  // Wait for receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  if (receipt.status === 'reverted') {
    throw new Error('Transaction reverted');
  }

  console.log(\`   Confirmed in block \${receipt.blockNumber}\`);

  // Parse agentId from Transfer event (ERC-721 mint)
  const TRANSFER_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  
  let agentId = 'unknown';
  const transferLog = receipt.logs.find(log => log.topics[0] === TRANSFER_SIGNATURE);
  if (transferLog && transferLog.topics[3]) {
    agentId = BigInt(transferLog.topics[3]).toString();
  }

  console.log('');
  console.log('✅ Agent registered successfully!');
  console.log('');
  console.log('🆔 Agent ID:', agentId);
  console.log('👛 Owner:', account.address);
  console.log('');
  console.log('🌐 View on 8004scan:');
  console.log(\`   https://www.8004scan.io/agents/${chain.scanPath}/\${agentId}\`);
  console.log('');
  console.log('📋 Next steps:');
  console.log('   1. Update endpoint URLs in this file with your production domain');
  console.log('   2. Run \`npm run start:a2a\` to start your A2A server');
  console.log('   3. Deploy your agent to a public URL');
}

main().catch((error) => {
  console.error('❌ Registration failed:', error.message || error);
  process.exit(1);
});
`;
}

export function generateArbitrumReadme(answers: WizardAnswers, chain: ChainConfig): string {
  const contracts = getArbitrumContracts(answers.chain);
  const hasA2A = hasFeature(answers, "a2a");
  const hasMCP = hasFeature(answers, "mcp");

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

# Get from https://pinata.cloud
PINATA_JWT=your_pinata_jwt

# Get from https://platform.openai.com
OPENAI_API_KEY=your_openai_key
\`\`\`

### 3. Fund your wallet

Your agent wallet: \`${answers.agentWallet}\`

Fund with ETH on ${chain.name}.

### 4. Register on-chain

\`\`\`bash
npm run register
\`\`\`

This will:
- Upload your agent metadata to IPFS via Pinata
- Register your agent on ${chain.name}
- Output your agent ID and 8004scan link
${hasA2A ? `
### 5. Start the A2A server

\`\`\`bash
npm run start:a2a
\`\`\`

Test locally: http://localhost:3000/.well-known/agent-card.json
` : ""}${hasMCP ? `
### ${hasA2A ? "6" : "5"}. Start the MCP server

\`\`\`bash
npm run start:mcp
\`\`\`
` : ""}

## Arbitrum Contracts

- **Identity Registry**: \`${contracts.identityRegistry}\`
- **Reputation Registry**: \`${contracts.reputationRegistry}\`

## Project Structure

\`\`\`
${answers.agentName.toLowerCase().replace(/\s+/g, "-")}/
├── src/
│   ├── register.ts      # Registration script (direct contract calls)
│   ├── agent.ts         # LLM logic${hasA2A ? "\n│   └── a2a-server.ts   # A2A server" : ""}${hasMCP ? "\n│   └── mcp-server.ts   # MCP server" : ""}
├── .env                 # Environment variables (keep secret!)
└── package.json
\`\`\`

## Resources

- [ERC-8004 Standard](https://eips.ethereum.org/EIPS/eip-8004)
- [8004scan Explorer](https://www.8004scan.io/)
- [Arbitrum Docs](https://docs.arbitrum.io/)
`;
}

