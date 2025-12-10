import fs from 'fs/promises';
import path from 'path';
import { CHAINS } from './config.js';
import type { WizardAnswers } from './wizard.js';
import { hasFeature } from './wizard.js';
import {
  generatePackageJson,
  generateEnvExample,
  generateRegistrationJson,
  generateRegisterScript,
  generateAgentTs,
} from './templates/base.js';
import { generateA2AServer, generateAgentCard } from './templates/a2a.js';
import { generateMCPServer, generateMCPTools } from './templates/mcp.js';

export async function generateProject(answers: WizardAnswers): Promise<void> {
  const projectPath = path.resolve(process.cwd(), answers.projectDir);

  // Create directories
  await fs.mkdir(projectPath, { recursive: true });
  await fs.mkdir(path.join(projectPath, 'src'), { recursive: true });

  if (hasFeature(answers, 'a2a')) {
    await fs.mkdir(path.join(projectPath, '.well-known'), { recursive: true });
  }

  const chain = CHAINS[answers.chain];

  // Generate base files
  await writeFile(projectPath, 'package.json', generatePackageJson(answers));
  await writeFile(projectPath, '.env', generateEnvExample(answers));
  await writeFile(projectPath, 'registration.json', generateRegistrationJson(answers, chain));
  await writeFile(projectPath, 'src/register.ts', generateRegisterScript(answers, chain));
  await writeFile(projectPath, 'src/agent.ts', generateAgentTs());
  await writeFile(projectPath, 'tsconfig.json', generateTsConfig());
  await writeFile(projectPath, '.gitignore', generateGitignore());

  // Generate A2A files
  if (hasFeature(answers, 'a2a')) {
    await writeFile(projectPath, 'src/a2a-server.ts', generateA2AServer(answers));
    await writeFile(projectPath, '.well-known/agent-card.json', generateAgentCard(answers));
  }

  // Generate MCP files
  if (hasFeature(answers, 'mcp')) {
    await writeFile(projectPath, 'src/mcp-server.ts', generateMCPServer(answers));
    await writeFile(projectPath, 'src/tools.ts', generateMCPTools());
  }
}

async function writeFile(projectPath: string, filePath: string, content: string): Promise<void> {
  const fullPath = path.join(projectPath, filePath);
  await fs.writeFile(fullPath, content, 'utf-8');
}

function generateTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        resolveJsonModule: true,
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
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

