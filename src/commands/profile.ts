import chalk from "chalk";
import inquirer from "inquirer";
import { getAddress } from "viem";
import {
    CHAINS,
    TAP_CONSTANTS,
    TAP_GATEWAYS,
    type ChainKey,
} from "../config.js";
import {
    agentRegistryAbi,
    reputationRegistryAbi,
    erc8004Abi,
} from "../lib/abis.js";
import {
    createPushChainClient,
    discoverUEA,
    computeCanonicalAgentId,
} from "../lib/push-chain.js";
import {
    renderHeader,
    renderIdentitySection,
    renderBindingsSection,
    renderReverseLookupsSection,
    renderReputationSection,
    renderSlashSection,
    chainName,
    type AgentRecord,
    type BindEntry,
    type AggregatedReputation,
    type ChainReputation,
    type SlashRecord,
} from "../lib/display.js";
import { createPublicClient, http } from "viem";

async function displayTapProfile(agentId: bigint): Promise<void> {
    const pushClient = createPushChainClient();
    const registryAddr = TAP_CONSTANTS.AGENT_REGISTRY as `0x${string}`;
    const repAddr = TAP_CONSTANTS.REPUTATION_REGISTRY as `0x${string}`;

    const [record, uea, bindings, score, agg, chains, slashes, fresh1h] =
        await Promise.all([
            pushClient.readContract({
                address: registryAddr,
                abi: agentRegistryAbi,
                functionName: "getAgentRecord",
                args: [agentId],
            }),
            pushClient.readContract({
                address: registryAddr,
                abi: agentRegistryAbi,
                functionName: "canonicalUEA",
                args: [agentId],
            }),
            pushClient.readContract({
                address: registryAddr,
                abi: agentRegistryAbi,
                functionName: "getBindings",
                args: [agentId],
            }),
            pushClient.readContract({
                address: repAddr,
                abi: reputationRegistryAbi,
                functionName: "getReputationScore",
                args: [agentId],
            }),
            pushClient.readContract({
                address: repAddr,
                abi: reputationRegistryAbi,
                functionName: "getAggregatedReputation",
                args: [agentId],
            }),
            pushClient.readContract({
                address: repAddr,
                abi: reputationRegistryAbi,
                functionName: "getAllChainReputations",
                args: [agentId],
            }),
            pushClient.readContract({
                address: repAddr,
                abi: reputationRegistryAbi,
                functionName: "getSlashRecords",
                args: [agentId],
            }),
            pushClient.readContract({
                address: repAddr,
                abi: reputationRegistryAbi,
                functionName: "isFresh",
                args: [agentId, 3600n],
            }),
        ]);

    if (!record.registered) {
        console.error(
            chalk.red(
                `Agent ${agentId} is not registered on Push Chain.`,
            ),
        );
        process.exit(1);
    }

    const ueaStr = getAddress(uea);
    renderHeader("TAP Agent", ueaStr);

    renderIdentitySection(
        record as unknown as AgentRecord,
        ueaStr,
        agentId,
    );

    const bindingsTyped = bindings as unknown as BindEntry[];
    renderBindingsSection(bindingsTyped);

    if (bindingsTyped.length > 0) {
        const reverseLookups = await Promise.all(
            bindingsTyped.map((b) =>
                pushClient.readContract({
                    address: registryAddr,
                    abi: agentRegistryAbi,
                    functionName: "canonicalUEAFromBinding",
                    args: [
                        b.chainNamespace,
                        b.chainId,
                        b.registryAddress as `0x${string}`,
                        b.boundAgentId,
                    ],
                }),
            ),
        );
        renderReverseLookupsSection(
            bindingsTyped,
            reverseLookups as unknown as [string, boolean][],
        );
    }

    renderReputationSection(
        score,
        agg as unknown as AggregatedReputation,
        chains as unknown as ChainReputation[],
        fresh1h,
    );
    renderSlashSection(slashes as unknown as SlashRecord[]);
    console.log();
}

async function displaySourceChainAgent(
    chainKey: string,
    agentId: bigint,
): Promise<void> {
    const chain = CHAINS[chainKey as ChainKey];
    const sourceClient = createPublicClient({
        transport: http(chain.rpcUrl),
    });
    const registryAddr =
        TAP_CONSTANTS.ERC8004_IDENTITY_TESTNET as `0x${string}`;

    let owner: string;
    let tokenUri: string;
    try {
        [owner, tokenUri] = await Promise.all([
            sourceClient.readContract({
                address: registryAddr,
                abi: erc8004Abi,
                functionName: "ownerOf",
                args: [agentId],
            }),
            sourceClient.readContract({
                address: registryAddr,
                abi: erc8004Abi,
                functionName: "tokenURI",
                args: [agentId],
            }),
        ]);
    } catch {
        console.error(
            chalk.red(
                `Agent ${agentId} not found on ${chain.name}.`,
            ),
        );
        process.exit(1);
    }

    console.log();
    console.log(chalk.green(`✓ Agent found on ${chain.name}`));
    console.log();
    console.log(
        chalk.dim("  Agent ID:  ") + chalk.white(agentId.toString()),
    );
    console.log(
        chalk.dim("  Owner:     ") + chalk.cyan(owner),
    );
    console.log(
        chalk.dim("  Token URI: ") + chalk.cyan(tokenUri),
    );

    console.log();
    console.log(chalk.dim("Checking for TAP binding..."));

    const pushClient = createPushChainClient();
    try {
        const [canonical, verified] = await pushClient.readContract({
            address: TAP_CONSTANTS.AGENT_REGISTRY as `0x${string}`,
            abi: agentRegistryAbi,
            functionName: "canonicalUEAFromBinding",
            args: [
                "eip155",
                String(chain.chainId),
                registryAddr,
                agentId,
            ],
        });

        if (
            canonical !==
            "0x0000000000000000000000000000000000000000"
        ) {
            const canonicalAgentId =
                computeCanonicalAgentId(canonical);
            console.log(
                chalk.green(
                    "✓ This agent is bound to a TAP identity!",
                ),
            );
            console.log();
            console.log(
                `  TAP Universal Agent ID: ${chalk.bold.white(canonicalAgentId.toString())}`,
            );
            console.log(
                chalk.dim(
                    `  Run: npx create-8004-agent profile ${canonicalAgentId}`,
                ),
            );
        } else {
            console.log(
                chalk.yellow("✗ No TAP binding found for this agent."),
            );
            console.log();
            console.log(
                chalk.dim(
                    "  To create a TAP identity: npx create-8004-agent register",
                ),
            );
        }
    } catch {
        console.log(
            chalk.yellow(
                "Could not check TAP binding (Push Chain may be unreachable).",
            ),
        );
    }
    console.log();
}

async function displayWalletLookup(
    walletAddress: string,
    sourceChainKey: string,
): Promise<void> {
    const chain = CHAINS[sourceChainKey as ChainKey];
    console.log(chalk.dim("\nDiscovering UEA for this wallet..."));

    const { ueaAddress } = await discoverUEA(
        String(chain.chainId),
        walletAddress,
    );
    const canonicalAgentId = computeCanonicalAgentId(ueaAddress);

    console.log(
        chalk.green(`✓ UEA: ${ueaAddress}`),
    );
    console.log(
        chalk.green(
            `✓ Universal Agent ID: ${canonicalAgentId}`,
        ),
    );

    const pushClient = createPushChainClient();
    const isRegistered = await pushClient.readContract({
        address: TAP_CONSTANTS.AGENT_REGISTRY as `0x${string}`,
        abi: agentRegistryAbi,
        functionName: "isRegistered",
        args: [canonicalAgentId],
    });

    if (isRegistered) {
        await displayTapProfile(canonicalAgentId);
    } else {
        console.log();
        console.log(
            chalk.yellow(
                `No TAP registration found for wallet ${walletAddress}`,
            ),
        );
        console.log(
            chalk.dim(`  UEA would be: ${ueaAddress}`),
        );
        console.log(
            chalk.dim(
                `  Expected Agent ID: ${canonicalAgentId}`,
            ),
        );
        console.log();
    }
}

export async function runProfileCommand(): Promise<void> {
    console.log(
        chalk.bold.cyan("\n\u{1F50D} Agent Profile Lookup\n"),
    );

    const directAgentId = process.argv[3];
    if (directAgentId && /^\d+$/.test(directAgentId)) {
        await displayTapProfile(BigInt(directAgentId));
        return;
    }

    const { mode } = await inquirer.prompt<{ mode: string }>([
        {
            type: "list",
            name: "mode",
            message: "What do you want to look up?",
            choices: [
                {
                    name: "TAP Universal Agent (I have a Universal Agent ID)",
                    value: "tap",
                },
                {
                    name: "Source-chain agent (I have an ERC-8004 agent ID)",
                    value: "source",
                },
                {
                    name: "Wallet lookup (I have a wallet address)",
                    value: "wallet",
                },
            ],
        },
    ]);

    if (mode === "tap") {
        const { agentId } = await inquirer.prompt<{
            agentId: string;
        }>([
            {
                type: "input",
                name: "agentId",
                message: "Universal Agent ID:",
                validate: (input: string) => {
                    const n = Number(input);
                    return Number.isInteger(n) && n > 0
                        ? true
                        : "Enter a valid agent ID (positive integer)";
                },
            },
        ]);
        await displayTapProfile(BigInt(agentId));
    } else if (mode === "source") {
        const chainChoices = Object.entries(CHAINS).map(
            ([key, chain]) => ({
                name: chain.name,
                value: key,
            }),
        );
        const answers = await inquirer.prompt<{
            chain: string;
            agentId: string;
        }>([
            {
                type: "list",
                name: "chain",
                message: "Which chain?",
                choices: chainChoices,
            },
            {
                type: "input",
                name: "agentId",
                message: "Agent ID on that chain:",
                validate: (input: string) => {
                    const n = Number(input);
                    return Number.isInteger(n) && n > 0
                        ? true
                        : "Enter a valid agent ID";
                },
            },
        ]);
        await displaySourceChainAgent(
            answers.chain,
            BigInt(answers.agentId),
        );
    } else {
        const tapChainChoices = Object.entries(TAP_GATEWAYS).map(
            ([key]) => ({
                name: CHAINS[key as ChainKey].name,
                value: key,
            }),
        );
        const answers = await inquirer.prompt<{
            wallet: string;
            chain: string;
        }>([
            {
                type: "input",
                name: "wallet",
                message: "Wallet address:",
                validate: (input: string) =>
                    /^0x[a-fA-F0-9]{40}$/.test(input)
                        ? true
                        : "Enter a valid Ethereum address",
            },
            {
                type: "list",
                name: "chain",
                message:
                    "Which chain was the agent registered from?",
                choices: tapChainChoices,
            },
        ]);
        await displayWalletLookup(answers.wallet, answers.chain);
    }
}
