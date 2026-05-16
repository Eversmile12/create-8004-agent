import chalk from "chalk";
import inquirer from "inquirer";
import {
    createPublicClient,
    createWalletClient,
    http,
    keccak256,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
    CHAINS,
    TAP_CONSTANTS,
    TAP_GATEWAYS,
    getTapGateway,
    type ChainKey,
} from "../config.js";
import { erc8004Abi, agentRegistryAbi } from "../lib/abis.js";
import {
    createPushChainClient,
    discoverUEA,
    computeCanonicalAgentId,
    pollForRegistration,
} from "../lib/push-chain.js";
import {
    encodeRegisterPayload,
    sendGatewayTransaction,
} from "../lib/gateway.js";

function resolvePrivateKey(raw: string): `0x${string}` {
    const trimmed = raw.trim();
    if (trimmed.startsWith("0x")) return trimmed as `0x${string}`;
    return `0x${trimmed}`;
}

export async function runRegisterCommand(): Promise<void> {
    console.log(
        chalk.bold.cyan(
            "\n\u{1F916} TAP Universal Agent Registration",
        ),
    );
    console.log(
        chalk.gray(
            "   Register your existing ERC-8004 agent on Push Chain\n",
        ),
    );

    const tapChainChoices = Object.entries(TAP_GATEWAYS).map(
        ([key]) => ({
            name: CHAINS[key as ChainKey].name,
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
            message: "Which chain is your agent on?",
            choices: tapChainChoices,
        },
        {
            type: "input",
            name: "agentId",
            message: "Your ERC-8004 Agent ID on that chain:",
            validate: (input: string) => {
                const n = Number(input);
                return Number.isInteger(n) && n > 0
                    ? true
                    : "Enter a valid agent ID (positive integer)";
            },
        },
    ]);

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

    const chain = CHAINS[answers.chain as ChainKey];
    const account = privateKeyToAccount(
        resolvePrivateKey(privateKey),
    );
    const sourceClient = createPublicClient({
        transport: http(chain.rpcUrl),
    });
    const registryAddr =
        TAP_CONSTANTS.ERC8004_IDENTITY_TESTNET as `0x${string}`;

    console.log(chalk.dim("\nVerifying agent ownership..."));

    let owner: string;
    try {
        owner = await sourceClient.readContract({
            address: registryAddr,
            abi: erc8004Abi,
            functionName: "ownerOf",
            args: [BigInt(answers.agentId)],
        });
    } catch {
        console.error(
            chalk.red(
                `Agent ${answers.agentId} not found on ${chain.name}.`,
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
            `✓ Agent ${answers.agentId} on ${chain.name} is owned by ${account.address}`,
        ),
    );

    console.log(chalk.dim("\nFetching agent metadata from chain..."));

    let agentURI: string;
    try {
        agentURI = await sourceClient.readContract({
            address: registryAddr,
            abi: erc8004Abi,
            functionName: "tokenURI",
            args: [BigInt(answers.agentId)],
        });
    } catch {
        console.error(
            chalk.red(
                `Could not fetch tokenURI for agent ${answers.agentId}.`,
            ),
        );
        process.exit(1);
    }

    console.log(chalk.green(`✓ Agent URI: ${agentURI}`));

    const ipfsCid = agentURI.replace("ipfs://", "");
    console.log(
        chalk.dim("  Fetching metadata from IPFS for hashing..."),
    );

    let agentCardHash: `0x${string}`;
    try {
        const metadataRes = await fetch(
            `${TAP_CONSTANTS.IPFS_GATEWAY}${ipfsCid}`,
        );
        if (!metadataRes.ok) {
            throw new Error(`HTTP ${metadataRes.status}`);
        }
        const metadataBytes = new Uint8Array(
            await metadataRes.arrayBuffer(),
        );
        agentCardHash = keccak256(metadataBytes);
        console.log(
            chalk.green(
                `✓ Metadata fetched from IPFS (${metadataBytes.length} bytes)`,
            ),
        );
    } catch (err: unknown) {
        const msg =
            err instanceof Error ? err.message : String(err);
        console.error(
            chalk.red(
                `Could not fetch metadata from IPFS: ${msg}`,
            ),
        );
        process.exit(1);
    }

    const pushClient = createPushChainClient();

    console.log(
        chalk.dim("Checking for existing TAP identity..."),
    );

    let existingAgentId: bigint | null = null;
    let existingChainKey: string | null = null;
    for (const [gw] of Object.entries(TAP_GATEWAYS)) {
        const gwChain = CHAINS[gw as ChainKey];
        const { ueaAddress: gwUea } = await discoverUEA(
            String(gwChain.chainId),
            account.address,
        );
        const gwAgentId = computeCanonicalAgentId(gwUea);
        const isReg = await pushClient.readContract({
            address: TAP_CONSTANTS.AGENT_REGISTRY as `0x${string}`,
            abi: agentRegistryAbi,
            functionName: "isRegistered",
            args: [gwAgentId],
        });
        if (isReg) {
            existingAgentId = gwAgentId;
            existingChainKey = gw;
            break;
        }
    }

    if (existingAgentId !== null) {
        const registeredVia =
            CHAINS[existingChainKey as ChainKey].name;
        console.log();
        console.log(
            chalk.green(
                `✓ You already have a TAP identity (registered via ${registeredVia})`,
            ),
        );
        console.log(
            chalk.green(
                `✓ Universal Agent ID: ${existingAgentId}`,
            ),
        );

        if (existingChainKey === answers.chain) {
            console.log();
            console.log(
                chalk.dim(
                    "  Running register again will update the metadata.",
                ),
            );
            const { proceed } = await inquirer.prompt<{
                proceed: boolean;
            }>([
                {
                    type: "confirm",
                    name: "proceed",
                    message: "Update existing registration?",
                    default: false,
                },
            ]);
            if (!proceed) return;
        } else {
            console.log();
            console.log(
                chalk.yellow(
                    "You cannot register again from a different chain.",
                ),
            );
            console.log(
                chalk.white(
                    "  To link this agent, use the bind command instead:",
                ),
            );
            console.log(
                chalk.cyan(
                    `  npx create-8004-agent bind`,
                ),
            );
            console.log();
            return;
        }
    }

    const { ueaAddress } = await discoverUEA(
        String(chain.chainId),
        account.address,
    );
    const canonicalAgentId = computeCanonicalAgentId(ueaAddress);

    console.log(
        chalk.dim(
            "\nSending TAP registration via Universal Gateway...",
        ),
    );

    const gatewayAddress = getTapGateway(
        answers.chain,
    ) as `0x${string}`;
    const walletClient = createWalletClient({
        account,
        transport: http(chain.rpcUrl),
    });

    const registerPayload = encodeRegisterPayload(
        agentURI,
        agentCardHash,
    );

    let txHash: string;
    try {
        txHash = await sendGatewayTransaction(
            walletClient,
            sourceClient,
            gatewayAddress,
            registerPayload,
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

    const confirmed = await pollForRegistration(
        canonicalAgentId,
        120_000,
    );

    console.log();
    if (confirmed) {
        console.log(chalk.green.bold("✅ TAP Universal Agent created!"));
        console.log();
        console.log(
            `\u{1F194} Universal Agent ID: ${chalk.bold.white(canonicalAgentId.toString())}`,
        );
        console.log(
            `\u{1F517} UEA Address: ${chalk.cyan(ueaAddress)}`,
        );
        console.log(
            `\u{1F4C4} Agent URI: ${chalk.cyan(agentURI)}`,
        );
        console.log();
        console.log(chalk.dim("\u{1F4A1} Next steps:"));
        console.log(
            chalk.dim(
                "   • Run `npx create-8004-agent bind` to link agents from other chains",
            ),
        );
        console.log(
            chalk.dim(
                `   • Run \`npx create-8004-agent profile ${canonicalAgentId}\` to view your full profile`,
            ),
        );
    } else {
        console.log(
            chalk.yellow(
                "⏳ TAP registration submitted but not yet confirmed.",
            ),
        );
        console.log(
            chalk.dim(
                "  The Push Chain TSS relay can take up to 2 minutes.",
            ),
        );
        console.log(
            chalk.dim(
                `  Your expected Universal Agent ID: ${canonicalAgentId}`,
            ),
        );
        console.log(chalk.dim(`  UEA Address: ${ueaAddress}`));
    }
    console.log();
}
