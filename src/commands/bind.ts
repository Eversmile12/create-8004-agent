import chalk from "chalk";
import inquirer from "inquirer";
import {
    createPublicClient,
    createWalletClient,
    http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
    CHAINS,
    TAP_CONSTANTS,
    TAP_GATEWAYS,
    getTapGateway,
    getErc8004Registry,
    type ChainKey,
} from "../config.js";
import {
    erc8004Abi,
    agentRegistryAbi,
} from "../lib/abis.js";
import {
    createPushChainClient,
    discoverUEA,
    computeCanonicalAgentId,
    pollForBinding,
} from "../lib/push-chain.js";
import {
    encodeBindPayload,
    sendGatewayTransaction,
} from "../lib/gateway.js";
import { signBindRequest } from "../lib/eip712.js";

function resolvePrivateKey(raw: string): `0x${string}` {
    const trimmed = raw.trim();
    if (trimmed.startsWith("0x")) return trimmed as `0x${string}`;
    return `0x${trimmed}`;
}

export async function runBindCommand(): Promise<void> {
    console.log(
        chalk.bold.cyan("\n\u{1F517} TAP Agent Binding"),
    );
    console.log(
        chalk.gray(
            "   Link a source-chain agent to your canonical TAP identity\n",
        ),
    );

    let privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        const { key } = await inquirer.prompt<{ key: string }>([
            {
                type: "password",
                name: "key",
                message:
                    "Private key (or set PRIVATE_KEY env var):",
                mask: "*",
            },
        ]);
        privateKey = key;
    }

    const account = privateKeyToAccount(
        resolvePrivateKey(privateKey),
    );
    const pushClient = createPushChainClient();

    console.log(chalk.dim("\nDiscovering your TAP identity..."));

    let registeredUEA: `0x${string}` | null = null;
    let registeredChainKey: string | null = null;
    let canonicalAgentId: bigint | null = null;

    for (const [chainKey] of Object.entries(TAP_GATEWAYS)) {
        const chain = CHAINS[chainKey as ChainKey];
        const { ueaAddress } = await discoverUEA(
            String(chain.chainId),
            account.address,
        );
        const agentId = computeCanonicalAgentId(ueaAddress);
        const isRegistered = await pushClient.readContract({
            address: TAP_CONSTANTS.AGENT_REGISTRY as `0x${string}`,
            abi: agentRegistryAbi,
            functionName: "isRegistered",
            args: [agentId],
        });
        if (isRegistered) {
            registeredUEA = ueaAddress;
            registeredChainKey = chainKey;
            canonicalAgentId = agentId;
            break;
        }
    }

    if (!registeredUEA || !registeredChainKey || !canonicalAgentId) {
        console.error(
            chalk.red("No TAP registration found for your wallet."),
        );
        console.error(
            chalk.dim(
                "Run `npx create-8004-agent register` first.",
            ),
        );
        process.exit(1);
    }

    console.log(
        chalk.green(`✓ Your UEA: ${registeredUEA}`),
    );
    console.log(
        chalk.green(
            `✓ Universal Agent ID: ${canonicalAgentId}`,
        ),
    );
    console.log(
        chalk.green("✓ Currently registered on Push Chain"),
    );

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
            message:
                "Which chain has the agent you want to bind?",
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

    const registryAddress = getErc8004Registry(answers.chain);

    const targetChain = CHAINS[answers.chain as ChainKey];
    const targetClient = createPublicClient({
        transport: http(targetChain.rpcUrl),
    });

    console.log(chalk.dim("\nVerifying agent ownership..."));

    let owner: string;
    try {
        owner = await targetClient.readContract({
            address: registryAddress,
            abi: erc8004Abi,
            functionName: "ownerOf",
            args: [BigInt(answers.agentId)],
        });
    } catch {
        console.error(
            chalk.red(
                `Agent ${answers.agentId} not found on ${targetChain.name}.`,
            ),
        );
        process.exit(1);
    }

    if (owner.toLowerCase() !== account.address.toLowerCase()) {
        console.error(
            chalk.red(
                `Agent ${answers.agentId} is owned by ${owner}, not your wallet ${account.address}`,
            ),
        );
        process.exit(1);
    }

    console.log(
        chalk.green(
            `✓ Agent ${answers.agentId} on ${targetChain.name} is owned by ${account.address}`,
        ),
    );

    console.log(chalk.dim("Checking existing bindings..."));

    const [existingCanonical] = await pushClient.readContract({
        address: TAP_CONSTANTS.AGENT_REGISTRY as `0x${string}`,
        abi: agentRegistryAbi,
        functionName: "canonicalOwnerFromBinding",
        args: [
            "eip155",
            String(targetChain.chainId),
            registryAddress,
            BigInt(answers.agentId),
        ],
    });

    if (
        existingCanonical !==
        "0x0000000000000000000000000000000000000000"
    ) {
        console.error(
            chalk.red(
                `Agent ${answers.agentId} on ${targetChain.name} is already bound to UEA ${existingCanonical}`,
            ),
        );
        process.exit(1);
    }

    console.log(
        chalk.green("✓ No existing binding for this agent"),
    );

    const bindings = await pushClient.readContract({
        address: TAP_CONSTANTS.AGENT_REGISTRY as `0x${string}`,
        abi: agentRegistryAbi,
        functionName: "getBindings",
        args: [canonicalAgentId],
    });

    const nonce = BigInt(bindings.length + 1);
    const deadline = BigInt(TAP_CONSTANTS.BIND_DEADLINE);

    console.log(chalk.dim("Signing EIP-712 bind proof..."));

    const gatewayChain =
        CHAINS[registeredChainKey as ChainKey];
    const gatewayWalletClient = createWalletClient({
        account,
        transport: http(gatewayChain.rpcUrl),
    });

    const signature = await signBindRequest(
        gatewayWalletClient,
        {
            canonicalOwner: registeredUEA,
            chainNamespace: "eip155",
            chainId: String(targetChain.chainId),
            registryAddress:
                registryAddress,
            boundAgentId: BigInt(answers.agentId),
            nonce,
            deadline,
        },
    );

    console.log(
        chalk.green(
            "✓ Signature created (domain: Push Chain 42101)",
        ),
    );

    console.log(
        chalk.dim(
            "\nSending bind transaction via Universal Gateway...",
        ),
    );

    const gatewayAddress = getTapGateway(
        registeredChainKey,
    ) as `0x${string}`;
    const gatewaySourceClient = createPublicClient({
        transport: http(gatewayChain.rpcUrl),
    });

    const bindPayload = encodeBindPayload({
        chainNamespace: "eip155",
        chainId: String(targetChain.chainId),
        registryAddress:
            registryAddress,
        boundAgentId: BigInt(answers.agentId),
        proofType: 0,
        proofData: signature,
        nonce,
        deadline,
    });

    let txHash: string;
    try {
        txHash = await sendGatewayTransaction(
            gatewayWalletClient,
            gatewaySourceClient,
            gatewayAddress,
            bindPayload,
            account.address,
        );
    } catch (err: unknown) {
        const msg =
            err instanceof Error ? err.message : String(err);
        console.error(
            chalk.red(`Gateway transaction failed: ${msg}`),
        );
        process.exit(1);
    }

    console.log(chalk.green(`✓ Gateway tx submitted: ${txHash}`));
    console.log(
        chalk.dim(
            "  Waiting for Push Chain confirmation (~30 seconds)...",
        ),
    );

    const confirmed = await pollForBinding(
        canonicalAgentId,
        bindings.length + 1,
        120_000,
    );

    console.log();
    if (confirmed) {
        console.log(
            chalk.green.bold("✅ Agent bound successfully!"),
        );
        console.log();
        console.log(
            `\u{1F517} Binding: ${targetChain.name} Agent #${answers.agentId} → TAP Agent #${canonicalAgentId}`,
        );
        console.log(
            `\u{1F4CB} Verified: true`,
        );
        console.log(
            `\u{1F522} Nonce used: ${nonce}`,
        );
        console.log();
        console.log(
            chalk.dim(
                "\u{1F4A1} Run `npx create-8004-agent bind` again to bind agents from other chains.",
            ),
        );
        console.log(
            chalk.dim(
                `   Run \`npx create-8004-agent profile ${canonicalAgentId}\` to see all bindings.`,
            ),
        );
    } else {
        console.log(
            chalk.yellow(
                "⏳ Bind submitted but not yet confirmed.",
            ),
        );
        console.log(
            chalk.dim(
                "  The Push Chain TSS relay can take up to 2 minutes.",
            ),
        );
        console.log(
            chalk.dim(
                `  Check with: npx create-8004-agent profile ${canonicalAgentId}`,
            ),
        );
    }
    console.log();
}
