import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { CHAINS, TRUST_MODELS } from "./config.js";
import { isSolanaChain } from "./config-solana.js";
function getAvailableDir(baseDir) {
    if (baseDir === ".")
        return baseDir;
    const fullPath = path.resolve(process.cwd(), baseDir);
    if (!fs.existsSync(fullPath))
        return baseDir;
    // Directory exists, find available name with suffix
    let index = 1;
    let newDir = `${baseDir}-${index}`;
    while (fs.existsSync(path.resolve(process.cwd(), newDir))) {
        index++;
        newDir = `${baseDir}-${index}`;
    }
    return newDir;
}
// Re-export for convenience
export { isSolanaChain } from "./config-solana.js";
// Helper getters for cleaner access
export const hasFeature = (answers, feature) => answers.features.includes(feature);
function getX402Providers(chainKey) {
    if (!chainKey || isSolanaChain(chainKey))
        return [];
    const chainConfig = CHAINS[chainKey];
    return chainConfig.x402Providers ?? [];
}
function getDefaultX402Provider(chainKey) {
    if (!chainKey || isSolanaChain(chainKey))
        return undefined;
    const chainConfig = CHAINS[chainKey];
    return chainConfig.x402DefaultProvider ?? chainConfig.x402Providers?.[0];
}
export async function runWizard() {
    console.log("\n");
    const answers = await inquirer.prompt([
        {
            type: "input",
            name: "projectDir",
            message: "Project directory (or . for current):",
            default: "my-agent",
        },
        {
            type: "input",
            name: "agentName",
            message: "Agent name:",
            default: "my agent",
        },
        {
            type: "input",
            name: "agentDescription",
            message: "Agent description:",
            default: "test agent created with create-8004-agent",
        },
        {
            type: "input",
            name: "agentImage",
            message: "Agent image URL:",
            default: "https://example.com/agent.png",
        },
        {
            type: "list",
            name: "chain",
            message: "Blockchain network:",
            choices: [
                new inquirer.Separator("── Mainnets ──"),
                ...Object.entries(CHAINS)
                    .filter(([_, chain]) => !chain.name.includes("Testnet"))
                    .map(([key, chain]) => {
                    const displayName = chain.name.replace(" Mainnet", "");
                    return {
                        name: chain.x402Supported ? `${displayName} (x402 supported)` : displayName,
                        value: key,
                    };
                }),
                new inquirer.Separator("── Testnets ──"),
                ...Object.entries(CHAINS)
                    .filter(([_, chain]) => chain.name.includes("Testnet"))
                    .map(([key, chain]) => {
                    const displayName = chain.name.replace(" (Testnet)", "");
                    return {
                        name: chain.x402Supported ? `${displayName} (x402 supported)` : displayName,
                        value: key,
                    };
                }),
            ],
        },
        {
            type: "input",
            name: "agentWallet",
            message: "Agent wallet address (leave empty to generate new):",
            validate: (input, answers) => {
                if (input === "")
                    return true;
                // Validate based on selected chain
                if (answers?.chain && isSolanaChain(answers.chain)) {
                    // Solana address validation (base58, 32-44 chars)
                    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input) || "Enter a valid Solana address or leave empty";
                }
                // EVM address validation
                return /^0x[a-fA-F0-9]{40}$/.test(input) || "Enter a valid Ethereum address or leave empty";
            },
        },
        {
            type: "checkbox",
            name: "features",
            message: "Select features to include:",
            choices: (ans) => {
                // Check if selected chain supports x402
                const selectedChain = ans.chain;
                const chainConfig = selectedChain && !isSolanaChain(selectedChain)
                    ? CHAINS[selectedChain]
                    : null;
                const x402Supported = chainConfig?.x402Supported ?? false;
                return [
                    { name: "A2A Server (agent-to-agent communication)", value: "a2a", checked: true },
                    { name: "MCP Server (Model Context Protocol tools)", value: "mcp", checked: false },
                    x402Supported
                        ? { name: "x402 Payments (USDC micropayments)", value: "x402", checked: false }
                        : { name: "x402 Payments", value: "x402", disabled: "Not available on selected chain" },
                ];
            },
        },
        {
            type: "list",
            name: "x402Provider",
            message: "x402 provider:",
            choices: (ans) => {
                const providers = getX402Providers(ans.chain);
                return providers.map((provider) => {
                    if (provider === "4mica") {
                        return {
                            name: "4mica (credit, Ethereum Sepolia / Polygon Amoy)",
                            value: "4mica",
                        };
                    }
                    return {
                        name: "PayAI (exact, Base / Polygon)",
                        value: "payai",
                    };
                });
            },
            when: (ans) => {
                const providers = getX402Providers(ans.chain);
                return (ans.features?.includes("x402") ?? false) && providers.length > 1;
            },
        },
        {
            type: "confirm",
            name: "a2aStreaming",
            message: "Enable A2A streaming responses? (SSE):",
            default: false,
            when: (ans) => ans.features?.includes("a2a") ?? false,
        },
        {
            type: "checkbox",
            name: "trustModels",
            message: "Supported trust models:",
            choices: TRUST_MODELS.map((model) => ({ name: model, value: model, checked: model === "reputation" })),
        },
    ]);
    // Check if directory exists and get available name
    let projectDir = answers.projectDir;
    const availableDir = getAvailableDir(projectDir);
    if (availableDir !== projectDir) {
        console.log(`\n📁 Directory "${projectDir}" exists, using "${availableDir}" instead`);
        projectDir = availableDir;
    }
    // Generate wallet if not provided
    let agentWallet = answers.agentWallet;
    let generatedPrivateKey;
    if (!agentWallet) {
        if (isSolanaChain(answers.chain)) {
            // Generate Solana keypair
            const keypair = Keypair.generate();
            generatedPrivateKey = bs58.encode(keypair.secretKey);
            agentWallet = keypair.publicKey.toBase58();
            console.log("\n🔑 Generated new Solana wallet:", agentWallet);
        }
        else {
            // Generate EVM wallet
            const privateKey = generatePrivateKey();
            generatedPrivateKey = privateKey;
            const account = privateKeyToAccount(privateKey);
            agentWallet = account.address;
            console.log("\n🔑 Generated new wallet:", agentWallet);
        }
    }
    let x402Provider = answers.x402Provider;
    if (answers.features.includes("x402")) {
        if (!x402Provider) {
            x402Provider = getDefaultX402Provider(answers.chain);
        }
    }
    return {
        ...answers,
        projectDir,
        agentWallet,
        generatedPrivateKey,
        x402Provider,
        // Default to false if A2A not selected (question was skipped)
        a2aStreaming: answers.a2aStreaming ?? false,
    };
}
