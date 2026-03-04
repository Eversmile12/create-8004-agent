/**
 * SKALE Base Sepolia (Testnet) Test Suite
 * 
 * Includes x402 payment tests (x402 supported on SKALE Base Sepolia)
 */

import { createChainTestSuite } from '../utils/chain-test-factory.js';

createChainTestSuite({
    chainKey: 'skale-base-sepolia',
    chainName: 'SKALE Base Sepolia',
    x402Supported: true,
    isTestnet: true,
});
