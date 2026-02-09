/**
 * Polygon Mainnet Test Suite
 */

import { createChainTestSuite } from '../utils/chain-test-factory.js';

createChainTestSuite({
    chainKey: 'polygon-mainnet',
    chainName: 'Polygon Mainnet',
    x402Supported: true,
    x402Provider: 'payai',
});
