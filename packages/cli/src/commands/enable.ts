import { Command } from 'commander';
import inquirer from 'inquirer';
import { X402Client } from '@x402-upl/sdk';
import { getWallet, getNetwork } from '../utils/config.js';
import { startSpinner, succeedSpinner, failSpinner } from '../utils/spinner.js';

export function enableCommand(): Command {
  const cmd = new Command('enable');

  cmd
    .description('Register a service with x402 protocol')
    .argument('<url>', 'Service URL')
    .option('-n, --name <name>', 'Service name')
    .option('-d, --description <description>', 'Service description')
    .option('-c, --category <category>', 'Service category')
    .option('-p, --price <price>', 'Price per call in USDC')
    .option('-t, --tokens <tokens>', 'Accepted tokens (comma-separated)', 'CASH,USDC,SOL')
    .option('--with-tap', 'Enable TAP authentication for this service')
    .option('--cash-enabled', 'Prioritize CASH token payments')
    .option('--capabilities <capabilities>', 'Service capabilities (comma-separated)')
    .option('--tags <tags>', 'Service tags (comma-separated)')
    .action(async (url, options) => {
      try {
        const wallet = getWallet();

        if (!wallet) {
          failSpinner('No wallet configured. Run "x402 register" first');
          process.exit(1);
        }

        let serviceData: {
          name: string;
          description: string;
          category: string;
          price: number;
          tokens: string[];
          capabilities?: string[];
          tags?: string[];
        };

        if (options.name && options.description && options.category && options.price) {
          serviceData = {
            name: options.name,
            description: options.description,
            category: options.category,
            price: parseFloat(options.price),
            tokens: options.tokens.split(','),
            capabilities: options.capabilities?.split(','),
            tags: options.tags?.split(','),
          };
        } else {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'Service name:',
              default: options.name,
              validate: (input) => input.length > 0 || 'Name is required',
            },
            {
              type: 'input',
              name: 'description',
              message: 'Service description:',
              default: options.description,
              validate: (input) => input.length > 0 || 'Description is required',
            },
            {
              type: 'list',
              name: 'category',
              message: 'Service category:',
              default: options.category,
              choices: [
                'AI & ML',
                'Data Analytics',
                'Blockchain Data',
                'Content Generation',
                'Research',
                'Computation',
                'Storage',
                'Other',
              ],
            },
            {
              type: 'number',
              name: 'price',
              message: 'Price per call (USDC):',
              default: options.price ? parseFloat(options.price) : 0.01,
              validate: (input) => input > 0 || 'Price must be positive',
            },
            {
              type: 'input',
              name: 'tokens',
              message: 'Accepted tokens (comma-separated):',
              default: options.tokens,
            },
            {
              type: 'input',
              name: 'capabilities',
              message: 'Service capabilities (comma-separated, optional):',
              default: options.capabilities,
            },
            {
              type: 'input',
              name: 'tags',
              message: 'Service tags (comma-separated, optional):',
              default: options.tags,
            },
          ]);

          serviceData = {
            name: answers.name,
            description: answers.description,
            category: answers.category,
            price: answers.price,
            tokens: answers.tokens.split(',').map((t: string) => t.trim()),
            capabilities: answers.capabilities
              ? answers.capabilities.split(',').map((c: string) => c.trim())
              : undefined,
            tags: answers.tags ? answers.tags.split(',').map((t: string) => t.trim()) : undefined,
          };
        }

        const spinner = startSpinner('Registering service...');

        const client = new X402Client({
          network: getNetwork(),
          wallet,
        });

        const service = await client.registerService({
          url,
          name: serviceData.name,
          description: serviceData.description,
          category: serviceData.category,
          ownerWalletAddress: wallet.publicKey.toBase58(),
          pricePerCall: serviceData.price,
          acceptedTokens: serviceData.tokens,
          capabilities: serviceData.capabilities,
          tags: serviceData.tags,
        });

        succeedSpinner(`Service registered successfully!`);
      } catch (error) {
        failSpinner(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
      }
    });

  return cmd;
}
