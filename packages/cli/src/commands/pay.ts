import { Command } from 'commander';
import { Keypair, Connection } from '@solana/web3.js';
import { SolanaX402Client } from '@x402-upl/sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { startSpinner, stopSpinner } from '../utils/spinner.js';

const WALLET_FILE = path.join(os.homedir(), '.x402', 'wallet.json');

function loadWallet(): Keypair | null {
  if (!fs.existsSync(WALLET_FILE)) {
    return null;
  }

  const secretKey = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

export function payCommand() {
  return new Command('pay')
    .description('Make a payment to an x402 service')
    .argument('<url>', 'Service URL')
    .option('-n, --network <network>', 'Network (devnet|mainnet-beta)', 'devnet')
    .option('-d, --data <data>', 'JSON data to send (for POST requests)')
    .option('-m, --method <method>', 'HTTP method (GET|POST)', 'GET')
    .action(async (url, options) => {
      const spinner = startSpinner('Processing payment...');

      try {
        const keypair = loadWallet();

        if (!keypair) {
          stopSpinner(spinner, 'error');
          console.error('No wallet found. Create one with: x402 wallet create');
          process.exit(1);
        }

        const client = new SolanaX402Client({
          network: options.network as any,
          wallet: keypair
        });

        let result;
        if (options.method === 'POST') {
          const data = options.data ? JSON.parse(options.data) : undefined;
          result = await client.post(url, data);
        } else {
          result = await client.get(url);
        }

        stopSpinner(spinner, 'success');
        console.log('\nPayment completed successfully!');
        console.log('\nResponse:');
        console.log(JSON.stringify(result, null, 2));
      } catch (error: any) {
        stopSpinner(spinner, 'error');

        if (error.response?.status === 402) {
          console.error('\nPayment required but failed');
          console.error('Requirements:', JSON.stringify(error.response.data, null, 2));
        } else {
          console.error('\nPayment failed:', error.message);
        }

        process.exit(1);
      }
    });
}
