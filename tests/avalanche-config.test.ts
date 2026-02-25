/**
 * Avalanche configuration sanity checks
 *
 * Verifies Avalanche C-Chain and Fuji testnet are correctly configured
 * (ERC-8004 support announced February 7, 2026).
 */

import { describe, it, expect } from 'vitest';
import { CHAINS } from '../src/config.js';

describe('Avalanche Configuration', () => {
    it('should have Avalanche mainnet configuration', () => {
        expect(CHAINS['avalanche-mainnet']).toBeDefined();
        expect(CHAINS['avalanche-mainnet'].chainId).toBe(43114);
        expect(CHAINS['avalanche-mainnet'].name).toContain('Avalanche');
        expect(CHAINS['avalanche-mainnet'].scanPath).toBe('avalanche');
    });

    it('should have Fuji testnet configuration', () => {
        expect(CHAINS['avalanche-fuji']).toBeDefined();
        expect(CHAINS['avalanche-fuji'].chainId).toBe(43113);
        expect(CHAINS['avalanche-fuji'].name).toContain('Fuji');
        expect(CHAINS['avalanche-fuji'].scanPath).toBe('avalanche-fuji');
    });

    it('should have USDC addresses for both networks', () => {
        expect(CHAINS['avalanche-mainnet'].usdcAddress).toBeTruthy();
        expect(CHAINS['avalanche-fuji'].usdcAddress).toBeTruthy();
    });

    it('should have correct RPC URLs', () => {
        expect(CHAINS['avalanche-mainnet'].rpcUrl).toContain('avax.network');
        expect(CHAINS['avalanche-fuji'].rpcUrl).toContain('avax-test.network');
    });
});
