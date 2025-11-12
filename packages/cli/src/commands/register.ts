import { Command } from 'commander';
import inquirer from 'inquirer';
import { Keypair } from '@solana/web3.js';
import { X402Client, RFC9421Signature } from '@x402-upl/sdk';
import { getConfig, setConfig, getWallet, setWallet, getNetwork } from '../utils/config.js';
import { startSpinner, succeedSpinner, failSpinner } from '../utils/spinner.js';
import * as fs from 'fs';

export function registerCommand(): Command {
  const cmd = new Command('register');

  cmd
    .description('Register as an agent on the x402 network')
    .option('-s, --stake <amount>', 'Amount of SOL to stake')
    .option('--did <did>', 'Decentralized Identifier')
    .option('--cert <cert>', 'Visa TAP certificate')
    .option('--metadata <uri>', 'Metadata URI')
    .action(async (options) => {
      try {
        let wallet = getWallet();

        if (!wallet) {
          const answers = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'createNew',
              message: 'No wallet found. Create a new wallet?',
              default: true,
            },
          ]);

          if (answers.createNew) {
            wallet = Keypair.generate();
            setWallet(wallet);
            succeedSpinner(`Created new wallet: ${wallet.publicKey.toBase58()}`);
          } else {
            const keyAnswer = await inquirer.prompt([
              {
                type: 'password',
                name: 'privateKey',
                message: 'Enter private key (JSON array):',
              },
            ]);

            try {
              const secretKey = Uint8Array.from(JSON.parse(keyAnswer.privateKey));
              wallet = Keypair.fromSecretKey(secretKey);
              setWallet(wallet);
            } catch {
              failSpinner('Invalid private key format');
              process.exit(1);
            }
          }
        }

        let stake = parseFloat(options.stake || '0');

        if (!stake) {
          const stakeAnswer = await inquirer.prompt([
            {
              type: 'number',
              name: 'amount',
              message: 'How much SOL do you want to stake?',
              default: 1,
              validate: (input) => input > 0 || 'Stake must be positive',
            },
          ]);

          stake = stakeAnswer.amount;
        }

        const spinner = startSpinner('Registering agent...');

        const tapKeyId = getConfig('tapKeyId');
        const tapAlgorithm = getConfig('tapAlgorithm');
        const tapPrivateKeyPath = getConfig('tapPrivateKeyPath');
        const did = options.did || getConfig('did');
        const visaTapCert = options.cert || getConfig('visaTapCert');

        let clientConfig: any = {
          network: getNetwork(),
          wallet,
          registryApiUrl: getConfig('registryApiUrl') || 'https://registry.x402.network',
        };

        if (tapKeyId && tapAlgorithm && tapPrivateKeyPath && fs.existsSync(tapPrivateKeyPath)) {
          const privateKeyData = fs.readFileSync(tapPrivateKeyPath, 'utf-8');
          let privateKey: Uint8Array | string;

          if (tapAlgorithm === 'ed25519') {
            privateKey = Buffer.from(privateKeyData, 'base64');
          } else {
            privateKey = privateKeyData;
          }

          clientConfig.enableTAP = true;
          clientConfig.tapConfig = {
            keyId: tapKeyId,
            privateKey,
            algorithm: tapAlgorithm,
            registryUrl: getConfig('registryApiUrl') || 'https://registry.x402.network',
            did,
            visaTapCert,
          };

          clientConfig.agentIdentity = {
            did: did || `did:x402:${wallet.publicKey.toBase58().substring(0, 12)}`,
            visaTapCert: visaTapCert || `cert_${tapKeyId}`,
            walletAddress: wallet.publicKey.toBase58(),
          };
        } else if (options.did || options.cert) {
          console.log('\nNote: TAP not initialized. Run "x402 tap init" to enable TAP authentication.');
        }

        const client = new X402Client(clientConfig);

        const registration = await client.registerAgent(stake);

        succeedSpinner(`Agent registered successfully!`);

        setConfig('agentId', wallet.publicKey.toBase58());
        if (did) setConfig('did', did);
        if (visaTapCert) setConfig('visaTapCert', visaTapCert);

        console.log(`\nAgent Details:`);
        console.log(`  Wallet: ${wallet.publicKey.toBase58()}`);
        console.log(`  DID: ${registration.did}`);
        console.log(`  Reputation: ${registration.reputationScore || 0}`);
        if (clientConfig.enableTAP) {
          console.log(`  TAP: Enabled`);
        }
      } catch (error) {
        failSpinner(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
      }
    });

  return cmd;
}
