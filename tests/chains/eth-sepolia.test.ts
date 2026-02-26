/**
 * Ethereum Sepolia (Testnet) Test Suite
 */

import { createChainTestSuite } from '../utils/chain-test-factory.js';

createChainTestSuite({
    chainKey: 'eth-sepolia',
    chainName: 'Ethereum Sepolia',
    x402Supported: true,
    x402Provider: '4mica',
    isTestnet: true,
});
