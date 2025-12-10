import { generateProject } from './src/generator.js';
import type { WizardAnswers } from './src/wizard.js';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

const testAnswers: WizardAnswers = {
  projectDir: 'test-agent',
  agentName: 'Test Agent',
  agentDescription: 'A test AI agent for ERC-8004',
  agentImage: 'https://example.com/agent.png',
  features: ['a2a', 'x402'],
  storageType: 'base64',  // Using base64 instead of IPFS
  chain: 'base-sepolia',
  trustModels: ['reputation', 'crypto-economic'],
  agentWallet: account.address,
  generatedPrivateKey: privateKey,
};

async function main() {
  console.log('🧪 Generating test agent...');
  console.log('   Wallet:', account.address);
  console.log('   Chain: Base Sepolia');
  console.log('   Storage: Base64');
  await generateProject(testAnswers);
  console.log('✅ Done - check test-agent folder');
}

main().catch(console.error);

