import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { CHAINS, TRUST_MODELS } from './config.js';
function getAvailableDir(baseDir) {
    if (baseDir === '.')
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
// Helper getters for cleaner access
export const hasFeature = (answers, feature) => answers.features.includes(feature);
export async function runWizard() {
    console.log('\n');
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'projectDir',
            message: 'Project directory (or . for current):',
            default: 'my-agent',
        },
        {
            type: 'input',
            name: 'agentName',
            message: 'Agent name:',
            validate: (input) => input.length > 0 || 'Agent name is required',
        },
        {
            type: 'input',
            name: 'agentDescription',
            message: 'Agent description:',
            validate: (input) => input.length > 0 || 'Description is required',
        },
        {
            type: 'input',
            name: 'agentImage',
            message: 'Agent image URL:',
            default: 'https://example.com/agent.png',
        },
        {
            type: 'input',
            name: 'agentWallet',
            message: 'Agent wallet address (leave empty to generate new):',
            validate: (input) => input === '' || /^0x[a-fA-F0-9]{40}$/.test(input) || 'Enter a valid Ethereum address or leave empty',
        },
        {
            type: 'checkbox',
            name: 'features',
            message: 'Select features to include:',
            choices: [
                { name: 'A2A Server (agent-to-agent communication)', value: 'a2a', checked: true },
                { name: 'x402 Payments (Coinbase, USDC)', value: 'x402', checked: true },
                { name: 'MCP Server (Model Context Protocol tools)', value: 'mcp', checked: false },
            ],
        },
        {
            type: 'list',
            name: 'storageType',
            message: 'Registration metadata storage:',
            choices: [
                { name: 'IPFS (Pinata) - Recommended', value: 'ipfs' },
                { name: 'Base64 (on-chain, higher gas)', value: 'base64' },
            ],
        },
        {
            type: 'list',
            name: 'chain',
            message: 'Blockchain network:',
            choices: Object.entries(CHAINS).map(([key, chain]) => ({
                name: chain.name,
                value: key,
            })),
        },
        {
            type: 'checkbox',
            name: 'trustModels',
            message: 'Supported trust models:',
            choices: TRUST_MODELS.map((model) => ({ name: model, value: model, checked: true })),
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
        const privateKey = generatePrivateKey();
        generatedPrivateKey = privateKey;
        const account = privateKeyToAccount(privateKey);
        agentWallet = account.address;
        console.log('\n🔑 Generated new wallet:', agentWallet);
    }
    return {
        ...answers,
        projectDir,
        agentWallet,
        generatedPrivateKey,
    };
}
