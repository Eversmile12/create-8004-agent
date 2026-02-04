/**
 * Chain Test Factory
 * 
 * Creates standardized test suites for each chain
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import type { Hex } from 'viem';
import {
    generateTestAgent,
    installDependencies,
    enableMockMode,
    createTestEnv,
    ServerProcess,
    A2ATestClient,
    testMCPServer,
    getTestBaseUrl,
    validateRegistrationFile,
    readGeneratedFile,
    fileExists,
    getNextPort,
    cleanupTestOutput,
} from './test-helpers.js';
import type { ChainKey } from '../../dist/config.js';

export interface ChainTestConfig {
    chainKey: ChainKey;
    chainName: string;
    x402Supported: boolean;
    x402Provider?: 'payai' | '4mica';
    isTestnet?: boolean; // For informational purposes
}

/**
 * Create a complete test suite for a chain
 */
export function createChainTestSuite(config: ChainTestConfig) {
    describe(`${config.chainName} Chain Tests`, () => {
        // ================================================================
        // A2A WITHOUT STREAMING
        // ================================================================
        describe('A2A Server (No Streaming)', () => {
            let projectDir: string;
            let server: ServerProcess;
            let client: A2ATestClient;
            let port: number;

            beforeAll(async () => {
                port = getNextPort();
                projectDir = await generateTestAgent({
                    chain: config.chainKey,
                    features: ['a2a'],
                    a2aStreaming: false,
                    projectName: `${config.chainKey}-a2a-no-stream`,
                });
                
                await installDependencies(projectDir);
                await enableMockMode(projectDir);
                await createTestEnv(projectDir, port);
                
                server = new ServerProcess(projectDir, 'a2a-server.ts', port);
                await server.start();
                
                client = new A2ATestClient(getTestBaseUrl(port));
            }, 120000);

            afterAll(async () => {
                await server?.stop();
            });

            it('should generate all required files', async () => {
                expect(await fileExists(projectDir, 'src/a2a-server.ts')).toBe(true);
                expect(await fileExists(projectDir, 'src/agent.ts')).toBe(true);
                expect(await fileExists(projectDir, '.well-known/agent-card.json')).toBe(true);
                expect(await fileExists(projectDir, 'package.json')).toBe(true);
                expect(await fileExists(projectDir, 'README.md')).toBe(true);
            });

            it('should return valid agent card', async () => {
                const card = await client.getAgentCard();
                expect(card.name).toBeDefined();
                expect(card.description).toBeDefined();
                expect(card.url).toBeDefined();
                expect(card.capabilities).toBeDefined();
                expect(card.capabilities.streaming).toBe(false);
            });

            it('should handle message/send', async () => {
                const response = await client.sendMessage('Hello, test!');
                expect(response.jsonrpc).toBe('2.0');
                expect(response.result).toBeDefined();
                expect(response.result.status).toBe('completed');
                expect(response.result.messages).toHaveLength(2);
                expect(response.result.messages[1].role).toBe('agent');
            });

            it('should maintain conversation context', async () => {
                const contextId = 'test-context-123';
                
                const first = await client.sendMessage('My name is Alice', contextId);
                expect(first.result.contextId).toBe(contextId);
                
                const second = await client.sendMessage('What is my name?', contextId);
                expect(second.result.contextId).toBe(contextId);
            });

            it('should handle tasks/get', async () => {
                const sendResponse = await client.sendMessage('Test message');
                const taskId = sendResponse.result.id;
                
                const getResponse = await client.getTask(taskId);
                expect(getResponse.result.id).toBe(taskId);
                expect(getResponse.result.status).toBe('completed');
            });

            it('should handle tasks/cancel', async () => {
                const sendResponse = await client.sendMessage('Test message');
                const taskId = sendResponse.result.id;
                
                const cancelResponse = await client.cancelTask(taskId);
                expect(cancelResponse.result.status).toBe('canceled');
            });

            it('should return error for invalid JSON-RPC version', async () => {
                const response = await fetch(`${getTestBaseUrl(port)}/a2a`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '1.0',
                        method: 'message/send',
                        params: {},
                        id: 1,
                    }),
                });
                const data = await response.json();
                expect(data.error).toBeDefined();
                expect(data.error.message).toContain('Invalid Request');
            });

            it('should return error for unknown method', async () => {
                const response = await fetch(`${getTestBaseUrl(port)}/a2a`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'unknown/method',
                        params: {},
                        id: 1,
                    }),
                });
                const data = await response.json();
                expect(data.error).toBeDefined();
            });
        });

        // ================================================================
        // A2A WITH STREAMING
        // ================================================================
        describe('A2A Server (With Streaming)', () => {
            let projectDir: string;
            let server: ServerProcess;
            let client: A2ATestClient;
            let port: number;

            beforeAll(async () => {
                port = getNextPort();
                projectDir = await generateTestAgent({
                    chain: config.chainKey,
                    features: ['a2a'],
                    a2aStreaming: true,
                    projectName: `${config.chainKey}-a2a-streaming`,
                });
                
                await installDependencies(projectDir);
                await enableMockMode(projectDir);
                await createTestEnv(projectDir, port);
                
                server = new ServerProcess(projectDir, 'a2a-server.ts', port);
                await server.start();
                
                client = new A2ATestClient(getTestBaseUrl(port));
            }, 120000);

            afterAll(async () => {
                await server?.stop();
            });

            it('should generate streaming-enabled files', async () => {
                expect(await fileExists(projectDir, 'src/a2a-server.ts')).toBe(true);
                const serverCode = await readGeneratedFile(projectDir, 'src/a2a-server.ts');
                // Streaming is handled via streamResponse import and SSE headers
                expect(serverCode).toContain('streamResponse');
                expect(serverCode).toContain('text/event-stream');
            });

            it('should have streaming capability in agent card', async () => {
                const card = await client.getAgentCard();
                expect(card.capabilities.streaming).toBe(true);
            });

            it('should handle regular message/send', async () => {
                const response = await client.sendMessage('Hello streaming!');
                expect(response.result.status).toBe('completed');
            });

            // Note: Full SSE streaming test would require EventSource
            // For now, we verify the endpoint exists and handles requests
        });

        // ================================================================
        // MCP SERVER
        // ================================================================
        describe('MCP Server', () => {
            let projectDir: string;

            beforeAll(async () => {
                projectDir = await generateTestAgent({
                    chain: config.chainKey,
                    features: ['mcp'],
                    projectName: `${config.chainKey}-mcp`,
                });
                
                await installDependencies(projectDir);
                await enableMockMode(projectDir);
                await createTestEnv(projectDir, getNextPort());
            }, 120000);

            it('should generate MCP server files', async () => {
                expect(await fileExists(projectDir, 'src/mcp-server.ts')).toBe(true);
                expect(await fileExists(projectDir, 'src/tools.ts')).toBe(true);
            });

            it('should list available tools', async () => {
                const result = await testMCPServer(projectDir);
                expect(result.tools).toBeDefined();
                expect(result.tools.length).toBeGreaterThanOrEqual(3);
                
                const toolNames = result.tools.map((t: any) => t.name);
                expect(toolNames).toContain('chat');
                expect(toolNames).toContain('echo');
                expect(toolNames).toContain('get_time');
            });

            it('should execute echo tool', async () => {
                const result = await testMCPServer(projectDir);
                expect(result.echoResult.content).toBeDefined();
                const content = JSON.parse(result.echoResult.content[0].text);
                expect(content.echoed).toBe('Test message');
            });

            it('should execute get_time tool', async () => {
                const result = await testMCPServer(projectDir);
                expect(result.timeResult.content).toBeDefined();
                const content = JSON.parse(result.timeResult.content[0].text);
                expect(content.time).toBeDefined();
                // Verify it's a valid ISO date
                expect(new Date(content.time).toISOString()).toBe(content.time);
            });

            it('should execute chat tool with mock response', async () => {
                const result = await testMCPServer(projectDir);
                expect(result.chatResult.content).toBeDefined();
                const content = JSON.parse(result.chatResult.content[0].text);
                expect(content.response).toContain('[MOCK]');
            });
        });

        // ================================================================
        // REGISTRATION FILE VALIDATION
        // ================================================================
        describe('Registration File', () => {
            it('should generate valid registration script', async () => {
                const projectDir = await generateTestAgent({
                    chain: config.chainKey,
                    features: ['a2a', 'mcp'],
                    projectName: `${config.chainKey}-registration`,
                });
                
                expect(await fileExists(projectDir, 'src/register.ts')).toBe(true);
                
                const registerCode = await readGeneratedFile(projectDir, 'src/register.ts');
                expect(registerCode).toContain('agent0-sdk');
                expect(registerCode).toContain('registerIPFS');
                expect(registerCode).toContain(config.chainKey.includes('mainnet') ? 'chainId: ' : 'chainId: ');
            });

            it('should have correct chain configuration', async () => {
                const projectDir = await generateTestAgent({
                    chain: config.chainKey,
                    features: ['a2a'],
                    projectName: `${config.chainKey}-chain-config`,
                });
                
                const registerCode = await readGeneratedFile(projectDir, 'src/register.ts');
                
                // Verify SDK is initialized with correct chain
                expect(registerCode).toContain('SDK');
                expect(registerCode).toContain('chainId');
            });

            it('should have correct trust models', async () => {
                const projectDir = await generateTestAgent({
                    chain: config.chainKey,
                    features: ['a2a'],
                    projectName: `${config.chainKey}-trust`,
                });
                
                const registerCode = await readGeneratedFile(projectDir, 'src/register.ts');
                expect(registerCode).toContain('setTrust');
            });
        });

        // ================================================================
        // x402 PAYMENTS (Base, Polygon)
        // ================================================================
        if (config.x402Supported) {
            describe('x402 Payments', () => {
                let projectDir: string;
                let server: ServerProcess;
                let port: number;

                beforeAll(async () => {
                    port = getNextPort();
                    projectDir = await generateTestAgent({
                        chain: config.chainKey,
                        features: ['a2a', 'x402'],
                        x402Provider: config.x402Provider,
                        projectName: `${config.chainKey}-x402`,
                    });
                    
                    await installDependencies(projectDir);
                    await enableMockMode(projectDir);
                    await createTestEnv(projectDir, port);
                    
                    server = new ServerProcess(projectDir, 'a2a-server.ts', port);
                    await server.start();
                }, 120000);

                afterAll(async () => {
                    await server?.stop();
                });

                it('should generate x402 dependencies', async () => {
                    const packageJson = JSON.parse(
                        await readGeneratedFile(projectDir, 'package.json')
                    );
                    if (config.x402Provider === '4mica') {
                        expect(packageJson.dependencies['@4mica/x402']).toBeDefined();
                    } else {
                        expect(packageJson.dependencies['@x402/express']).toBeDefined();
                        expect(packageJson.dependencies['@x402/core']).toBeDefined();
                        expect(packageJson.dependencies['@x402/evm']).toBeDefined();
                    }
                });

                it('should include x402 middleware in server', async () => {
                    const serverCode = await readGeneratedFile(projectDir, 'src/a2a-server.ts');
                    if (config.x402Provider === '4mica') {
                        expect(serverCode).toContain('paymentMiddlewareFromConfig');
                        expect(serverCode).toContain('4mica-credit');
                    } else {
                        expect(serverCode).toContain('paymentMiddleware');
                        expect(serverCode).toContain('x402ResourceServer');
                        expect(serverCode).toContain('ExactEvmScheme');
                    }
                });

                it('should return 402 Payment Required without payment', async () => {
                    // Wait a bit for server to be fully ready
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // The /a2a endpoint should require payment
                    // Retry up to 3 times in case of connection issues
                    let response: Response | null = null;
                    let lastError: Error | null = null;
                    
                    for (let i = 0; i < 3; i++) {
                        try {
                            response = await fetch(`${getTestBaseUrl(port)}/a2a`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    jsonrpc: '2.0',
                                    method: 'message/send',
                                    params: {
                                        message: { role: 'user', parts: [{ type: 'text', text: 'test' }] },
                                    },
                                    id: 1,
                                }),
                            });
                            break;
                        } catch (e) {
                            lastError = e as Error;
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    }
                    
                    if (!response) {
                        throw lastError || new Error('Failed to connect to server');
                    }
                    
                    // Should return 402 Payment Required
                    expect(response.status).toBe(402);
                });

                it('should have correct CAIP-2 network identifier', async () => {
                    const serverCode = await readGeneratedFile(projectDir, 'src/a2a-server.ts');
                    // Supported x402 networks:
                    // Base mainnet: eip155:8453, Base Sepolia: eip155:84532
                    // Polygon mainnet: eip155:137, Polygon Amoy: eip155:80002
                    // Ethereum Sepolia: eip155:11155111 (4mica)
                    expect(serverCode).toMatch(/eip155:(8453|84532|137|80002|11155111)/);
                });

                it('should configure payment to wallet address', async () => {
                    const serverCode = await readGeneratedFile(projectDir, 'src/a2a-server.ts');
                    expect(serverCode).toContain('payTo');
                    expect(serverCode).toContain('X402_PAYEE_ADDRESS');
                });
            });
        }

        // ================================================================
        // x402 PAID REQUEST (Testnets only - requires funded wallet)
        // ================================================================
        if (config.x402Supported && config.isTestnet) {
            describe('x402 Paid Request', () => {
                let projectDir: string;
                let server: ServerProcess;
                let port: number;
                const payerPrivateKey = process.env.TEST_PAYER_PRIVATE_KEY as Hex | undefined;

                beforeAll(async () => {
                    if (!payerPrivateKey) {
                        console.log('⚠️  Skipping x402 paid request tests: TEST_PAYER_PRIVATE_KEY not set');
                        return;
                    }

                    port = getNextPort();
                    projectDir = await generateTestAgent({
                        chain: config.chainKey,
                        features: ['a2a', 'x402'],
                        x402Provider: config.x402Provider,
                        projectName: `${config.chainKey}-x402-paid`,
                    });
                    
                    await installDependencies(projectDir);
                    await enableMockMode(projectDir);
                    await createTestEnv(projectDir, port);
                    
                    server = new ServerProcess(projectDir, 'a2a-server.ts', port);
                    await server.start();
                }, 120000);

                afterAll(async () => {
                    await server?.stop();
                });

                it('should return response when payment is valid', async () => {
                    if (!payerPrivateKey) {
                        console.log('⚠️  Skipped: TEST_PAYER_PRIVATE_KEY not set');
                        return;
                    }

                    // Dynamically import x402 packages
                    const { wrapFetchWithPaymentFromConfig } = await import('@x402/fetch');
                    const { CHAINS } = await import('../../dist/config.js');
                    
                    // Create account from test payer private key
                    const account = privateKeyToAccount(payerPrivateKey);
                    
                    // Get the CAIP-2 network identifier for this chain
                    const chainConfig = CHAINS[config.chainKey];
                    const network = chainConfig.x402Network;
                    
                    // Wrap fetch with x402 payment handling using the new API
                    let schemeClient: any;
                    if (config.x402Provider === '4mica') {
                        const { FourMicaEvmScheme } = await import('@4mica/x402/client');
                        schemeClient = await FourMicaEvmScheme.create(account);
                    } else {
                        const { ExactEvmScheme } = await import('@x402/evm/exact/client');
                        schemeClient = new ExactEvmScheme(account);
                    }

                    const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
                        schemes: [
                            {
                                network: network, // e.g., "eip155:84532" for Base Sepolia
                                client: schemeClient,
                            },
                        ],
                    });
                    
                    // Make paid request
                    const response = await fetchWithPayment(`${getTestBaseUrl(port)}/a2a`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'message/send',
                            params: {
                                message: {
                                    role: 'user',
                                    parts: [{ type: 'text', text: 'Hello with payment!' }],
                                },
                            },
                            id: 1,
                        }),
                    });
                    
                    // Should return 200 OK (not 402)
                    expect(response.status).toBe(200);
                    
                    // Should have valid JSON-RPC response
                    const data = await response.json();
                    expect(data.jsonrpc).toBe('2.0');
                    expect(data.result).toBeDefined();
                    expect(data.result.status).toBe('completed');
                    expect(data.result.messages).toHaveLength(2);
                    
                    // Agent response should contain our mock marker
                    const agentMessage = data.result.messages[1];
                    expect(agentMessage.role).toBe('agent');
                    expect(agentMessage.parts[0].text).toContain('[MOCK]');
                });
            });
        }

        // ================================================================
        // README GENERATION
        // ================================================================
        describe('README Generation', () => {
            it('should generate comprehensive README', async () => {
                const projectDir = await generateTestAgent({
                    chain: config.chainKey,
                    features: ['a2a', 'mcp'],
                    projectName: `${config.chainKey}-readme`,
                });
                
                const readme = await readGeneratedFile(projectDir, 'README.md');
                
                // Should have quick start section
                expect(readme).toContain('Quick Start');
                expect(readme).toContain('Configure environment');
                expect(readme).toContain('PINATA_JWT');
                expect(readme).toContain('OPENAI_API_KEY');
                
                // Should have chain-specific funding info
                expect(readme).toContain('Fund your wallet');
                
                // Should mention registration
                expect(readme).toContain('npm run register');
                
                // Should have OASF info
                expect(readme).toContain('OASF');
            });

            it('should include correct chain name in README', async () => {
                const projectDir = await generateTestAgent({
                    chain: config.chainKey,
                    features: ['a2a'],
                    projectName: `${config.chainKey}-readme-chain`,
                });
                
                const readme = await readGeneratedFile(projectDir, 'README.md');
                expect(readme).toContain(config.chainName.split(' ')[0]); // First word of chain name
            });
        });
    });
}
