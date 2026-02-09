/**
 * Quick test script to generate a Monad agent (custom template, no SDK)
 */
import { generateProject } from "./src/generator.js";
import type { WizardAnswers } from "./src/wizard.js";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

async function main() {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  const answers: WizardAnswers = {
    projectDir: "monad-demo",
    agentName: "Monad Demo Agent",
    agentDescription: "Demo agent for Monad testnet - direct contract calls",
    agentImage: "https://i.imgur.com/JQxM4nO.png",
    features: ["a2a", "mcp"],
    a2aStreaming: false,
    chain: "monad-testnet",
    trustModels: ["reputation"],
    agentWallet: account.address,
    generatedPrivateKey: privateKey,
  };

  console.log("🔧 Generating Monad agent (custom template, no SDK)...");
  console.log(`   Name: ${answers.agentName}`);
  console.log(`   Chain: Monad Testnet`);
  console.log(`   Features: A2A, MCP`);
  console.log(`   Wallet: ${answers.agentWallet}`);
  console.log("");

  await generateProject(answers);

  console.log("✅ Project generated in ./monad-demo");
  console.log("");
  console.log("🚀 This uses DIRECT CONTRACT CALLS (no agent0-sdk)");
  console.log("");
  console.log("Next steps:");
  console.log("  1. cd monad-demo");
  console.log("  2. npm install");
  console.log("  3. Fund wallet with MON: https://faucet.monad.xyz/");
  console.log("  4. npm run register");
}

main().catch(console.error);
