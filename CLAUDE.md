# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`create-8004-agent` is a CLI tool (published to npm) that scaffolds ERC-8004 compliant AI agent projects. It also provides sub-commands (`register`, `bind`, `profile`) for managing TAP (Trustless Agents Plus) universal agent identity on Push Chain.

The tool generates complete agent projects with on-chain registration scripts, A2A servers, MCP servers, and x402 payment middleware — configured for a user-selected blockchain.

## Build & Run

```bash
npm run build          # tsc → dist/
npm run dev            # tsx src/index.ts (run wizard without building)
npm start              # node dist/index.js (requires build first)
```

## Testing

```bash
npm test               # vitest run (all tests)
npm run test:watch     # vitest in watch mode
```

Tests import from `dist/`, so **always build before testing**. Tests run in single-thread mode (`pool: 'threads'`, `singleThread: true`) to avoid port conflicts — each test suite spins up real HTTP servers from generated projects.

Test structure:
- `tests/chains/*.test.ts` — per-chain test suites, each a one-liner calling `createChainTestSuite()` from `tests/utils/chain-test-factory.ts`
- `tests/tap.test.ts` — TAP config helpers and template generation tests
- `tests/avalanche-config.test.ts` — Avalanche-specific config tests
- `tests/utils/test-helpers.ts` — `generateTestAgent()`, `ServerProcess`, `A2ATestClient`, `testMCPServer()` utilities
- `tests/setup.ts` — global setup, loads dotenv

Generated test projects go to `test-output/` (gitignored). x402 paid request tests require `TEST_PAYER_PRIVATE_KEY` env var with a funded testnet wallet; they're skipped otherwise. Test timeout is 120s (servers need startup time).

## Architecture

### Entry Point & CLI Routing

`src/index.ts` — CLI entrypoint (`#!/usr/bin/env node`). Routes to:
- Default (no args): interactive wizard → project generation
- `register`: `src/commands/register.ts` — register existing agent on Push Chain
- `bind`: `src/commands/bind.ts` — EIP-712 cross-chain binding
- `profile`: `src/commands/profile.ts` — read-only agent profile lookup (supports positional arg `profile <id>`)

### Wizard → Generator Pipeline

1. **`src/wizard.ts`** — inquirer prompts, collects `WizardAnswers` (chain, features, wallet, trust models). Auto-generates EVM or Solana wallets if none provided.
2. **`src/generator.ts`** — routes to chain-specific template generators based on chain type:
   - EVM chains → `src/templates/base.ts`
   - Solana → `src/templates/solana.ts`
   - Monad → `src/templates/monad.ts` (direct contract calls, SDK doesn't support Monad)
   - Shared across all: `src/templates/a2a.ts` (A2A server + agent card), `src/templates/mcp.ts` (MCP server + tools)
3. **`src/templates/tap.ts`** — generates the TAP registration code block appended to `register.ts` for TAP-supported chains only
4. **`src/fourmica.ts`** — optional post-generation 4mica collateral deposit (x402)

### TAP Infrastructure (`src/lib/`)

TAP operations work through Universal Gateways on source chains (Ethereum Sepolia, Base Sepolia) to relay transactions to Push Chain:

- **`src/lib/gateway.ts`** — encodes register/bind payloads into Universal Gateway transactions. Uses a 3-layer encoding: inner calldata → universal payload tuple → `sendUniversalTx` call
- **`src/lib/push-chain.ts`** — Push Chain RPC client, UEA discovery (`getUEAForOrigin`), canonical agent ID computation (`BigInt(ueaAddress) % 10_000_000n`), polling for registration/binding confirmation
- **`src/lib/eip712.ts`** — EIP-712 typed data signing for bind proofs (domain: TAP, chainId: 42101)
- **`src/lib/abis.ts`** — contract ABIs (AgentRegistry, UniversalGateway, UEA Factory, ERC-8004, ReputationRegistry)
- **`src/lib/display.ts`** — profile rendering (box-drawing, reputation bars)

### Chain Configuration

- **`src/config.ts`** — `CHAINS` object with all EVM chain configs (RPC URLs, chain IDs, x402 support, USDC addresses). `TAP_GATEWAYS` maps supported chains to gateway addresses. `TAP_CONSTANTS` has all Push Chain contract addresses and gas parameters.
- **`src/config-solana.ts`** — Solana chain configs (currently just devnet)

### Key Design Decisions

- Templates emit raw TypeScript strings (template literals), not AST transforms. Each template function returns a complete file as a string.
- The generated `register.ts` for TAP-supported chains includes the entire TAP flow inline (viem imports, gateway tx, polling) — it's self-contained so users don't need the CLI after scaffolding.
- Tests validate generated projects end-to-end: generate → install deps → start server → make HTTP requests → verify responses.
- x402 has two provider paths: PayAI (exact scheme, `@x402/express`) and 4mica (credit scheme, `@4mica/x402`). The provider is determined by chain config.

## Key Types

- `WizardAnswers` (`src/wizard.ts`) — central config type flowing through the entire generation pipeline
- `ChainKey` (`src/config.ts`) — union of all EVM chain identifiers
- `SolanaChainKey` (`src/config-solana.ts`) — union of Solana chain identifiers
- `X402Provider` (`src/config.ts`) — `"payai" | "4mica"`

## Environment Variables

- `PRIVATE_KEY` — used by `register` and `bind` commands (can also be prompted interactively)
- `TEST_PAYER_PRIVATE_KEY` — for x402 paid request tests (optional, tests skip if absent)
