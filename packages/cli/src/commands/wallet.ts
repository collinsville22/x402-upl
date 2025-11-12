import { Command } from 'commander';
import { Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { startSpinner, stopSpinner } from '../utils/spinner.js';

const WALLET_DIR = path.join(os.homedir(), '.x402');
const WALLET_FILE = path.join(WALLET_DIR, 'wallet.json');

function loadWallet(): Keypair | null {
  if (!fs.existsSync(WALLET_FILE)) {
    return null;
  }

  const secretKey = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

function saveWallet(keypair: Keypair): void {
  if (!fs.existsSync(WALLET_DIR)) {
    fs.mkdirSync(WALLET_DIR, { recursive: true });
  }

  fs.writeFileSync(
    WALLET_FILE,
    JSON.stringify(Array.from(keypair.secretKey)),
    { mode: 0o600 }
  );
}

export function walletCommand() {
  const wallet = new Command('wallet')
    .description('Wallet management commands');

  wallet
    .command('create')
    .description('Create a new Solana wallet')
    .option('-f, --force', 'Overwrite existing wallet')
    .action((options) => {
      if (fs.existsSync(WALLET_FILE) && !options.force) {
        console.error('Wallet already exists. Use --force to overwrite.');
        process.exit(1);
      }

      const keypair = Keypair.generate();
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
      const spinner = startSpinner('Fetching balance...');

      try {
        const keypair = loadWallet();

        if (!keypair) {
          stopSpinner(spinner, 'error');
          console.error('No wallet found. Create one with: x402 wallet create');
          process.exit(1);
        }

        const rpcUrls: Record<string, string> = {
          'mainnet-beta': 'https://api.mainnet-beta.solana.com',
          'devnet': 'https://api.devnet.solana.com',
          'testnet': 'https://api.testnet.solana.com'
        };

        const connection = new Connection(rpcUrls[options.network] || rpcUrls.devnet, 'confirmed');
        const balance = await connection.getBalance(keypair.publicKey);

        stopSpinner(spinner, 'success');
        console.log(`\nWallet: ${keypair.publicKey.toBase58()}`);
        console.log(`Network: ${options.network}`);
        console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
      } catch (error: any) {
        stopSpinner(spinner, 'error');
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
      let secretKey: Uint8Array;

      if (options.key) {
        secretKey = Uint8Array.from(Buffer.from(options.key, 'base64'));
      } else if (options.file) {
        const keyData = fs.readFileSync(options.file, 'utf-8');
        const keyArray = JSON.parse(keyData);
        secretKey = Uint8Array.from(keyArray);
      } else {
        console.error('Provide either --key or --file');
        process.exit(1);
      }

      const keypair = Keypair.fromSecretKey(secretKey);
      saveWallet(keypair);

      console.log('Wallet imported successfully!');
      console.log('Public key:', keypair.publicKey.toBase58());
    });

  return wallet;
}
