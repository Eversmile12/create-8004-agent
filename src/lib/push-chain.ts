import {
    createPublicClient,
    http,
    type PublicClient,
} from "viem";
import { TAP_CONSTANTS } from "../config.js";
import {
    ueaFactoryAbi,
    agentRegistryAbi,
} from "./abis.js";

const pushChainDef = {
    id: TAP_CONSTANTS.PUSH_CHAIN_ID,
    name: "Push Chain Donut Testnet",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: {
        default: { http: [TAP_CONSTANTS.PUSH_CHAIN_RPC] },
    },
} as const;

export function createPushChainClient(): PublicClient {
    return createPublicClient({
        chain: pushChainDef,
        transport: http(TAP_CONSTANTS.PUSH_CHAIN_RPC),
    });
}

export async function discoverUEA(
    sourceChainId: string,
    ownerAddress: string,
): Promise<{ ueaAddress: `0x${string}`; isDeployed: boolean }> {
    const client = createPushChainClient();
    const [ueaAddress, isDeployed] = await client.readContract({
        address: TAP_CONSTANTS.UEA_FACTORY as `0x${string}`,
        abi: ueaFactoryAbi,
        functionName: "getUEAForOrigin",
        args: [
            {
                chainNamespace: "eip155",
                chainId: sourceChainId,
                owner: ownerAddress as `0x${string}`,
            },
        ],
    });
    return { ueaAddress, isDeployed };
}

export function computeCanonicalAgentId(
    ueaAddress: string,
): bigint {
    let agentId = BigInt(ueaAddress) % 10_000_000n;
    if (agentId === 0n) agentId = 10_000_000n;
    return agentId;
}

export async function pollForRegistration(
    agentId: bigint,
    timeoutMs = 120_000,
): Promise<boolean> {
    const client = createPushChainClient();
    const interval = 5_000;
    const maxAttempts = Math.ceil(timeoutMs / interval);

    for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, interval));
        try {
            const isReg = await client.readContract({
                address: TAP_CONSTANTS.AGENT_REGISTRY as `0x${string}`,
                abi: agentRegistryAbi,
                functionName: "isRegistered",
                args: [agentId],
            });
            if (isReg) return true;
        } catch {
            // Push Chain RPC may be slow — keep polling
        }
        process.stdout.write(".");
    }
    return false;
}

export async function pollForBinding(
    agentId: bigint,
    expectedCount: number,
    timeoutMs = 120_000,
): Promise<boolean> {
    const client = createPushChainClient();
    const interval = 5_000;
    const maxAttempts = Math.ceil(timeoutMs / interval);

    for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, interval));
        try {
            const bindings = await client.readContract({
                address: TAP_CONSTANTS.AGENT_REGISTRY as `0x${string}`,
                abi: agentRegistryAbi,
                functionName: "getBindings",
                args: [agentId],
            });
            if (bindings.length >= expectedCount) return true;
        } catch {
            // Keep polling
        }
        process.stdout.write(".");
    }
    return false;
}
