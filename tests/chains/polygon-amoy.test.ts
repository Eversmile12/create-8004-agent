/**
 * Polygon Amoy (Testnet) Test Suite
 */

import { createChainTestSuite } from '../utils/chain-test-factory.js';

createChainTestSuite({
    chainKey: 'polygon-amoy',
    chainName: 'Polygon Amoy',
    x402Supported: true,
    x402Provider: 'payai',
    isTestnet: true,
});
