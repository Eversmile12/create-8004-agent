import {
    encodeFunctionData,
    encodeAbiParameters,
    type PublicClient,
    type WalletClient,
} from "viem";
import { TAP_CONSTANTS } from "../config.js";
import {
    agentRegistryAbi,
    universalGatewayAbi,
} from "./abis.js";

const UNIVERSAL_PAYLOAD_TYPE = [
    {
        type: "tuple" as const,
        components: [
            { name: "to", type: "address" as const },
            { name: "value", type: "uint256" as const },
            { name: "data", type: "bytes" as const },
            { name: "gasLimit", type: "uint256" as const },
            { name: "maxFeePerGas", type: "uint256" as const },
            { name: "maxPriorityFeePerGas", type: "uint256" as const },
            { name: "nonce", type: "uint256" as const },
            { name: "deadline", type: "uint256" as const },
            { name: "vType", type: "uint8" as const },
        ],
    },
];

function wrapInUniversalPayload(
    innerCalldata: `0x${string}`,
): `0x${string}` {
    return encodeAbiParameters(UNIVERSAL_PAYLOAD_TYPE, [
        {
            to: TAP_CONSTANTS.AGENT_REGISTRY as `0x${string}`,
            value: 0n,
            data: innerCalldata,
            gasLimit: BigInt(TAP_CONSTANTS.GAS_LIMIT),
            maxFeePerGas: BigInt(TAP_CONSTANTS.MAX_FEE_PER_GAS),
            maxPriorityFeePerGas: BigInt(TAP_CONSTANTS.MAX_PRIORITY_FEE),
            nonce: BigInt(TAP_CONSTANTS.NONCE),
            deadline: BigInt(TAP_CONSTANTS.DEADLINE),
            vType: TAP_CONSTANTS.V_TYPE,
        },
    ]);
}

export function encodeRegisterPayload(
    agentURI: string,
    agentCardHash: `0x${string}`,
): `0x${string}` {
    const innerCalldata = encodeFunctionData({
        abi: agentRegistryAbi,
        functionName: "register",
        args: [agentURI, agentCardHash],
    });
    return wrapInUniversalPayload(innerCalldata);
}

export interface BindRequestParams {
    chainNamespace: string;
    chainId: string;
    registryAddress: `0x${string}`;
    boundAgentId: bigint;
    proofType: number;
    proofData: `0x${string}`;
    nonce: bigint;
    deadline: bigint;
}

export function encodeBindPayload(
    params: BindRequestParams,
): `0x${string}` {
    const innerCalldata = encodeFunctionData({
        abi: agentRegistryAbi,
        functionName: "bind",
        args: [
            {
                chainNamespace: params.chainNamespace,
                chainId: params.chainId,
                registryAddress: params.registryAddress,
                boundAgentId: params.boundAgentId,
                proofType: params.proofType,
                proofData: params.proofData,
                nonce: params.nonce,
                deadline: params.deadline,
            },
        ],
    });
    return wrapInUniversalPayload(innerCalldata);
}

export async function queryGatewayFee(
    publicClient: PublicClient,
    gatewayAddress: `0x${string}`,
): Promise<bigint> {
    try {
        return await publicClient.readContract({
            address: gatewayAddress,
            abi: universalGatewayAbi,
            functionName: "INBOUND_FEE",
        });
    } catch {
        return 0n;
    }
}

export async function sendGatewayTransaction(
    walletClient: WalletClient,
    publicClient: PublicClient,
    gatewayAddress: `0x${string}`,
    universalPayload: `0x${string}`,
    senderAddress: `0x${string}`,
): Promise<`0x${string}`> {
    const fee = await queryGatewayFee(publicClient, gatewayAddress);
    const account = walletClient.account;
    if (!account) {
        throw new Error("WalletClient has no account attached");
    }

    return walletClient.writeContract({
        account,
        address: gatewayAddress,
        abi: universalGatewayAbi,
        functionName: "sendUniversalTx",
        args: [
            {
                recipient:
                    "0x0000000000000000000000000000000000000000",
                token:
                    "0x0000000000000000000000000000000000000000",
                amount: 0n,
                payload: universalPayload,
                revertRecipient: senderAddress,
                signatureData: "0x",
            },
        ],
        value: fee,
        chain: null,
    });
}
