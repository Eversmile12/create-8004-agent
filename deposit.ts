import "dotenv/config";
import { Client, ConfigBuilder } from "@4mica/sdk";

async function ensureCollateral() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY is not set");
  }

  const cfg = new ConfigBuilder()
    .rpcUrl("https://ethereum.sepolia.api.4mica.xyz") // sepolia
    // .rpcUrl("https://api.4mica.xyz") // polygon amoy
    .walletPrivateKey(privateKey)
    .build();

  console.log("Starting 4mica collateral deposit...");
  console.log("RPC URL:", cfg.rpcUrl);
  console.log("Signer key prefix:", `${privateKey.slice(0, 6)}...${privateKey.slice(-4)}`);

  const client = await Client.new(cfg);
  console.log("Signer address:", client.signer.signer.address);
  console.log("Core params:", {
    chainId: client.params.chainId,
    contractAddress: client.params.contractAddress,
    ethereumHttpRpcUrl: client.params.ethereumHttpRpcUrl,
  });

  // Use the same asset as in paymentRequirements.asset
  const usdc = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // Sepolia USDC
  // const usdc = "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582"; // Amoy USDC

  // 1 USDC (6 decimals)
  const amount = "1000000";

  console.log("Checking existing collateral...");
  const before = await client.user.getUser();
  console.log("Current assets:", before);

  console.log("Approving USDC:", { usdc, amount });
  const approveReceipt = await client.user.approveErc20(usdc, amount);
  console.log("Approve tx:", approveReceipt.transactionHash, "status:", approveReceipt.status);

  console.log("Depositing USDC:", { usdc, amount });
  const depositReceipt = await client.user.deposit(amount, usdc);
  console.log("Deposit tx:", depositReceipt.transactionHash, "status:", depositReceipt.status);

  const after = await client.user.getUser();
  console.log("Updated assets:", after);

  await client.aclose();
  console.log("Done.");
}

ensureCollateral().catch((err) => {
  console.error("Deposit failed:", err);
  process.exit(1);
});
