"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployCommand = deployCommand;
const commander_1 = require("commander");
const inquirer_1 = __importDefault(require("inquirer"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const spinner_js_1 = require("../utils/spinner.js");
function deployCommand() {
    const cmd = new commander_1.Command('deploy');
    cmd
        .description('Generate x402 middleware code for your service')
        .option('-f, --framework <framework>', 'Framework (express, fastify, nextjs)', 'express')
        .option('-o, --output <path>', 'Output directory', './x402-generated')
        .action(async (options) => {
        try {
            const framework = options.framework.toLowerCase();
            if (!['express', 'fastify', 'nextjs'].includes(framework)) {
                (0, spinner_js_1.failSpinner)('Unsupported framework. Choose: express, fastify, or nextjs');
                process.exit(1);
            }
            const answers = await inquirer_1.default.prompt([
                {
                    type: 'input',
                    name: 'serviceName',
                    message: 'Service name:',
                    validate: (input) => input.length > 0 || 'Name is required',
                },
                {
                    type: 'number',
                    name: 'price',
                    message: 'Price per call (USDC):',
                    default: 0.01,
                    validate: (input) => input > 0 || 'Price must be positive',
                },
                {
                    type: 'input',
                    name: 'walletAddress',
                    message: 'Your Solana wallet address:',
                    validate: (input) => input.length > 0 || 'Wallet address is required',
                },
                {
                    type: 'list',
                    name: 'network',
                    message: 'Solana network:',
                    choices: ['devnet', 'mainnet-beta'],
                    default: 'devnet',
                },
            ]);
            const spinner = (0, spinner_js_1.startSpinner)('Generating middleware code...');
            const outputDir = path_1.default.resolve(process.cwd(), options.output);
            await promises_1.default.mkdir(outputDir, { recursive: true });
            if (framework === 'express') {
                await generateExpressMiddleware(outputDir, answers);
            }
            else if (framework === 'fastify') {
                await generateFastifyMiddleware(outputDir, answers);
            }
            else if (framework === 'nextjs') {
                await generateNextjsMiddleware(outputDir, answers);
            }
            (0, spinner_js_1.succeedSpinner)(`Middleware code generated in ${outputDir}`);
            (0, spinner_js_1.logInfo)('Next steps:');
            (0, spinner_js_1.logInfo)('1. Install dependencies: npm install @x402-upl/core');
            (0, spinner_js_1.logInfo)('2. Copy the generated files to your project');
            (0, spinner_js_1.logInfo)('3. Import and use the middleware');
            (0, spinner_js_1.logInfo)('4. Deploy your service');
            (0, spinner_js_1.logInfo)('5. Register with: x402 enable <your-service-url>');
        }
        catch (error) {
            (0, spinner_js_1.failSpinner)(`Deploy failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    });
    return cmd;
}
async function generateExpressMiddleware(dir, config) {
    const code = `import { createX402Middleware } from '@x402-upl/core/middleware/express';
import { Connection, PublicKey } from '@solana/web3.js';

const x402 = createX402Middleware({
  network: '${config.network}',
  pricePerCall: ${config.price},
  recipientAddress: new PublicKey('${config.walletAddress}'),
  serviceName: '${config.serviceName}',
  connection: new Connection('https://api.${config.network}.solana.com', 'confirmed'),
});

export default x402;
`;
    await promises_1.default.writeFile(path_1.default.join(dir, 'x402-middleware.ts'), code);
    const exampleCode = `import express from 'express';
import x402 from './x402-middleware';

const app = express();

app.use(express.json());

app.post('/api/my-service', x402, async (req, res) => {
  const result = {
    success: true,
    message: 'Payment verified, service executed',
  };

  res.json(result);
});

app.listen(3000);
`;
    await promises_1.default.writeFile(path_1.default.join(dir, 'example-usage.ts'), exampleCode);
}
async function generateFastifyMiddleware(dir, config) {
    const code = `import { createFastifyX402Middleware } from '@x402-upl/core/middleware/fastify';
import { Connection, PublicKey } from '@solana/web3.js';

export const x402 = createFastifyX402Middleware({
  network: '${config.network}',
  pricePerCall: ${config.price},
  recipientAddress: new PublicKey('${config.walletAddress}'),
  serviceName: '${config.serviceName}',
  connection: new Connection('https://api.${config.network}.solana.com', 'confirmed'),
});
`;
    await promises_1.default.writeFile(path_1.default.join(dir, 'x402-middleware.ts'), code);
    const exampleCode = `import Fastify from 'fastify';
import { x402 } from './x402-middleware';

const fastify = Fastify();

fastify.addHook('preHandler', x402);

fastify.post('/api/my-service', async (request, reply) => {
  return {
    success: true,
    message: 'Payment verified, service executed',
  };
});

fastify.listen({ port: 3000 });
`;
    await promises_1.default.writeFile(path_1.default.join(dir, 'example-usage.ts'), exampleCode);
}
async function generateNextjsMiddleware(dir, config) {
    const code = `import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { X402PaymentVerifier } from '@x402-upl/core/payment/verifier';

const verifier = new X402PaymentVerifier(
  new Connection('https://api.${config.network}.solana.com', 'confirmed'),
  '${config.network}'
);

export async function withX402(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const paymentHeader = request.headers.get('x-payment');

  if (!paymentHeader) {
    return NextResponse.json(
      {
        scheme: 'solana',
        network: '${config.network}',
        asset: 'USDC',
        payTo: '${config.walletAddress}',
        amount: '${config.price}',
        timeout: 60,
      },
      { status: 402 }
    );
  }

  try {
    const payload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());

    const verification = await verifier.verifyPayment(
      payload,
      ${config.price},
      new PublicKey('${config.walletAddress}')
    );

    if (!verification.valid) {
      return NextResponse.json({ error: verification.reason }, { status: 402 });
    }

    return await handler(request);
  } catch (error) {
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 402 });
  }
}
`;
    await promises_1.default.writeFile(path_1.default.join(dir, 'x402-middleware.ts'), code);
    const exampleCode = `import { NextRequest, NextResponse } from 'next/server';
import { withX402 } from './x402-middleware';

export async function POST(request: NextRequest) {
  return withX402(request, async (req) => {
    return NextResponse.json({
      success: true,
      message: 'Payment verified, service executed',
    });
  });
}
`;
    await promises_1.default.writeFile(path_1.default.join(dir, 'example-route.ts'), exampleCode);
}
//# sourceMappingURL=deploy.js.map