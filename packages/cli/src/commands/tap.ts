import { Command } from 'commander';
import inquirer from 'inquirer';
import { RFC9421Signature } from '@x402-upl/sdk';
import { getConfig, setConfig, getWallet } from '../utils/config.js';
import { startSpinner, succeedSpinner, failSpinner } from '../utils/spinner.js';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

export function tapCommand(): Command {
  const cmd = new Command('tap');

  cmd.description('Manage TAP (Trusted Agent Protocol) authentication');

  cmd
    .command('init')
    .description('Initialize TAP authentication for this agent')
    .option('--did <did>', 'Decentralized Identifier')
    .option('--alg <algorithm>', 'Signature algorithm (ed25519 or rsa-pss-sha256)', 'ed25519')
    .action(async (options) => {
      try {
        const wallet = getWallet();

        if (!wallet) {
          failSpinner('No wallet found. Run "x402 register" first.');
          process.exit(1);
        }

        const spinner = startSpinner('Generating TAP keypair...');

        let privateKey: Uint8Array | string;
        let publicKey: Uint8Array | string;
        let keyId: string;

        if (options.alg === 'ed25519') {
          const keypair = RFC9421Signature.generateEd25519KeyPair();
          privateKey = keypair.privateKey;
          publicKey = keypair.publicKey;
          keyId = `ed25519_${wallet.publicKey.toBase58().substring(0, 8)}`;
        } else if (options.alg === 'rsa-pss-sha256') {
          const keypair = RFC9421Signature.generateRsaKeyPair();
          privateKey = keypair.privateKey;
          publicKey = keypair.publicKey;
          keyId = `rsa_${wallet.publicKey.toBase58().substring(0, 8)}`;
        } else {
          failSpinner('Invalid algorithm. Use ed25519 or rsa-pss-sha256');
          process.exit(1);
        }

        const configDir = path.join(homedir(), '.config', 'x402-upl');
        const keysDir = path.join(configDir, 'keys');

        if (!fs.existsSync(keysDir)) {
          fs.mkdirSync(keysDir, { recursive: true });
        }

        const privateKeyPath = path.join(keysDir, `${keyId}.private`);
        const publicKeyPath = path.join(keysDir, `${keyId}.public`);

        if (privateKey instanceof Uint8Array) {
          fs.writeFileSync(privateKeyPath, Buffer.from(privateKey).toString('base64'));
          fs.writeFileSync(publicKeyPath, Buffer.from(publicKey).toString('base64'));
        } else {
          fs.writeFileSync(privateKeyPath, privateKey);
          fs.writeFileSync(publicKeyPath, publicKey);
        }

        fs.chmodSync(privateKeyPath, 0o600);

        const did = options.did || `did:x402:${wallet.publicKey.toBase58().substring(0, 12)}`;

        setConfig('tapKeyId', keyId);
        setConfig('tapAlgorithm', options.alg);
        setConfig('tapPrivateKeyPath', privateKeyPath);
        setConfig('did', did);
        setConfig('visaTapCert', `cert_${keyId}`);

        succeedSpinner('TAP authentication initialized');

        console.log(`\nTAP Configuration:`);
        console.log(`  Key ID: ${keyId}`);
        console.log(`  Algorithm: ${options.alg}`);
        console.log(`  DID: ${did}`);
        console.log(`  Private Key: ${privateKeyPath}`);
        console.log(`  Public Key: ${publicKeyPath}`);
        console.log(`\nKeep your private key secure. Never commit it to version control.`);
      } catch (error) {
        failSpinner(`TAP initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
      }
    });

  cmd
    .command('verify')
    .description('Verify TAP configuration')
    .action(async () => {
      try {
        const tapKeyId = getConfig('tapKeyId');
        const tapAlgorithm = getConfig('tapAlgorithm');
        const tapPrivateKeyPath = getConfig('tapPrivateKeyPath');
        const did = getConfig('did');

        if (!tapKeyId || !tapAlgorithm || !tapPrivateKeyPath) {
          failSpinner('TAP not initialized. Run "x402 tap init" first.');
          process.exit(1);
        }

        if (!fs.existsSync(tapPrivateKeyPath)) {
          failSpinner(`Private key not found at ${tapPrivateKeyPath}`);
          process.exit(1);
        }

        console.log(`\nTAP Configuration:`);
        console.log(`  ✓ Key ID: ${tapKeyId}`);
        console.log(`  ✓ Algorithm: ${tapAlgorithm}`);
        console.log(`  ✓ DID: ${did || 'Not set'}`);
        console.log(`  ✓ Private Key: ${tapPrivateKeyPath}`);
        console.log(`\nTAP authentication is properly configured.`);
      } catch (error) {
        failSpinner(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
      }
    });

  cmd
    .command('show')
    .description('Show current TAP configuration')
    .action(() => {
      const tapKeyId = getConfig('tapKeyId');
      const tapAlgorithm = getConfig('tapAlgorithm');
      const did = getConfig('did');
      const visaTapCert = getConfig('visaTapCert');

      if (!tapKeyId) {
        console.log('TAP not initialized. Run "x402 tap init".');
        return;
      }

      console.log(`\nTAP Configuration:`);
      console.log(`  Key ID: ${tapKeyId}`);
      console.log(`  Algorithm: ${tapAlgorithm}`);
      console.log(`  DID: ${did || 'Not set'}`);
      console.log(`  Visa TAP Cert: ${visaTapCert || 'Not set'}`);
    });

  return cmd;
}
