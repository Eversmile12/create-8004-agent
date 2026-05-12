import { TAP_CONSTANTS } from "../config.js";

/**
 * Generate the TAP registration code block that gets appended
 * to the generated register.ts for TAP-supported chains.
 */
export function generateTapRegistrationBlock(
    gatewayAddress: string,
    chainId: number,
    chainName: string,
): string {
    return `
  // ==========================================================================
  // TAP Universal Agent Registration (Push Chain)
  // ==========================================================================
  //
  // Creates a canonical identity on Push Chain via the Universal Gateway.
  // Your agent gets a Universal Agent ID that works across all chains.
  // No Push Chain tokens needed — uses the gateway on ${chainName}.

  const tapPrompt = await askYesNo(
    'Also create a TAP Universal Agent on Push Chain? (gives you a Universal Agent ID)',
  );

  if (tapPrompt) {
    console.log('');
    console.log('\\u{1F310} Creating TAP Universal Agent...');
    console.log('   This registers your agent on Push Chain via the Universal Gateway.');
    console.log('   You stay on ${chainName} \\u2014 no Push Chain tokens needed.');
    console.log('');

    try {
      const { createPublicClient, createWalletClient, http, encodeFunctionData, encodeAbiParameters, keccak256 } = await import('viem');
      const { privateKeyToAccount } = await import('viem/accounts');

      const TAP_GATEWAY = '${gatewayAddress}' as const;
      const TAP_AGENT_REGISTRY = '${TAP_CONSTANTS.AGENT_REGISTRY}' as const;
      const TAP_PUSH_CHAIN_RPC = '${TAP_CONSTANTS.PUSH_CHAIN_RPC}';
      const TAP_PUSH_CHAIN_ID = ${TAP_CONSTANTS.PUSH_CHAIN_ID};
      const TAP_UEA_FACTORY = '${TAP_CONSTANTS.UEA_FACTORY}' as const;
      const TAP_IPFS_GATEWAY = '${TAP_CONSTANTS.IPFS_GATEWAY}';

      // Set up viem clients for the source chain
      const tapAccount = privateKeyToAccount(privateKey as \`0x\${string}\`);
      const tapPublicClient = createPublicClient({
        transport: http(rpcUrl),
      });
      const tapWalletClient = createWalletClient({
        account: tapAccount,
        transport: http(rpcUrl),
      });

      // 1. Fetch the metadata from IPFS to get exact bytes for hashing
      const agentURI: string = result.agentURI;
      const ipfsCid = agentURI.replace('ipfs://', '');
      console.log('   Fetching metadata from IPFS for hashing...');
      const metadataRes = await fetch(\`\${TAP_IPFS_GATEWAY}\${ipfsCid}\`);
      if (!metadataRes.ok) {
        throw new Error(\`Failed to fetch metadata from IPFS: \${metadataRes.status}\`);
      }
      const metadataBytes = new Uint8Array(await metadataRes.arrayBuffer());
      const agentCardHash = keccak256(metadataBytes);

      // 2. Encode Layer 1: AgentRegistry.register(string, bytes32)
      const innerCalldata = encodeFunctionData({
        abi: [{
          name: 'register',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'agentURI', type: 'string' },
            { name: 'agentCardHash', type: 'bytes32' },
          ],
          outputs: [{ name: 'agentId', type: 'uint256' }],
        }],
        functionName: 'register',
        args: [agentURI, agentCardHash],
      });

      // 3. Encode Layer 2: UniversalPayload tuple
      const universalPayload = encodeAbiParameters(
        [{
          type: 'tuple',
          components: [
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'data', type: 'bytes' },
            { name: 'gasLimit', type: 'uint256' },
            { name: 'maxFeePerGas', type: 'uint256' },
            { name: 'maxPriorityFeePerGas', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
            { name: 'vType', type: 'uint8' },
          ],
        }],
        [{
          to: TAP_AGENT_REGISTRY,
          value: 0n,
          data: innerCalldata,
          gasLimit: ${TAP_CONSTANTS.GAS_LIMIT}n,
          maxFeePerGas: ${TAP_CONSTANTS.MAX_FEE_PER_GAS}n,
          maxPriorityFeePerGas: ${TAP_CONSTANTS.MAX_PRIORITY_FEE}n,
          nonce: ${TAP_CONSTANTS.NONCE}n,
          deadline: ${TAP_CONSTANTS.DEADLINE}n,
          vType: ${TAP_CONSTANTS.V_TYPE},
        }],
      );

      // 4. Query gateway fee (currently 0, but future-proof)
      let gatewayFee = 0n;
      try {
        gatewayFee = await tapPublicClient.readContract({
          address: TAP_GATEWAY,
          abi: [{
            name: 'INBOUND_FEE',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ name: '', type: 'uint256' }],
          }],
          functionName: 'INBOUND_FEE',
        });
      } catch {
        // Fee query failed — default to 0
      }

      // 5. Send Layer 3: sendUniversalTx to the gateway on ${chainName}
      console.log('   Sending gateway transaction...');
      const gatewayTxHash = await tapWalletClient.writeContract({
        address: TAP_GATEWAY,
        abi: [{
          name: 'sendUniversalTx',
          type: 'function',
          stateMutability: 'payable',
          inputs: [{
            name: 'req',
            type: 'tuple',
            components: [
              { name: 'recipient', type: 'address' },
              { name: 'token', type: 'address' },
              { name: 'amount', type: 'uint256' },
              { name: 'payload', type: 'bytes' },
              { name: 'revertRecipient', type: 'address' },
              { name: 'signatureData', type: 'bytes' },
            ],
          }],
          outputs: [],
        }],
        functionName: 'sendUniversalTx',
        args: [{
          recipient: '0x0000000000000000000000000000000000000000',
          token: '0x0000000000000000000000000000000000000000',
          amount: 0n,
          payload: universalPayload,
          revertRecipient: tapAccount.address,
          signatureData: '0x',
        }],
        value: gatewayFee,
        chain: null,
      });

      console.log(\`   Gateway tx submitted: \${gatewayTxHash}\`);
      console.log('   Waiting for Push Chain confirmation (~30 seconds)...');
      console.log('');

      // 6. Discover UEA address to compute canonical agentId
      const pushPublicClient = createPublicClient({
        transport: http(TAP_PUSH_CHAIN_RPC),
      });

      const [ueaAddress] = await pushPublicClient.readContract({
        address: TAP_UEA_FACTORY,
        abi: [{
          name: 'getUEAForOrigin',
          type: 'function',
          stateMutability: 'view',
          inputs: [{
            name: 'id',
            type: 'tuple',
            components: [
              { name: 'chainNamespace', type: 'string' },
              { name: 'chainId', type: 'string' },
              { name: 'owner', type: 'bytes' },
            ],
          }],
          outputs: [
            { name: 'uea', type: 'address' },
            { name: 'isDeployed', type: 'bool' },
          ],
        }],
        functionName: 'getUEAForOrigin',
        args: [{
          chainNamespace: 'eip155',
          chainId: '${chainId}',
          owner: tapAccount.address,
        }],
      });

      let canonicalAgentId = BigInt(ueaAddress) % 10_000_000n;
      if (canonicalAgentId === 0n) canonicalAgentId = 10_000_000n;

      // 7. Poll Push Chain for confirmation
      let confirmed = false;
      for (let i = 0; i < 24; i++) {
        await new Promise(r => setTimeout(r, 5000));
        try {
          const isReg = await pushPublicClient.readContract({
            address: TAP_AGENT_REGISTRY,
            abi: [{
              name: 'isRegistered',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'agentId', type: 'uint256' }],
              outputs: [{ name: '', type: 'bool' }],
            }],
            functionName: 'isRegistered',
            args: [canonicalAgentId],
          });
          if (isReg) {
            confirmed = true;
            break;
          }
        } catch {
          // Push Chain RPC may be slow — keep polling
        }
        process.stdout.write('.');
      }

      console.log('');
      if (confirmed) {
        console.log('');
        console.log('\\u2705 TAP Universal Agent created!');
        console.log('');
        console.log('\\u{1F194} Universal Agent ID:', canonicalAgentId.toString());
        console.log('\\u{1F517} UEA Address:', ueaAddress);
        console.log('');
        console.log('\\u{1F4A1} What this means:');
        console.log('   Your agent now has a canonical identity on Push Chain.');
        console.log('   You can bind agents from OTHER chains to this same identity,');
        console.log('   proving you own them all. No fragmented IDs across chains.');
      } else {
        console.log('');
        console.log('\\u23F3 TAP registration submitted but not yet confirmed.');
        console.log('   The Push Chain TSS relay can take up to 2 minutes.');
        console.log('   Your expected Universal Agent ID:', canonicalAgentId.toString());
        console.log('   UEA Address:', ueaAddress);
        console.log('');
        console.log('   The gateway tx was sent successfully. Your agent should');
        console.log('   appear on Push Chain shortly.');
      }
    } catch (tapError: any) {
      console.log('');
      console.log('\\u274C TAP registration failed:', tapError.message || tapError);
      console.log('   Your ERC-8004 agent is still registered on ${chainName}.');
      console.log('   You can retry TAP registration by running: npm run register');
    }
  }
`;
}

/**
 * Generate the askYesNo helper function used by the TAP prompt.
 * Uses Node.js built-in readline — no extra dependencies.
 */
export function generateAskYesNoHelper(): string {
    return `
import readline from 'readline';

function askYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(\`\${question} (Y/n): \`, answer => {
      rl.close();
      resolve(answer.toLowerCase() !== 'n');
    });
  });
}
`;
}
