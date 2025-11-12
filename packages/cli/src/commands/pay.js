"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.payCommand = payCommand;
const commander_1 = require("commander");
const web3_js_1 = require("@solana/web3.js");
const sdk_1 = require("@x402-upl/sdk");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const spinner_js_1 = require("../utils/spinner.js");
const WALLET_FILE = path_1.default.join(os_1.default.homedir(), '.x402', 'wallet.json');
function loadWallet() {
    if (!fs_1.default.existsSync(WALLET_FILE)) {
        return null;
    }
    const secretKey = JSON.parse(fs_1.default.readFileSync(WALLET_FILE, 'utf-8'));
    return web3_js_1.Keypair.fromSecretKey(Uint8Array.from(secretKey));
}
function payCommand() {
    return new commander_1.Command('pay')
        .description('Make a payment to an x402 service')
        .argument('<url>', 'Service URL')
        .option('-n, --network <network>', 'Network (devnet|mainnet-beta)', 'devnet')
        .option('-d, --data <data>', 'JSON data to send (for POST requests)')
        .option('-m, --method <method>', 'HTTP method (GET|POST)', 'GET')
        .action(async (url, options) => {
        const spinner = (0, spinner_js_1.startSpinner)('Processing payment...');
        try {
            const keypair = loadWallet();
            if (!keypair) {
                (0, spinner_js_1.stopSpinner)(spinner, 'error');
                console.error('No wallet found. Create one with: x402 wallet create');
                process.exit(1);
            }
            const client = new sdk_1.SolanaX402Client({
                network: options.network,
                wallet: keypair
            });
            let result;
            if (options.method === 'POST') {
                const data = options.data ? JSON.parse(options.data) : undefined;
                result = await client.post(url, data);
            }
            else {
                result = await client.get(url);
            }
            (0, spinner_js_1.stopSpinner)(spinner, 'success');
            console.log('\nPayment completed successfully!');
            console.log('\nResponse:');
            console.log(JSON.stringify(result, null, 2));
        }
        catch (error) {
            (0, spinner_js_1.stopSpinner)(spinner, 'error');
            if (error.response?.status === 402) {
                console.error('\nPayment required but failed');
                console.error('Requirements:', JSON.stringify(error.response.data, null, 2));
            }
            else {
                console.error('\nPayment failed:', error.message);
            }
            process.exit(1);
        }
    });
}
//# sourceMappingURL=pay.js.map