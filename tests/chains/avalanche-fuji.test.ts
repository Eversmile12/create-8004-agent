/**
 * Avalanche Fuji (Testnet) Test Suite
 *
 * ERC-8004 support on Avalanche announced February 7, 2026.
 */

import { createChainTestSuite } from '../utils/chain-test-factory.js';

createChainTestSuite({
    chainKey: 'avalanche-fuji',
    chainName: 'Avalanche Fuji',
    x402Supported: false,
    isTestnet: true,
});
