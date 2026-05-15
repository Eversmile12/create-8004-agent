#!/usr/bin/env node
import chalk from "chalk";
import ora from "ora";
import { execSync } from "child_process";
import { runWizard, hasFeature, isSolanaChain } from "./wizard.js";
import { generateProject } from "./generator.js";
import { maybeRegisterWithFourmica } from "./fourmica.js";
import { isTapSupported } from "./config.js";

function printHelp(): void {
    console.log(chalk.bold.cyan("\n\u{1F916} 8004 Agent Generator\n"));
    console.log("Usage: create-8004-agent [command]\n");
    console.log("Commands:");
    console.log(
        "  " +
            chalk.white("(default)") +
            "    Scaffold a new ERC-8004 agent project",
    );
    console.log(
        "  " +
            chalk.white("register") +
            "     Register an existing agent on Push Chain (TAP)",
    );
    console.log(
        "  " +
            chalk.white("bind") +
            "         Bind a source-chain agent to your TAP identity",
    );
    console.log(
        "  " +
            chalk.white("profile") +
            "      View an agent's full profile (identity, reputation, bindings)",
    );
    console.log("\nOptions:");
    console.log(
        "  " +
            chalk.white("--help, -h") +
            "   Show this help message",
    );
    console.log();
}

async function runScaffoldWizard(): Promise<void> {
    console.log(chalk.bold.cyan("\n\u{1F916} 8004 Agent Generator\n"));
    console.log(chalk.gray("Create a trustless AI agent with A2A, MCP, and x402 support\n"));
    console.log(chalk.gray("Supports EVM chains (Base, Ethereum, Polygon, Linea) and Solana\n"));

    const answers = await runWizard();

    console.log("\n");
    const spinner = ora("Generating project files...").start();

    await generateProject(answers);

    const isSolana = isSolanaChain(answers.chain);
    spinner.succeed(chalk.green(`${isSolana ? "8004" : "ERC-8004"} Agent generated successfully!`));

    const installDir = answers.projectDir === "." ? process.cwd() : answers.projectDir;
    const installSpinner = ora("Installing dependencies...").start();
    try {
        execSync("npm install", {
            cwd: installDir,
            stdio: "pipe",
        });
        installSpinner.succeed(chalk.green("Dependencies installed successfully!"));
    } catch {
        installSpinner.fail(chalk.yellow("Failed to install dependencies. Run 'npm install' manually."));
    }

    await maybeRegisterWithFourmica(answers);

    let step = 1;

    console.log(chalk.bold.cyan("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
    console.log(chalk.bold.cyan("  \u{1F680} NEXT STEPS"));
    console.log(chalk.bold.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));

    if (answers.projectDir !== ".") {
        console.log(chalk.bold.white(`${step}. Navigate to your project`));
        console.log(chalk.gray(`   cd ${answers.projectDir}\n`));
        step++;
    }

    if (answers.generatedPrivateKey) {
        console.log(chalk.bold.white(`${step}. Back up your wallet`));
        console.log(chalk.yellow("   ⚠️  A new wallet was generated and added to .env"));
        console.log(chalk.gray(`   Address: ${answers.agentWallet}`));
        console.log(chalk.gray("   → Back up your .env file!\n"));
        step++;
    }

    console.log(chalk.bold.white(`${step}. Configure .env`));
    if (!answers.generatedPrivateKey) {
        console.log(chalk.gray(`   - Add ${isSolana ? "SOLANA_PRIVATE_KEY" : "PRIVATE_KEY"}`));
    }
    console.log(chalk.gray("   - Add OPENAI_API_KEY"));
    console.log(chalk.gray("   - Add PINATA_JWT (get one at pinata.cloud)"));
    console.log("");
    step++;

    if (isSolana) {
        console.log(chalk.bold.white(`${step}. Fund your wallet with devnet SOL`));
        console.log(chalk.gray("   → https://faucet.solana.com/\n"));
    } else {
        console.log(chalk.bold.white(`${step}. Fund your wallet with testnet ETH`));
        console.log(chalk.gray("   → https://cloud.google.com/application/web3/faucet/ethereum/sepolia\n"));
    }
    step++;

    if (hasFeature(answers, "a2a")) {
        console.log(chalk.bold.white(`${step}. Start & deploy your A2A server`));
        console.log(chalk.cyan("   npm run start:a2a"));
        console.log(chalk.gray("   → Test locally: http://localhost:3000/.well-known/agent-card.json"));
        console.log(chalk.gray("   → Deploy to Railway/Render/etc for public access\n"));
        step++;

        console.log(chalk.bold.white(`${step}. Update registration.json with your public URL`));
        console.log(chalk.gray("   Change the A2A endpoint from example.com to your real URL\n"));
        step++;
    }

    if (hasFeature(answers, "mcp")) {
        console.log(chalk.bold.white(`${step}. Start your MCP server`));
        console.log(chalk.cyan("   npm run start:mcp\n"));
        step++;
    }

    console.log(chalk.bold.white(`${step}. Register your agent on-chain`));
    console.log(chalk.cyan("   npm run register"));
    if (isTapSupported(answers.chain)) {
        console.log(chalk.gray("   → You'll also be prompted to create a TAP Universal Agent on Push Chain"));
    }
    console.log("");
    step++;

    if (isTapSupported(answers.chain)) {
        console.log(chalk.bold.white(`${step}. Create Universal Agent ID with TAP`));
        console.log(chalk.cyan("   npx create-8004-agent register"));
        console.log(chalk.gray("   → Registers your agent on Push Chain via the Universal Gateway"));
        console.log(chalk.gray("   → Gives you a single identity that works across all chains"));
        console.log("");

        console.log(chalk.bold.white(`   ${step}a. Bind your multi-chain agents with TAP`));
        console.log(chalk.cyan("       npx create-8004-agent bind"));
        console.log(chalk.gray("       → Link agents from other chains to your TAP identity"));
        console.log("");

        console.log(chalk.bold.white(`   ${step}b. Query full agent profile with TAP`));
        console.log(chalk.cyan("       npx create-8004-agent profile"));
        console.log(chalk.gray("       → View identity, bindings, and reputation across all chains"));
        console.log("");
        step++;
    }

    console.log(chalk.bold.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
    if (isSolana) {
        console.log(chalk.gray("Learn more: https://8004.org"));
    } else {
        console.log(chalk.gray("Learn more: https://eips.ethereum.org/EIPS/eip-8004"));
    }
    console.log("");
}

async function main(): Promise<void> {
    const command = process.argv[2];

    try {
        switch (command) {
            case "register": {
                const { runRegisterCommand } = await import(
                    "./commands/register.js"
                );
                await runRegisterCommand();
                break;
            }
            case "bind": {
                const { runBindCommand } = await import(
                    "./commands/bind.js"
                );
                await runBindCommand();
                break;
            }
            case "profile": {
                const { runProfileCommand } = await import(
                    "./commands/profile.js"
                );
                await runProfileCommand();
                break;
            }
            case "--help":
            case "-h":
                printHelp();
                break;
            default:
                await runScaffoldWizard();
                break;
        }
    } catch (error) {
        console.error(chalk.red("\n❌ Error:"), error);
        process.exit(1);
    }
}

main();
