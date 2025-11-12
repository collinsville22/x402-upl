"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enableCommand = enableCommand;
const commander_1 = require("commander");
const inquirer_1 = __importDefault(require("inquirer"));
const sdk_1 = require("@x402-upl/sdk");
const config_js_1 = require("../utils/config.js");
const spinner_js_1 = require("../utils/spinner.js");
function enableCommand() {
    const cmd = new commander_1.Command('enable');
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
            const wallet = (0, config_js_1.getWallet)();
            if (!wallet) {
                (0, spinner_js_1.failSpinner)('No wallet configured. Run "x402 register" first');
                process.exit(1);
            }
            let serviceData;
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
            }
            else {
                const answers = await inquirer_1.default.prompt([
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
                    tokens: answers.tokens.split(',').map((t) => t.trim()),
                    capabilities: answers.capabilities
                        ? answers.capabilities.split(',').map((c) => c.trim())
                        : undefined,
                    tags: answers.tags ? answers.tags.split(',').map((t) => t.trim()) : undefined,
                };
            }
            const spinner = (0, spinner_js_1.startSpinner)('Registering service...');
            const client = new sdk_1.X402Client({
                network: (0, config_js_1.getNetwork)(),
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
            (0, spinner_js_1.succeedSpinner)(`Service registered successfully!`);
        }
        catch (error) {
            (0, spinner_js_1.failSpinner)(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    });
    return cmd;
}
//# sourceMappingURL=enable.js.map