# create-8004-agent

CLI tool to scaffold [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) compliant AI agents with A2A, MCP, and x402 payment support.

**Supports both EVM chains and Solana.**

## Table of Contents
- [What is ERC-8004?](#what-is-erc-8004)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [What Gets Generated](#what-gets-generated)
- [Wizard Options](#wizard-options)
- [Supported Chains](#supported-chains)
- [Generated Project Usage](#generated-project-usage)
  - [1. Configure Environment](#1-configure-environment)
  - [2. Register Agent On-Chain](#2-register-agent-on-chain)
  - [3. Updating Your Agent](#3-updating-your-agent)
  - [4. Start Your Servers](#4-start-your-servers)
- [A2A, x402, and MCP Protocols](#a2a-protocol)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Resources](#resources)


## What is ERC-8004?

ERC-8004 is a protocol for discovering and trusting AI agents across organizational boundaries. It provides:

-   **Identity Registry** - On-chain agent registration as NFTs
-   **Reputation Registry** - Feedback and trust signals
-   **Validation Registry** - Stake-secured verification
## Prerequisites

Before using the generator, ensure you have:
- **Node.js**: Version 18.0.0 or higher.
- **Package Manager**: npm, pnpm, or bun.
- **Wallet**: An EVM or Solana wallet (the tool can generate one for you if needed).

## Quick Start

```bash
npx create-8004-agent
```

That's it! The wizard will guide you through creating your agent.

## What Gets Generated

The wizard creates a complete agent project with:

```
agents/my-agent/
├── package.json
├── .env.example
├── registration.json          # ERC-8004 metadata
├── tsconfig.json
├── src/
│   ├── register.ts            # On-chain registration script
│   ├── agent.ts               # LLM agent (OpenAI)
│   ├── a2a-server.ts          # A2A protocol server (optional)
│   ├── mcp-server.ts          # MCP protocol server (optional)
│   └── tools.ts               # MCP tools (optional)
└── .well-known/
    └── agent-card.json        # A2A discovery card
```

## Wizard Options

| Option                | Description                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Project directory** | Where to create the project                                                                                                        |
| **Agent name**        | Your agent's name                                                                                                           |
| **Agent description** | What your agent does                                                                                                           |
| **Agent image**       | URL to your agent's image/logo                                                                                                           |
| **Agent wallet**      | EVM or Solana address (leave empty to auto-generate)                                                                                                 |
| **A2A server**        | Enable agent-to-agent communication                                                                                                  |
| **A2A streaming**     | Enable Server-Sent Events (SSE) for streaming responses                                                                                                      |
| **MCP server**        | Enable Model Context Protocol tools                                                                                                          |
| **x402 payments**     | [x402](https://x402.org) USDC micropayments (Base, Polygon)                                                                                                       |
| **Chain**             | EVM: Ethereum, Base, Polygon, Monad (mainnet + testnets) / Solana: Devnet                                                                                                         |
| **Trust models**      | reputation, crypto-economic, tee-attestation                                                                                                |

## Supported Chains

### EVM Chains

| Chain           | Identity Registry                            | Reputation Registry                            | Status       |
| --------------- | -------------------------------------------- | ---------------------------------------------- | ------------ |
| ETH Sepolia     | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | `0x8004B663056A597Dffe9eCcC1965A193B7388713`   | ✅ Available |
| Arbitrum One    | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`   | ✅ Available |
| Arbitrum Sepolia| `0x8004A818BFB912233c491871b3d84c89A494BD9e` | `0x8004B663056A597Dffe9eCcC1965A193B7388713`   | ✅ Available |
| Base Sepolia    | Coming soon                                  | Coming soon                                    | 🔜 Pending   |
| Linea Sepolia   | Coming soon                                  | Coming soon                                    | 🔜 Pending   |
| Polygon Amoy    | Coming soon                                  | Coming soon                                    | 🔜 Pending   |

### Solana

| Network | Program ID                                     |
| ------- | ---------------------------------------------- |
| Devnet  | `HvF3JqhahcX7JfhbDRYYCJ7S3f6nJdrqu5yi9shyTREp` |

## Generated Project Usage

After generating your project:

```bash
cd agents/my-agent
npm install
```

### 1. Configure Environment

Edit `.env` and fill in:

```env
PRIVATE_KEY=...                   # Auto-generated if you left wallet empty
OPENAI_API_KEY=your_openai_key    # For LLM responses
PINATA_JWT=your_pinata_jwt        # If using IPFS storage (requires pinJSONToIPFS scope)
```

**Auto-generated wallet:** If you left the wallet address empty, a new wallet was generated and the private key is already in `.env`. **Back up your .env file** and **fund the wallet with testnet tokens** before registering.

-   **EVM chains:** Fund with testnet ETH (use faucets for Sepolia, Base Sepolia, etc.)
-   **Solana Devnet:** Fund with devnet SOL via `solana airdrop` or faucets

**Pinata JWT:** Create an API key at [pinata.cloud](https://pinata.cloud) with `pinJSONToIPFS` scope for public IPFS pinning.

### 2. Register Agent On-Chain

```bash
npm run register
```

**EVM chains:** Uploads metadata to IPFS and mints an NFT on the Identity Registry.

**Solana:** Validates metadata using `buildRegistrationFileJson()`, uploads to IPFS, and mints a Metaplex Core NFT via the 8004 program.

After registration, view your agent on [8004scan.io](https://www.8004scan.io/).
### 2(b). Updating Your Agent (Optional)

If you update your agent's name, description, image, or [OASF](https://github.com/8004-org/oasf) skills in `src/register.ts`, you need to sync these changes on-chain:

1. Update the configuration in `src/register.ts`.
2. Run the registration script again:
   ```bash
   npm run register
   ```
This will upload the new metadata to IPFS and update your agent's URI on the Identity Registry.

### 3. Start Your Servers

```bash
# Start A2A server
npm run start:a2a

# Start MCP server (in another terminal)
npm run start:mcp
```

## A2A Protocol

The generated A2A server implements:

-   **Agent Card** at `/.well-known/agent-card.json`
-   **JSON-RPC 2.0** endpoint at `/a2a`
-   Methods: `message/send`, `tasks/get`, `tasks/cancel`

### Testing Your A2A Endpoint

**1. Start the server:**

```bash
npm run start:a2a
```

**2. Test the agent card:**

```bash
curl http://localhost:3000/.well-known/agent-card.json
```

**3. Test the JSON-RPC endpoint:**

```bash
curl -X POST http://localhost:3000/a2a \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "message/send",
    "params": {
      "message": {
        "role": "user",
        "parts": [{"type": "text", "text": "Hello!"}]
      }
    },
    "id": 1
  }'
```

## x402 Payments

[x402](https://x402.org) payment support enables USDC micropayments for your agent. Available on:

| Chain | Facilitator | Status |
| ----- | ----------- | ------ |
| Base Mainnet | [PayAI](https://facilitator.payai.network) | ✅ Production |
| Base Sepolia | PayAI | ✅ Testnet |
| Polygon Mainnet | PayAI | ✅ Production |
| Polygon Amoy | PayAI | ✅ Testnet |

When enabled, the A2A server uses x402 middleware for micropayments:
- Per-request pricing (default: $0.001 USDC)
- Automatic payment verification via facilitator
- Payment configuration in `.env`: `X402_PAYEE_ADDRESS`, `X402_PRICE`

## MCP Protocol

The generated MCP server includes sample tools:

-   `chat` - Conversation with the LLM
-   `echo` - Echo back input (testing)
-   `get_time` - Current timestamp

Add your own tools in `src/tools.ts`.

### Testing Your MCP Server

MCP uses stdio for communication. To test with the MCP Inspector:

```bash
# Install MCP Inspector
npx @modelcontextprotocol/inspector

# Or test directly with your MCP client
npm run start:mcp
```

The server will communicate over stdin/stdout following the MCP protocol.

## Registration File Structure

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "My Agent",
  "description": "An AI agent...",
  "image": "https://example.com/image.png",
  "endpoints": [
    {
      "name": "A2A",
      "endpoint": "http://localhost:3000/.well-known/agent-card.json",
      "version": "0.3.0"
    },
    {
      "name": "MCP",
      "endpoint": "http://localhost:3001",
      "version": "2025-06-18"
    },
    {
      "name": "agentWallet",
      "endpoint": "eip155:11155111:0x..."
    }
  ],
  "registrations": [
    {
      "agentId": 123,
      "agentRegistry": "eip155:11155111:0x8004..."
    }
  ],
  "supportedTrust": ["reputation", "crypto-economic", "tee-attestation"]
}
```

## Development

### Running Tests

```bash
npm test
```

### x402 Paid Request Tests

To run the full x402 integration tests (verifying paid requests work), you need a test wallet with testnet USDC:

1. Create a `.env` file in the project root:
```env
TEST_PAYER_PRIVATE_KEY=0x...your_private_key...
```

2. Fund the wallet with testnet USDC on:
   - Base Sepolia
   - Polygon Amoy

If `TEST_PAYER_PRIVATE_KEY` is not set, x402 paid request tests will be skipped (other tests still run).

## Resources

-   [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
-   [8004scan Explorer](https://www.8004scan.io/) - View registered agents
-   [A2A Protocol](https://a2a-protocol.org/)
-   [Model Context Protocol](https://modelcontextprotocol.io/)
-   [x402 Protocol](https://x402.org)
-   [PayAI Facilitator](https://payai.network) - x402 facilitator for Base, Polygon
-   [8004-solana SDK](https://github.com/8004-ai/8004-solana) - Solana implementation

## License

MIT
