import type { WalletClient } from "viem";
import { TAP_CONSTANTS } from "../config.js";

const BIND_DOMAIN = {
    name: "TAP",
    version: "1",
    chainId: TAP_CONSTANTS.PUSH_CHAIN_ID,
    verifyingContract:
        TAP_CONSTANTS.AGENT_REGISTRY as `0x${string}`,
} as const;

const BIND_TYPES = {
    Bind: [
        { name: "canonicalUEA", type: "address" },
        { name: "chainNamespace", type: "string" },
        { name: "chainId", type: "string" },
        { name: "registryAddress", type: "address" },
        { name: "boundAgentId", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
    ],
} as const;

export interface BindSignatureParams {
    canonicalUEA: `0x${string}`;
    chainNamespace: string;
    chainId: string;
    registryAddress: `0x${string}`;
    boundAgentId: bigint;
    nonce: bigint;
    deadline: bigint;
}

export async function signBindRequest(
    walletClient: WalletClient,
    params: BindSignatureParams,
): Promise<`0x${string}`> {
    const account = walletClient.account;
    if (!account) {
        throw new Error("WalletClient has no account attached");
    }

    return walletClient.signTypedData({
        account,
        domain: BIND_DOMAIN,
        types: BIND_TYPES,
        primaryType: "Bind",
        message: {
            canonicalUEA: params.canonicalUEA,
            chainNamespace: params.chainNamespace,
            chainId: params.chainId,
            registryAddress: params.registryAddress,
            boundAgentId: params.boundAgentId,
            nonce: params.nonce,
            deadline: params.deadline,
        },
    });
}
