/**
 * SKALE Base (Mainnet) Test Suite
 * 
 * Includes x402 payment tests (x402 supported on SKALE Base)
 */

import { createChainTestSuite } from '../utils/chain-test-factory.js';

createChainTestSuite({
    chainKey: 'skale-base-mainnet',
    chainName: 'SKALE Base',
    x402Supported: true,
    isTestnet: false,
});
