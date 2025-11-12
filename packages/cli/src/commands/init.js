"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCommand = initCommand;
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const spinner_js_1 = require("../utils/spinner.js");
function initCommand() {
    return new commander_1.Command('init')
        .description('Initialize a new x402 project')
        .option('-n, --name <name>', 'Project name')
        .option('-t, --template <template>', 'Template to use (service|client)', 'service')
        .action(async (options) => {
        const spinner = (0, spinner_js_1.startSpinner)('Initializing x402 project...');
        try {
            const projectName = options.name || 'my-x402-project';
            const projectDir = path_1.default.join(process.cwd(), projectName);
            if (fs_1.default.existsSync(projectDir)) {
                (0, spinner_js_1.stopSpinner)(spinner, 'error');
                console.error(`Directory ${projectName} already exists`);
                process.exit(1);
            }
            fs_1.default.mkdirSync(projectDir, { recursive: true });
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
            fs_1.default.writeFileSync(path_1.default.join(projectDir, 'package.json'), JSON.stringify(packageJson, null, 2));
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
            fs_1.default.writeFileSync(path_1.default.join(projectDir, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));
            fs_1.default.mkdirSync(path_1.default.join(projectDir, 'src'), { recursive: true });
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
                fs_1.default.writeFileSync(path_1.default.join(projectDir, 'src', 'index.ts'), serviceCode);
            }
            else {
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
                fs_1.default.writeFileSync(path_1.default.join(projectDir, 'src', 'index.ts'), clientCode);
            }
            const envFile = `SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
REGISTRY_URL=https://registry.x402.network
`;
            fs_1.default.writeFileSync(path_1.default.join(projectDir, '.env.example'), envFile);
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
            fs_1.default.writeFileSync(path_1.default.join(projectDir, 'README.md'), readmeContent);
            (0, spinner_js_1.stopSpinner)(spinner, 'success');
            console.log(`\nProject created: ${projectName}`);
            console.log(`\nNext steps:`);
            console.log(`  cd ${projectName}`);
            console.log(`  npm install`);
            console.log(`  npm run dev`);
        }
        catch (error) {
            (0, spinner_js_1.stopSpinner)(spinner, 'error');
            console.error('Failed to initialize project:', error.message);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=init.js.map