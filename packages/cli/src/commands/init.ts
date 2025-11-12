import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { startSpinner, stopSpinner } from '../utils/spinner.js';

export function initCommand() {
  return new Command('init')
    .description('Initialize a new x402 project')
    .option('-n, --name <name>', 'Project name')
    .option('-t, --template <template>', 'Template to use (service|client)', 'service')
    .action(async (options) => {
      const spinner = startSpinner('Initializing x402 project...');

      try {
        const projectName = options.name || 'my-x402-project';
        const projectDir = path.join(process.cwd(), projectName);

        if (fs.existsSync(projectDir)) {
          stopSpinner(spinner, 'error');
          console.error(`Directory ${projectName} already exists`);
          process.exit(1);
        }

        fs.mkdirSync(projectDir, { recursive: true });

        const packageJson = {
          name: projectName,
          version: '1.0.0',
          description: 'x402 project',
          type: 'module',
          scripts: {
            dev: 'tsx src/index.ts',
            build: 'tsc',
            start: 'node dist/index.js'
          },
          dependencies: {
            '@x402-upl/sdk': '^2.0.0',
            '@solana/web3.js': '^1.87.6'
          },
          devDependencies: {
            'typescript': '^5.3.3',
            'tsx': '^4.7.0',
            '@types/node': '^20.10.5'
          }
        };

        fs.writeFileSync(
          path.join(projectDir, 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        const tsConfig = {
          compilerOptions: {
            target: 'ES2022',
            module: 'ES2022',
            moduleResolution: 'node',
            outDir: './dist',
            rootDir: './src',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true
          },
          include: ['src/**/*'],
          exclude: ['node_modules', 'dist']
        };

        fs.writeFileSync(
          path.join(projectDir, 'tsconfig.json'),
          JSON.stringify(tsConfig, null, 2)
        );

        fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true });

        if (options.template === 'service') {
          const serviceCode = `import { SolanaX402Client } from '@x402-upl/sdk';
import { Keypair } from '@solana/web3.js';

const wallet = Keypair.generate();

const client = new SolanaX402Client({
  network: 'devnet',
  wallet
});

console.log('x402 service initialized');
console.log('Wallet:', wallet.publicKey.toBase58());
`;

          fs.writeFileSync(path.join(projectDir, 'src', 'index.ts'), serviceCode);
        } else {
          const clientCode = `import { ServiceDiscovery } from '@x402-upl/sdk';

const discovery = new ServiceDiscovery();

async function main() {
  const services = await discovery.discover({
    category: 'AI & ML',
    limit: 10
  });

  console.log('Found services:', services.length);
}

main();
`;

          fs.writeFileSync(path.join(projectDir, 'src', 'index.ts'), clientCode);
        }

        const envFile = `SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
REGISTRY_URL=https://registry.x402.network
`;

        fs.writeFileSync(path.join(projectDir, '.env.example'), envFile);

        const readmeContent = `# ${projectName}

x402 project created with x402 CLI

## Setup

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
npm start
\`\`\`
`;

        fs.writeFileSync(path.join(projectDir, 'README.md'), readmeContent);

        stopSpinner(spinner, 'success');
        console.log(`\nProject created: ${projectName}`);
        console.log(`\nNext steps:`);
        console.log(`  cd ${projectName}`);
        console.log(`  npm install`);
        console.log(`  npm run dev`);
      } catch (error: any) {
        stopSpinner(spinner, 'error');
        console.error('Failed to initialize project:', error.message);
        process.exit(1);
      }
    });
}
