"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletCommand = walletCommand;
const commander_1 = require("commander");
const web3_js_1 = require("@solana/web3.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const spinner_js_1 = require("../utils/spinner.js");
const WALLET_DIR = path_1.default.join(os_1.default.homedir(), '.x402');
const WALLET_FILE = path_1.default.join(WALLET_DIR, 'wallet.json');
function loadWallet() {
    if (!fs_1.default.existsSync(WALLET_FILE)) {
        return null;
    }
    const secretKey = JSON.parse(fs_1.default.readFileSync(WALLET_FILE, 'utf-8'));
    return web3_js_1.Keypair.fromSecretKey(Uint8Array.from(secretKey));
}
function saveWallet(keypair) {
    if (!fs_1.default.existsSync(WALLET_DIR)) {
        fs_1.default.mkdirSync(WALLET_DIR, { recursive: true });
    }
    fs_1.default.writeFileSync(WALLET_FILE, JSON.stringify(Array.from(keypair.secretKey)), { mode: 0o600 });
}
function walletCommand() {
    const wallet = new commander_1.Command('wallet')
        .description('Wallet management commands');
    wallet
        .command('create')
        .description('Create a new Solana wallet')
        .option('-f, --force', 'Overwrite existing wallet')
        .action((options) => {
        if (fs_1.default.existsSync(WALLET_FILE) && !options.force) {
            console.error('Wallet already exists. Use --force to overwrite.');
            process.exit(1);
        }
        const keypair = web3_js_1.Keypair.generate();
        saveWallet(keypair);
        console.log('Wallet created successfully!');
        console.log('Public key:', keypair.publicKey.toBase58());
        console.log('Wallet saved to:', WALLET_FILE);
        console.log('\nTo fund your wallet on devnet:');
        console.log(`  solana airdrop 1 ${keypair.publicKey.toBase58()} --url devnet`);
    });
    wallet
        .command('address')
        .description('Show wallet address')
        .action(() => {
        const keypair = loadWallet();
        if (!keypair) {
            console.error('No wallet found. Create one with: x402 wallet create');
            process.exit(1);
        }
        console.log(keypair.publicKey.toBase58());
    });
    wallet
        .command('balance')
        .description('Check wallet balance')
        .option('-n, --network <network>', 'Network (devnet|mainnet-beta|testnet)', 'devnet')
        .action(async (options) => {
        const spinner = (0, spinner_js_1.startSpinner)('Fetching balance...');
        try {
            const keypair = loadWallet();
            if (!keypair) {
                (0, spinner_js_1.stopSpinner)(spinner, 'error');
                console.error('No wallet found. Create one with: x402 wallet create');
                process.exit(1);
            }
            const rpcUrls = {
                'mainnet-beta': 'https://api.mainnet-beta.solana.com',
                'devnet': 'https://api.devnet.solana.com',
                'testnet': 'https://api.testnet.solana.com'
            };
            const connection = new web3_js_1.Connection(rpcUrls[options.network] || rpcUrls.devnet, 'confirmed');
            const balance = await connection.getBalance(keypair.publicKey);
            (0, spinner_js_1.stopSpinner)(spinner, 'success');
            console.log(`\nWallet: ${keypair.publicKey.toBase58()}`);
            console.log(`Network: ${options.network}`);
            console.log(`Balance: ${balance / web3_js_1.LAMPORTS_PER_SOL} SOL`);
        }
        catch (error) {
            (0, spinner_js_1.stopSpinner)(spinner, 'error');
            console.error('Failed to fetch balance:', error.message);
            process.exit(1);
        }
    });
    wallet
        .command('export')
        .description('Export wallet private key')
        .action(() => {
        const keypair = loadWallet();
        if (!keypair) {
            console.error('No wallet found. Create one with: x402 wallet create');
            process.exit(1);
        }
        console.log('Private key (base58):');
        console.log(Buffer.from(keypair.secretKey).toString('base64'));
        console.log('\nWARNING: Keep this private key secure. Anyone with this key can access your funds.');
    });
    wallet
        .command('import')
        .description('Import wallet from private key')
        .option('-k, --key <key>', 'Private key (base64)')
        .option('-f, --file <file>', 'Path to key file')
        .action((options) => {
        let secretKey;
        if (options.key) {
            secretKey = Uint8Array.from(Buffer.from(options.key, 'base64'));
        }
        else if (options.file) {
            const keyData = fs_1.default.readFileSync(options.file, 'utf-8');
            const keyArray = JSON.parse(keyData);
            secretKey = Uint8Array.from(keyArray);
        }
        else {
            console.error('Provide either --key or --file');
            process.exit(1);
        }
        const keypair = web3_js_1.Keypair.fromSecretKey(secretKey);
        saveWallet(keypair);
        console.log('Wallet imported successfully!');
        console.log('Public key:', keypair.publicKey.toBase58());
    });
    return wallet;
}
//# sourceMappingURL=wallet.js.map