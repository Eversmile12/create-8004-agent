# create-8004-agent

CLI tool to scaffold [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) compliant AI agents with A2A, MCP, x402 payment, and [TAP](https://push.org) (Trustless Agents Plus) universal identity support.

**Supports EVM chains, Solana, and Push Chain universal agent registration.**

## Table of Contents
- [What is ERC-8004?](#what-is-erc-8004)
- [What is TAP?](#what-is-tap)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [CLI Sub-Commands](#cli-sub-commands)
  - [register — TAP Registration](#register--tap-registration-for-existing-agents)
  - [bind — Cross-Chain Binding](#bind--bind-cross-chain-agents)
  - [profile — Agent Profile Lookup](#profile--query-agent-profile)
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

## What is TAP?

**TAP (Trustless Agents Plus)** is a Universal Agent Identity system on [Push Chain](https://push.org). It solves the fragmentation problem: if you register the same agent on Ethereum Sepolia, Base Sepolia, and other chains, each chain gives it a different agent ID. TAP gives your agent a single **Universal Agent ID** that works across all chains.

**How it works:**

1. **Register** your agent on Push Chain's AgentRegistry via the Universal Gateway on your source chain. No Push Chain tokens needed — you stay on your chain, and Push Chain's TSS network relays the transaction.
2. Your wallet gets a deterministic **UEA (Universal Executor Account)** on Push Chain. Your Universal Agent ID is derived from this address.
3. **Bind** agents from other chains to this canonical identity using EIP-712 signatures, proving you own them all.
4. Anyone can **query** your agent's unified profile — identity, cross-chain bindings, reputation scores, and slash history — from a single ID.

**Supported chains for TAP registration:**

| Chain | Universal Gateway |
| ----- | ----------------- |
| Ethereum Sepolia | `0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A` |
| Base Sepolia | `0xFD4fef1F43aFEc8b5bcdEEc47f35a1431479aC16` |

## Prerequisites

Before using the generator, ensure you have:
- **Node.js**: Version 18.0.0 or higher.
- **Package Manager**: npm, pnpm, or bun.
- **Wallet**: An EVM or Solana wallet (the tool can generate one for you if needed).

## Quick Start

### Scaffold a new agent

```bash
npx create-8004-agent
```

The wizard guides you through creating a new ERC-8004 agent project. On TAP-supported chains (Ethereum Sepolia, Base Sepolia), the generated `register.ts` will also prompt you to create a TAP Universal Agent on Push Chain after the on-chain registration.

### Manage existing agents

If you already have an ERC-8004 agent registered on-chain, use the sub-commands directly:

```bash
# Register your existing agent on Push Chain (get a Universal Agent ID)
npx create-8004-agent register

# Bind an agent from another chain to your TAP identity
npx create-8004-agent bind

# Look up any agent's full profile (no wallet needed)
npx create-8004-agent profile

# Quick lookup by Universal Agent ID
npx create-8004-agent profile 6718082
```

```bash
# See all available commands
npx create-8004-agent --help
```

## CLI Sub-Commands

### `register` — TAP Registration for Existing Agents

Registers your existing ERC-8004 agent on Push Chain's AgentRegistry, giving it a Universal Agent ID.

**When to use:** You already have an ERC-8004 agent on a supported chain and want a canonical TAP identity.

**What it does:**
1. Prompts for chain, agent ID, and private key
2. Verifies you own the agent (calls `ownerOf` on the source chain)
3. Fetches agent metadata from IPFS and hashes it
4. Checks if you're already registered (offers to update if so)
5. Sends the registration through the Universal Gateway
6. Polls Push Chain for confirmation (~30 seconds)
7. Prints your Universal Agent ID and UEA address

**Example:**

```
$ npx create-8004-agent register

🤖 TAP Universal Agent Registration
   Register your existing ERC-8004 agent on Push Chain

? Which chain is your agent on? Ethereum Sepolia
? Your ERC-8004 Agent ID on that chain: 4588
? Private key (or set PRIVATE_KEY env var): ****

Verifying agent ownership...
✓ Agent 4588 on Ethereum Sepolia is owned by 0x1afC...b47c

Fetching agent metadata from chain...
✓ Agent URI: ipfs://bafkrei...
✓ Metadata fetched from IPFS (2.3 KB)

Sending TAP registration via Universal Gateway...
✓ Gateway tx submitted: 0xfe39...b56e
  Waiting for Push Chain confirmation (~30 seconds)...

✅ TAP Universal Agent created!

🆔 Universal Agent ID: 6718082
🔗 UEA Address: 0x2Cd9...2F82
📄 Agent URI: ipfs://bafkrei...
```

**Tip:** Set `PRIVATE_KEY` as an environment variable to skip the interactive prompt.

---

### `bind` — Bind Cross-Chain Agents

Links an agent on any EVM chain to your canonical TAP identity using an EIP-712 signature.

**When to use:** You have agents on multiple chains and want to prove they all belong to the same identity. You must `register` first.

**Prerequisites:**
- A TAP registration (run `register` first)
- Ownership of the agent you're binding (same wallet)
- Gas on the chain you originally registered from (the bind tx goes through that chain's gateway)

**What it does:**
1. Auto-discovers your TAP identity by checking all gateway chains
2. Prompts for the target chain, agent ID, and registry address
3. Verifies you own the agent on the target chain
4. Checks the agent isn't already bound
5. Signs an EIP-712 typed data proof (domain: Push Chain 42101)
6. Sends the bind through the Universal Gateway
7. Polls Push Chain for confirmation

**Example:**

```
$ npx create-8004-agent bind

🔗 TAP Agent Binding
   Link a source-chain agent to your canonical TAP identity

? Private key (or set PRIVATE_KEY env var): ****

Discovering your TAP identity...
✓ Your UEA: 0x2Cd9...2F82
✓ Universal Agent ID: 6718082

? Which chain has the agent you want to bind? Base Sepolia
? Agent ID on that chain: 5807
? ERC-8004 Registry address on that chain: 0x8004...9e

Verifying agent ownership...
✓ Agent 5807 on Base Sepolia is owned by 0x1afC...b47c

Signing EIP-712 bind proof...
✓ Signature created (domain: Push Chain 42101)

Sending bind transaction via Universal Gateway...
✓ Gateway tx submitted: 0x0a94...4c0a

✅ Agent bound successfully!

🔗 Binding: Base Sepolia Agent #5807 → TAP Agent #6718082
```

**Important:** The `canonicalUEA` in the EIP-712 struct is your UEA address (not your EOA). The contract verifies the signature against the `ownerKey` stored during registration.

---

### `profile` — Query Agent Profile

Displays an agent's full TAP profile: identity, cross-chain bindings, reputation, and slash history. **No private key or wallet needed** — this is a read-only command.

**Three lookup modes:**

| Mode | Input | Use case |
| ---- | ----- | -------- |
| TAP Universal Agent | Universal Agent ID | You know the TAP agent ID |
| Source-chain agent | Chain + agent ID | You know the ERC-8004 agent on a specific chain |
| Wallet lookup | Wallet address + chain | You know the owner's wallet |

**Positional shortcut:**

```bash
# Skip the interactive prompt — directly look up by Universal Agent ID
npx create-8004-agent profile 6718082
```

**Example output:**

```
╔══════════════════════════════════════════════════════════════════╗
║  TAP AGENT FULL PROFILE                                        ║
╠══════════════════════════════════════════════════════════════════╣
║  🤖 TAP Agent                                                  ║
║  UEA: 0x2Cd9b0944ce013ebB39E0A4f5cd7717c35CB2F82              ║
╚══════════════════════════════════════════════════════════════════╝

┌─── IDENTITY ──────────────────────────────────────────────────┐
│  Agent ID          6718082                                    │
│  Registered        ✓ true                                     │
│  Origin            eip155:11155111 (Ethereum Sepolia)         │
│  Agent URI         ipfs://bafkrei...om7nkm                    │
└───────────────────────────────────────────────────────────────┘

┌─── CROSS-CHAIN BINDINGS (2) ─────────────────────────────────┐
│  Chain                  Agent ID    Status                    │
│  ─────────────────────────────────────────                   │
│  Ethereum Sepolia       4588        ✓ verified               │
│  Base Sepolia           5807        ✓ verified               │
└───────────────────────────────────────────────────────────────┘

┌─── REPUTATION ───────────────────────────────────────────────┐
│  Score: ████████████████████░░░░  80.59%                     │
│         8059 / 10000 bps                                     │
│                                                              │
│  Per-Chain Breakdown:                                        │
│  Ethereum Sepolia   ██████████████░░  95/100  250fb          │
│  Base Sepolia       ███████████████░  97/100  350fb          │
└───────────────────────────────────────────────────────────────┘

┌─── SLASH HISTORY ────────────────────────────────────────────┐
│  No slashes recorded ✓                                       │
└───────────────────────────────────────────────────────────────┘
```

**Source-chain mode:** If you look up a source-chain agent, the command checks for a TAP binding and tells you the Universal Agent ID if one exists.

## What Gets Generated

The wizard creates a complete agent project with:

```
my-agent/
├── package.json
├── .env.example
├── registration.json          # ERC-8004 metadata
├── tsconfig.json
├── src/
│   ├── register.ts            # On-chain registration (+ TAP on supported chains)
│   ├── agent.ts               # LLM agent (OpenAI)
│   ├── a2a-server.ts          # A2A protocol server (optional)
│   ├── mcp-server.ts          # MCP protocol server (optional)
│   └── tools.ts               # MCP tools (optional)
└── .well-known/
    └── agent-card.json        # A2A discovery card
```

On TAP-supported chains (Ethereum Sepolia, Base Sepolia), the generated `register.ts` includes a TAP registration section that runs after the ERC-8004 registration. It prompts: *"Also create a TAP Universal Agent on Push Chain?"* — if you say yes, it sends the registration via the Universal Gateway and prints your Universal Agent ID.

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

| Chain              | Identity Registry                            | TAP Gateway | x402 |
| ------------------ | -------------------------------------------- | ----------- | ---- |
| ETH Sepolia        | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | ✅          | 4mica |
| Base Sepolia       | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | ✅          | PayAI |
| Polygon Amoy       | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | —           | PayAI, 4mica |
| Avalanche Fuji     | Via agent0-sdk (chainId 43113)               | —           | — |
| Avalanche C-Chain  | Via agent0-sdk (chainId 43114)               | —           | — |
| Monad Testnet      | Via agent0-sdk (chainId 10143)               | —           | — |
| Base Mainnet       | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | —           | PayAI |
| Polygon Mainnet    | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | —           | PayAI |
| SKALE Base         | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | —           | PayAI |
| SKALE Base Sepolia | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | —           | PayAI |

**TAP Gateway ✅** = supports `register`, `bind`, and automatic TAP registration during scaffold. Chains without a gateway can still have agents **bound** to a TAP identity — the bind transaction is sent from a gateway chain, not from the target chain.

### Solana

| Network | Program ID                                     |
| ------- | ---------------------------------------------- |
| Devnet  | `HvF3JqhahcX7JfhbDRYYCJ7S3f6nJdrqu5yi9shyTREp` |

### Push Chain (TAP)

| Contract | Address |
| -------- | ------- |
| AgentRegistry | `0x13499d36729467bd5C6B44725a10a0113cE47178` |
| ReputationRegistry | `0x90B484063622289742516c5dDFdDf1C1A3C2c50C` |
| UEA Factory | `0x00000000000000000000000000000000000000eA` |

Push Chain Donut Testnet — Chain ID: `42101` — RPC: `https://evm.donut.rpc.push.org/`

## Generated Project Usage

After generating your project:

```bash
cd my-agent
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

**EVM chains with TAP support (Sepolia, Base Sepolia):** After the ERC-8004 registration, you'll be prompted: *"Also create a TAP Universal Agent on Push Chain?"* If you accept, the script sends a registration through the Universal Gateway and prints your Universal Agent ID. No Push Chain tokens needed.

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
| SKALE Base | PayAI | ✅ Production |
| SKALE Base Sepolia | PayAI | ✅ Testnet |

When enabled, the A2A server uses x402 middleware for micropayments:
- Per-request pricing (default: $0.001 USDC)
- Automatic payment verification via facilitator
- Payment configuration in `.env`: `X402_PAYEE_ADDRESS`, `X402_PRICE`
- 4mica only: `X402_TAB_ENDPOINT` (public tab endpoint advertised to clients)

### 4mica Setup (Optional Collateral Deposit)

If you select `x402 payments` and choose `4mica` during the wizard, you will be prompted:
`Register with 4mica now (optional collateral deposit)?`

If you say **yes**, the CLI will:
- Ask for a wallet private key (or use the one it generated).
- Ask which asset to deposit (USDC, USDT, or native token) and how much.
- Submit an on-chain deposit via the 4mica SDK and print the transaction hash.

You can safely skip this step if you are not ready to fund the wallet yet. The agent still generates and runs; you can enable 4Mica later after funding a wallet.

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
   - Ethereum Sepolia
   - Polygon Amoy

If `TEST_PAYER_PRIVATE_KEY` is not set, x402 paid request tests will be skipped (other tests still run).

## Resources

-   [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
-   [8004scan Explorer](https://www.8004scan.io/) - View registered agents
-   [A2A Protocol](https://a2a-protocol.org/)
-   [Model Context Protocol](https://modelcontextprotocol.io/)
-   [x402 Protocol](https://x402.org)
-   [PayAI Facilitator](https://payai.network) - x402 facilitator for Base, Polygon
-   [4mica Facilitator](https://x402.4mica.xyz) - x402 facilitator for Ethereum Sepolia, Polygon Amoy
-   [Push Chain](https://push.org) - TAP Universal Agent Identity
-   [8004-solana SDK](https://github.com/8004-ai/8004-solana) - Solana implementation

## License

MIT
