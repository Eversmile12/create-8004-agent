#!/usr/bin/env tsx
/**
 * E2E Test Suite for A2A Client Generation
 *
 * Tests the complete flow:
 * 1. Generate project with A2A enabled
 * 2. Verify generated files
 * 3. Install dependencies
 * 4. Start A2A server
 * 5. Test all client commands
 *
 * Run: yarn test:e2e
 */

import { generateProject } from "../dist/generator.js";
import { execSync, spawn, ChildProcess } from "child_process";
import { existsSync, rmSync, readFileSync, writeFileSync } from "fs";
import type { WizardAnswers } from "../dist/wizard.js";

const TEST_DIR = "/tmp/e2e-test-a2a-agent";
const PORT = 3099; // Use uncommon port to avoid conflicts
let server: ChildProcess | null = null;

// Test results
const results: { name: string; passed: boolean; error?: string }[] = [];

async function test(name: string, fn: () => void | Promise<void>) {
    try {
        await fn();
        results.push({ name, passed: true });
        console.log(`  ✅ ${name}`);
    } catch (e: unknown) {
        const error = e instanceof Error ? e.message : String(e);
        results.push({ name, passed: false, error });
        console.log(`  ❌ ${name}`);
        console.log(`     Error: ${error}`);
    }
}

async function cleanup() {
    if (server) {
        try {
            process.kill(-server.pid!, "SIGTERM");
        } catch {
            // Ignore
        }
    }
    try {
        execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`, {
            stdio: "ignore",
        });
    } catch {
        // Ignore
    }
}

async function main() {
    console.log("\n🧪 E2E Test Suite: A2A Client\n");
    console.log("=".repeat(50));

    // Cleanup previous test
    await cleanup();
    if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true });
    }

    // =========================================================================
    // PHASE 1: Project Generation
    // =========================================================================
    console.log("\n📁 Phase 1: Project Generation\n");

    await test("Generate project with A2A enabled", async () => {
        const answers: WizardAnswers = {
            projectDir: TEST_DIR,
            agentName: "Test Agent",
            agentDescription: "A test agent for E2E testing",
            agentImage: "https://example.com/agent.png",
            features: ["a2a"],
            a2aStreaming: true,
            chain: "eth-sepolia",
            trustModels: ["tee-attestation"],
            agentWallet: "0x1234567890123456789012345678901234567890",
        };
        await generateProject(answers);
    });

    await test("a2a-client.ts exists", () => {
        if (!existsSync(`${TEST_DIR}/src/a2a-client.ts`)) {
            throw new Error("File not found");
        }
    });

    await test("a2a-server.ts exists", () => {
        if (!existsSync(`${TEST_DIR}/src/a2a-server.ts`)) {
            throw new Error("File not found");
        }
    });

    await test("package.json has a2a scripts", () => {
        const pkg = JSON.parse(readFileSync(`${TEST_DIR}/package.json`, "utf-8"));
        const requiredScripts = ["start:a2a", "a2a:discover", "a2a:chat", "a2a:test"];
        for (const script of requiredScripts) {
            if (!pkg.scripts[script]) {
                throw new Error(`Missing script: ${script}`);
            }
        }
    });

    await test("a2a-client.ts has verbose mode", () => {
        const content = readFileSync(`${TEST_DIR}/src/a2a-client.ts`, "utf-8");
        if (!content.includes("VERBOSE")) {
            throw new Error("VERBOSE not found in client");
        }
    });

    await test("a2a-client.ts has streaming test", () => {
        const content = readFileSync(`${TEST_DIR}/src/a2a-client.ts`, "utf-8");
        if (!content.includes("Streaming Response")) {
            throw new Error("Streaming test not found");
        }
    });

    await test("a2a-client.ts exports classes", () => {
        const content = readFileSync(`${TEST_DIR}/src/a2a-client.ts`, "utf-8");
        if (!content.includes("export { A2AClient")) {
            throw new Error("Export not found");
        }
    });

    // =========================================================================
    // PHASE 2: Install Dependencies
    // =========================================================================
    console.log("\n📦 Phase 2: Install Dependencies\n");

    await test("Install dependencies", () => {
        execSync("yarn install --ignore-engines --silent 2>/dev/null", {
            cwd: TEST_DIR,
            stdio: "pipe",
            timeout: 120000,
        });
    });

    // =========================================================================
    // PHASE 3: Server Setup
    // =========================================================================
    console.log("\n🖥️  Phase 3: Server Setup\n");

    // Create .env file
    writeFileSync(
        `${TEST_DIR}/.env`,
        `
OPENAI_API_KEY=sk-test-fake-key
PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000001
PORT=${PORT}
A2A_SERVER_URL=http://localhost:${PORT}
`
    );

    await test("Start A2A server", async () => {
        server = spawn("npx", ["tsx", "src/a2a-server.ts"], {
            cwd: TEST_DIR,
            stdio: ["ignore", "pipe", "pipe"],
            detached: true,
            env: { ...process.env, PORT: String(PORT) },
        });

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(
                () => reject(new Error("Server start timeout")),
                15000
            );

            server!.stdout?.on("data", (data) => {
                if (data.toString().includes("A2A Server running")) {
                    clearTimeout(timeout);
                    resolve();
                }
            });

            server!.stderr?.on("data", (data) => {
                const err = data.toString();
                if (err.includes("Error") && !err.includes("ExperimentalWarning")) {
                    clearTimeout(timeout);
                    reject(new Error(err));
                }
            });
        });
    });

    // =========================================================================
    // PHASE 4: Client Commands
    // =========================================================================
    console.log("\n🔧 Phase 4: Client Commands\n");

    await test("a2a:discover shows agent card", () => {
        const output = execSync("npx tsx src/a2a-client.ts --discover", {
            cwd: TEST_DIR,
            encoding: "utf-8",
            timeout: 15000,
            env: { ...process.env, A2A_SERVER_URL: `http://localhost:${PORT}` },
        });
        if (!output.includes("Test Agent")) {
            throw new Error("Agent name not found in output");
        }
        if (!output.includes("Streaming: true")) {
            throw new Error("Streaming capability not shown");
        }
    });

    await test("a2a:discover with verbose mode (-v)", () => {
        const output = execSync("npx tsx src/a2a-client.ts --discover -v", {
            cwd: TEST_DIR,
            encoding: "utf-8",
            timeout: 15000,
            env: { ...process.env, A2A_SERVER_URL: `http://localhost:${PORT}` },
        });
        if (!output.includes("Test Agent")) {
            throw new Error("Agent name not found");
        }
    });

    await test("a2a:test runs and passes discovery", () => {
        const output = execSync("npx tsx src/a2a-client.ts --test 2>&1 || true", {
            cwd: TEST_DIR,
            encoding: "utf-8",
            timeout: 30000,
            env: { ...process.env, A2A_SERVER_URL: `http://localhost:${PORT}` },
        });
        if (!output.includes("[PASS] Agent Discovery")) {
            throw new Error("Discovery test did not pass");
        }
        if (!output.includes("tests passed")) {
            throw new Error("Test summary not shown");
        }
    });

    await test("Demo mode runs without errors", () => {
        const output = execSync("npx tsx src/a2a-client.ts 2>&1 || true", {
            cwd: TEST_DIR,
            encoding: "utf-8",
            timeout: 30000,
            env: { ...process.env, A2A_SERVER_URL: `http://localhost:${PORT}` },
        });
        if (!output.includes("A2A Client Demo") && !output.includes("Discovering agent")) {
            throw new Error("Demo mode did not start");
        }
    });

    // =========================================================================
    // PHASE 5: Cleanup & Summary
    // =========================================================================
    console.log("\n🧹 Phase 5: Cleanup\n");

    await cleanup();
    console.log("  ✅ Server stopped");

    // Cleanup test directory
    if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true });
    }
    console.log("  ✅ Test directory cleaned");

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 Test Summary\n");

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Total:  ${results.length}`);

    if (failed > 0) {
        console.log("\n❌ Failed tests:");
        results
            .filter((r) => !r.passed)
            .forEach((r) => {
                console.log(`  - ${r.name}: ${r.error}`);
            });
        process.exit(1);
    }

    console.log("\n✅ All tests passed!\n");
}

main().catch(async (err) => {
    console.error("\n❌ Test suite failed:", err.message);
    await cleanup();
    process.exit(1);
});
