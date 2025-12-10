#!/usr/bin/env node
import chalk from 'chalk';
import ora from 'ora';
import { runWizard, hasFeature } from './wizard.js';
import { generateProject } from './generator.js';
async function main() {
    console.log(chalk.bold.cyan('\n🤖 ERC-8004 Agent Generator\n'));
    console.log(chalk.gray('Create a trustless AI agent with A2A, MCP, and x402 support\n'));
    try {
        const answers = await runWizard();
        console.log('\n');
        const spinner = ora('Generating project files...').start();
        await generateProject(answers);
        spinner.succeed(chalk.green('ERC-8004 Agent generated successfully!'));
        // Print step-by-step guide
        const projectDir = answers.projectDir === '.' ? 'current directory' : answers.projectDir;
        let step = 1;
        console.log(chalk.bold.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.bold.cyan('  🚀 NEXT STEPS'));
        console.log(chalk.bold.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
        // Step 1: Navigate and install
        console.log(chalk.bold.white(`${step}. Install dependencies`));
        if (answers.projectDir !== '.') {
            console.log(chalk.gray(`   cd ${answers.projectDir}`));
        }
        console.log(chalk.gray('   npm install\n'));
        step++;
        // Step 2: Wallet info (if generated)
        if (answers.generatedPrivateKey) {
            console.log(chalk.bold.white(`${step}. Back up your wallet`));
            console.log(chalk.yellow('   ⚠️  A new wallet was generated and added to .env'));
            console.log(chalk.gray(`   Address: ${answers.agentWallet}`));
            console.log(chalk.gray('   → Back up your .env file!\n'));
            step++;
        }
        // Step 3: Configure .env
        console.log(chalk.bold.white(`${step}. Configure .env`));
        if (!answers.generatedPrivateKey) {
            console.log(chalk.gray('   - Add PRIVATE_KEY'));
        }
        console.log(chalk.gray('   - Add OPENAI_API_KEY'));
        if (answers.storageType === 'ipfs') {
            console.log(chalk.gray('   - Add PINATA_JWT (get one at pinata.cloud)'));
        }
        console.log('');
        step++;
        // Step 4: Fund wallet
        console.log(chalk.bold.white(`${step}. Fund your wallet with testnet ETH`));
        console.log(chalk.gray(`   → https://portal.cdp.coinbase.com/products/faucet\n`));
        step++;
        // Step 5: Start/deploy server BEFORE registering
        if (hasFeature(answers, 'a2a')) {
            console.log(chalk.bold.white(`${step}. Start & deploy your A2A server`));
            console.log(chalk.cyan('   npm run start:a2a'));
            console.log(chalk.gray('   → Test locally: http://localhost:3000/.well-known/agent-card.json'));
            console.log(chalk.gray('   → Deploy to Railway/Render/etc for public access\n'));
            step++;
            console.log(chalk.bold.white(`${step}. Update registration.json with your public URL`));
            console.log(chalk.gray('   Change the A2A endpoint from example.com to your real URL\n'));
            step++;
        }
        if (hasFeature(answers, 'mcp')) {
            console.log(chalk.bold.white(`${step}. Start your MCP server`));
            console.log(chalk.cyan('   npm run start:mcp\n'));
            step++;
        }
        // Register AFTER server is hosted
        console.log(chalk.bold.white(`${step}. Register your agent on-chain`));
        console.log(chalk.cyan('   npm run register\n'));
        step++;
        console.log(chalk.bold.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.gray('Learn more: https://eips.ethereum.org/EIPS/eip-8004'));
        console.log('');
    }
    catch (error) {
        console.error(chalk.red('\n❌ Error:'), error);
        process.exit(1);
    }
}
main();
