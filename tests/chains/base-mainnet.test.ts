/**
 * Base Mainnet Test Suite
 * 
 * Includes x402 payment tests (x402 supported on Base)
 */

import { createChainTestSuite } from '../utils/chain-test-factory.js';

createChainTestSuite({
    chainKey: 'base-mainnet',
    chainName: 'Base Mainnet',
    x402Supported: true,
    x402Provider: 'payai',
});
