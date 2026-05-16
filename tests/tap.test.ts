/**
 * TAP (Trustless Agents Plus) Integration Tests
 *
 * Tests TAP config helpers and template generation for
 * supported and unsupported chains.
 */

import { describe, it, expect } from 'vitest';
import {
    isTapSupported,
    getTapGateway,
    TAP_GATEWAYS,
    TAP_CONSTANTS,
} from '../dist/config.js';
import {
    generateTestAgent,
    readGeneratedFile,
    fileExists,
} from './utils/test-helpers.js';

// ================================================================
// Config Helpers
// ================================================================

describe('TAP Config', () => {
    it('should support eth-sepolia', () => {
        expect(isTapSupported('eth-sepolia')).toBe(true);
    });

    it('should support base-sepolia', () => {
        expect(isTapSupported('base-sepolia')).toBe(true);
    });

    it('should not support polygon-amoy', () => {
        expect(isTapSupported('polygon-amoy')).toBe(false);
    });

    it('should not support eth-mainnet', () => {
        expect(isTapSupported('eth-mainnet')).toBe(false);
    });

    it('should not support monad-testnet', () => {
        expect(isTapSupported('monad-testnet')).toBe(false);
    });

    it('should return gateway address for eth-sepolia', () => {
        const gw = getTapGateway('eth-sepolia');
        expect(gw).toBe('0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A');
    });

    it('should return gateway address for base-sepolia', () => {
        const gw = getTapGateway('base-sepolia');
        expect(gw).toBe('0xFD4fef1F43aFEc8b5bcdEEc47f35a1431479aC16');
    });

    it('should return null for unsupported chain', () => {
        expect(getTapGateway('polygon-amoy')).toBeNull();
        expect(getTapGateway('base-mainnet')).toBeNull();
    });

    it('should have correct Push Chain constants', () => {
        expect(TAP_CONSTANTS.PUSH_CHAIN_ID).toBe(42101);
        expect(TAP_CONSTANTS.AGENT_REGISTRY).toBe(
            '0x13499d36729467bd5C6B44725a10a0113cE47178',
        );
        expect(TAP_CONSTANTS.UEA_FACTORY).toBe(
            '0x00000000000000000000000000000000000000eA',
        );
    });
});

// ================================================================
// Template Generation — TAP-Supported Chains
// ================================================================

describe('TAP Template Generation (Supported Chains)', () => {
    describe('eth-sepolia', () => {
        let projectDir: string;
        let registerCode: string;

        it('should generate project with TAP code', async () => {
            projectDir = await generateTestAgent({
                chain: 'eth-sepolia',
                features: ['a2a'],
                projectName: 'tap-eth-sepolia',
            });
            expect(await fileExists(projectDir, 'src/register.ts')).toBe(true);
            registerCode = await readGeneratedFile(
                projectDir,
                'src/register.ts',
            );
        });

        it('should contain TAP registration section', () => {
            expect(registerCode).toContain(
                'TAP Universal Agent Registration',
            );
        });

        it('should have correct gateway address', () => {
            expect(registerCode).toContain(
                '0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A',
            );
        });

        it('should import readline for prompt', () => {
            expect(registerCode).toContain("import readline from 'readline'");
        });

        it('should contain sendUniversalTx encoding', () => {
            expect(registerCode).toContain('sendUniversalTx');
        });

        it('should contain 3-layer encoding', () => {
            expect(registerCode).toContain('encodeFunctionData');
            expect(registerCode).toContain('encodeAbiParameters');
        });

        it('should contain Push Chain RPC URL', () => {
            expect(registerCode).toContain(TAP_CONSTANTS.PUSH_CHAIN_RPC);
        });

        it('should contain UEA discovery call', () => {
            expect(registerCode).toContain('getUEAForOrigin');
        });

        it('should contain INBOUND_FEE query', () => {
            expect(registerCode).toContain('INBOUND_FEE');
        });

        it('should contain polling loop for confirmation', () => {
            expect(registerCode).toContain('isRegistered');
            expect(registerCode).toContain('for (let i = 0; i < 24; i++)');
        });

        it('should contain canonical agentId computation', () => {
            expect(registerCode).toContain('% 10_000_000n');
        });

        it('should contain IPFS fetch for agentCardHash', () => {
            expect(registerCode).toContain(TAP_CONSTANTS.IPFS_GATEWAY);
            expect(registerCode).toContain('keccak256');
        });

        it('should contain correct chainId for UEA lookup', () => {
            expect(registerCode).toContain("chainId: '11155111'");
        });

        it('should have viem in package.json', async () => {
            const pkg = JSON.parse(
                await readGeneratedFile(projectDir, 'package.json'),
            );
            expect(pkg.dependencies.viem).toBeDefined();
        });

        it('should have TAP section in README', async () => {
            const readme = await readGeneratedFile(projectDir, 'README.md');
            expect(readme).toContain('TAP Universal Agent');
            expect(readme).toContain('Push Chain');
            expect(readme).toContain('Universal Agent ID');
        });
    });

    describe('base-sepolia', () => {
        let projectDir: string;
        let registerCode: string;

        it('should generate project with TAP code', async () => {
            projectDir = await generateTestAgent({
                chain: 'base-sepolia',
                features: ['a2a'],
                projectName: 'tap-base-sepolia',
            });
            registerCode = await readGeneratedFile(
                projectDir,
                'src/register.ts',
            );
        });

        it('should have correct Base Sepolia gateway address', () => {
            expect(registerCode).toContain(
                '0xFD4fef1F43aFEc8b5bcdEEc47f35a1431479aC16',
            );
        });

        it('should contain correct chainId for UEA lookup', () => {
            expect(registerCode).toContain("chainId: '84532'");
        });

        it('should contain TAP registration section', () => {
            expect(registerCode).toContain(
                'TAP Universal Agent Registration',
            );
        });
    });
});

// ================================================================
// Template Generation — Non-TAP Chains
// ================================================================

describe('TAP Template Generation (Unsupported Chains)', () => {
    it('should NOT include TAP code for polygon-amoy', async () => {
        const projectDir = await generateTestAgent({
            chain: 'polygon-amoy',
            features: ['a2a'],
            projectName: 'tap-polygon-amoy',
        });
        const registerCode = await readGeneratedFile(
            projectDir,
            'src/register.ts',
        );
        expect(registerCode).not.toContain(
            'TAP Universal Agent Registration',
        );
        expect(registerCode).not.toContain('sendUniversalTx');
        expect(registerCode).not.toContain("import readline");
    });

    it('should NOT include TAP code for eth-mainnet', async () => {
        const projectDir = await generateTestAgent({
            chain: 'eth-mainnet',
            features: ['a2a'],
            projectName: 'tap-eth-mainnet',
        });
        const registerCode = await readGeneratedFile(
            projectDir,
            'src/register.ts',
        );
        expect(registerCode).not.toContain(
            'TAP Universal Agent Registration',
        );
    });

    it('should NOT have viem in package.json for non-TAP chains', async () => {
        const projectDir = await generateTestAgent({
            chain: 'polygon-amoy',
            features: ['a2a'],
            projectName: 'tap-no-viem',
        });
        const pkg = JSON.parse(
            await readGeneratedFile(projectDir, 'package.json'),
        );
        expect(pkg.dependencies.viem).toBeUndefined();
    });

    it('should NOT have TAP section in README for non-TAP chains', async () => {
        const projectDir = await generateTestAgent({
            chain: 'polygon-amoy',
            features: ['a2a'],
            projectName: 'tap-no-readme',
        });
        const readme = await readGeneratedFile(projectDir, 'README.md');
        expect(readme).not.toContain('TAP Universal Agent');
    });
});
