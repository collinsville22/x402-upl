import { Command } from 'commander';
import inquirer from 'inquirer';
import { table } from 'table';
import { getConfig, setConfig, setNetwork, clearConfig, getWallet } from '../utils/config.js';
import { succeedSpinner, failSpinner } from '../utils/spinner.js';

export function configCommand(): Command {
  const cmd = new Command('config');

  cmd.description('Manage CLI configuration');

  cmd
    .command('show')
    .description('Show current configuration')
    .action(() => {
      const config = getConfig();
      const wallet = getWallet();

      const data = [
        ['Setting', 'Value'],
        ['Network', config.network],
        ['RPC URL', config.rpcUrl || 'Default'],
        ['Registry API', config.registryApiUrl || 'Default'],
        ['Wallet', wallet ? wallet.publicKey.toBase58() : 'Not configured'],
        ['Agent ID', config.agentId || 'Not registered'],
        ['DID', config.did || 'Not set'],
      ];
    });

  cmd
    .command('set')
    .description('Set a configuration value')
    .argument('<key>', 'Configuration key')
    .argument('<value>', 'Configuration value')
    .action((key, value) => {
      const validKeys = ['network', 'rpcUrl', 'registryApiUrl'];

      if (!validKeys.includes(key)) {
        failSpinner(`Invalid key. Valid keys: ${validKeys.join(', ')}`);
        process.exit(1);
      }

      if (key === 'network') {
        if (!['mainnet-beta', 'devnet', 'testnet'].includes(value)) {
          failSpinner('Invalid network. Use: mainnet-beta, devnet, or testnet');
          process.exit(1);
        }

        setNetwork(value as 'mainnet-beta' | 'devnet' | 'testnet');
      } else {
        setConfig(key as 'rpcUrl' | 'registryApiUrl', value);
      }

      succeedSpinner(`Configuration updated: ${key} = ${value}`);
    });

  cmd
    .command('reset')
    .description('Reset all configuration')
    .action(async () => {
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to reset all configuration?',
          default: false,
        },
      ]);

      if (answer.confirm) {
        clearConfig();
        succeedSpinner('Configuration reset successfully');
      }
    });

  cmd
    .command('network')
    .description('Switch network')
    .argument('<network>', 'Network: mainnet-beta, devnet, or testnet')
    .action((network) => {
      if (!['mainnet-beta', 'devnet', 'testnet'].includes(network)) {
        failSpinner('Invalid network. Use: mainnet-beta, devnet, or testnet');
        process.exit(1);
      }

      setNetwork(network as 'mainnet-beta' | 'devnet' | 'testnet');
      succeedSpinner(`Switched to ${network}`);
    });

  return cmd;
}
