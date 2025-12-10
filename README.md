# create-trustless-agent

CLI tool to scaffold [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) compliant AI agents with A2A, MCP, and x402 payment support.

## What is ERC-8004?

ERC-8004 is a protocol for discovering and trusting AI agents across organizational boundaries. It provides:

- **Identity Registry** - On-chain agent registration as NFTs
- **Reputation Registry** - Feedback and trust signals
- **Validation Registry** - Stake-secured verification

## Quick Start

```bash
npx create-trustless-agent
```

That's it! The wizard will guide you through creating your agent.

## What Gets Generated

The wizard creates a complete agent project with:

```
my-agent/
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

| Option | Description |
|--------|-------------|
| **Project directory** | Where to create the project |
| **Agent name** | Your agent's name |
| **Agent description** | What your agent does |
| **Agent image** | URL to your agent's image/logo |
| **Agent wallet** | Ethereum address (leave empty to auto-generate) |
| **A2A server** | Enable agent-to-agent communication |
| **MCP server** | Enable Model Context Protocol tools |
| **x402 payments** | Enable [Coinbase x402](https://docs.cdp.coinbase.com/x402/quickstart-for-sellers) USDC payments |
| **Storage** | IPFS (Pinata) or Base64 on-chain |
| **Chain** | ETH Sepolia, Base Sepolia, Linea Sepolia, Polygon Amoy |
| **Trust models** | reputation, crypto-economic, tee-attestation |

## Supported Chains

| Chain | Identity Registry |
|-------|-------------------|
| Base Sepolia | `0x8004AA63c570c570eBF15376c0dB199918BFe9Fb` |
| ETH Sepolia | `0x8004a6090Cd10A7288092483047B097295Fb8847` |
| Linea Sepolia | `0x8004aa7C931bCE1233973a0C6A667f73F66282e7` |
| Polygon Amoy | `0x8004ad19E14B9e0654f73353e8a0B600D46C2898` |

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
PINATA_JWT=your_pinata_jwt        # If using IPFS storage
```

**Auto-generated wallet:** If you left the wallet address empty, a new wallet was generated and the private key is already in `.env`. **Back up your .env file** and **fund the wallet with testnet ETH** before registering.

### 2. Register Agent On-Chain

```bash
npm run register
```

This will:
- Upload `registration.json` to IPFS (or encode as base64)
- Mint an NFT on the Identity Registry
- Output your agent's on-chain ID

### 3. Start Your Servers

```bash
# Start A2A server
npm run start:a2a

# Start MCP server (in another terminal)
npm run start:mcp
```

## A2A Protocol

The generated A2A server implements:

- **Agent Card** at `/.well-known/agent-card.json`
- **JSON-RPC 2.0** endpoint at `/a2a`
- Methods: `message/send`, `tasks/get`, `tasks/cancel`

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

If x402 is enabled, you'll get a `402 Payment Required` response with payment instructions. This is expected - it means the payment gate is working.

## x402 Payments

If enabled, the A2A server uses [Coinbase x402](https://github.com/coinbase/x402) for micropayments:

- Payments in USDC
- Per-request pricing
- Automatic payment verification

## MCP Protocol

The generated MCP server includes sample tools:

- `chat` - Conversation with the LLM
- `echo` - Echo back input (testing)
- `get_time` - Current timestamp

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

## Resources

- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [A2A Protocol](https://a2a-protocol.org/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Coinbase x402](https://github.com/coinbase/x402)

## License

MIT

