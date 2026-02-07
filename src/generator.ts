import fs from "fs/promises";
import path from "path";
import { CHAINS } from "./config.js";
import { SOLANA_CHAINS, isSolanaChain } from "./config-solana.js";
import type { WizardAnswers } from "./wizard.js";
import { hasFeature } from "./wizard.js";
// EVM templates
import {
    generatePackageJson,
    generateEnvExample,
    generateRegisterScript,
    generateAgentTs,
    generateReadme,
} from "./templates/base.js";
// Solana templates
import {
    generateSolanaPackageJson,
    generateSolanaEnv,
    generateSolanaRegistrationJson,
    generateSolanaRegisterScript,
    generateAgentTs as generateSolanaAgentTs,
    generateSolanaReadme,
} from "./templates/solana.js";
// Monad templates (SDK doesn't support Monad yet)
import {
    isMonadChain,
    generateMonadPackageJson,
    generateMonadEnv,
    generateMonadRegisterScript,
    generateMonadReadme,
} from "./templates/monad.js";
// Shared templates (work for both EVM and Solana)
import { generateA2AServer, generateAgentCard, generateA2AClient } from "./templates/a2a.js";
import { generateMCPServer, generateMCPTools } from "./templates/mcp.js";

export async function generateProject(answers: WizardAnswers): Promise<void> {
    const projectPath = path.resolve(process.cwd(), answers.projectDir);

    // Create directories
    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(path.join(projectPath, "src"), { recursive: true });

    if (hasFeature(answers, "a2a")) {
        await fs.mkdir(path.join(projectPath, ".well-known"), { recursive: true });
    }

    // Route to chain-specific templates
    if (isSolanaChain(answers.chain)) {
        await generateSolanaProject(projectPath, answers);
    } else if (isMonadChain(answers.chain)) {
        await generateMonadProject(projectPath, answers);
    } else {
        await generateEVMProject(projectPath, answers);
    }

    // Generate shared files (A2A, MCP work for both)
    if (hasFeature(answers, "a2a")) {
        await writeFile(projectPath, "src/a2a-server.ts", generateA2AServer(answers));
        await writeFile(projectPath, "src/a2a-client.ts", generateA2AClient());
        await writeFile(projectPath, ".well-known/agent-card.json", generateAgentCard(answers));
    }

    if (hasFeature(answers, "mcp")) {
        await writeFile(projectPath, "src/mcp-server.ts", generateMCPServer(answers));
        await writeFile(projectPath, "src/tools.ts", generateMCPTools());
    }
}

/**
 * Generate EVM-specific project files
 */
async function generateEVMProject(projectPath: string, answers: WizardAnswers): Promise<void> {
    const chain = CHAINS[answers.chain as keyof typeof CHAINS];

    await writeFile(projectPath, "package.json", generatePackageJson(answers));
    await writeFile(projectPath, ".env", generateEnvExample(answers, chain));
    await writeFile(projectPath, "src/register.ts", generateRegisterScript(answers, chain));
    await writeFile(projectPath, "src/agent.ts", generateAgentTs(answers));
    await writeFile(projectPath, "tsconfig.json", generateTsConfig());
    await writeFile(projectPath, ".gitignore", generateGitignore());
    await writeFile(projectPath, "README.md", generateReadme(answers, chain));
}

/**
 * Generate Solana-specific project files
 */
async function generateSolanaProject(projectPath: string, answers: WizardAnswers): Promise<void> {
    const chain = SOLANA_CHAINS[answers.chain as keyof typeof SOLANA_CHAINS];

    await writeFile(projectPath, "package.json", generateSolanaPackageJson(answers));
    await writeFile(projectPath, ".env", generateSolanaEnv(answers));
    await writeFile(projectPath, "registration.json", generateSolanaRegistrationJson(answers, chain));
    await writeFile(projectPath, "src/register.ts", generateSolanaRegisterScript(answers, chain));
    await writeFile(projectPath, "src/agent.ts", generateSolanaAgentTs(answers));
    await writeFile(projectPath, "tsconfig.json", generateTsConfig());
    await writeFile(projectPath, ".gitignore", generateGitignore());
    await writeFile(projectPath, "README.md", generateSolanaReadme(answers, chain));
}

/**
 * Generate Monad-specific project files
 * 
 * Direct contract calls (agent0-sdk doesn't support Monad yet)
 */
async function generateMonadProject(projectPath: string, answers: WizardAnswers): Promise<void> {
    const chain = CHAINS[answers.chain as keyof typeof CHAINS];

    await writeFile(projectPath, "package.json", generateMonadPackageJson(answers));
    await writeFile(projectPath, ".env", generateMonadEnv(answers, chain));
    await writeFile(projectPath, "src/register.ts", generateMonadRegisterScript(answers, chain));
    await writeFile(projectPath, "src/agent.ts", generateAgentTs(answers)); // Reuse EVM agent.ts
    await writeFile(projectPath, "tsconfig.json", generateTsConfig());
    await writeFile(projectPath, ".gitignore", generateGitignore());
    await writeFile(projectPath, "README.md", generateMonadReadme(answers, chain));
}

async function writeFile(projectPath: string, filePath: string, content: string): Promise<void> {
    const fullPath = path.join(projectPath, filePath);
    await fs.writeFile(fullPath, content, "utf-8");
}

function generateTsConfig(): string {
    return JSON.stringify(
        {
            compilerOptions: {
                target: "ES2022",
                module: "NodeNext",
                moduleResolution: "NodeNext",
                outDir: "./dist",
                rootDir: "./src",
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                resolveJsonModule: true,
            },
            include: ["src/**/*"],
            exclude: ["node_modules", "dist"],
        },
        null,
        2
    );
}

function generateGitignore(): string {
    return `node_modules/
dist/
.env
*.log
`;
}
