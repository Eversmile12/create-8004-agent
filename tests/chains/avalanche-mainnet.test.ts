/**
 * Avalanche C-Chain (Mainnet) Test Suite
 *
 * ERC-8004 support announced February 7, 2026.
 */

import { createChainTestSuite } from '../utils/chain-test-factory.js';

createChainTestSuite({
    chainKey: 'avalanche-mainnet',
    chainName: 'Avalanche C-Chain',
    x402Supported: false,
    isTestnet: false,
});
