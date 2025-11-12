"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configCommand = configCommand;
const commander_1 = require("commander");
const inquirer_1 = __importDefault(require("inquirer"));
const config_js_1 = require("../utils/config.js");
const spinner_js_1 = require("../utils/spinner.js");
function configCommand() {
    const cmd = new commander_1.Command('config');
    cmd.description('Manage CLI configuration');
    cmd
        .command('show')
        .description('Show current configuration')
        .action(() => {
        const config = (0, config_js_1.getConfig)();
        const wallet = (0, config_js_1.getWallet)();
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
            (0, spinner_js_1.failSpinner)(`Invalid key. Valid keys: ${validKeys.join(', ')}`);
            process.exit(1);
        }
        if (key === 'network') {
            if (!['mainnet-beta', 'devnet', 'testnet'].includes(value)) {
                (0, spinner_js_1.failSpinner)('Invalid network. Use: mainnet-beta, devnet, or testnet');
                process.exit(1);
            }
            (0, config_js_1.setNetwork)(value);
        }
        else {
            (0, config_js_1.setConfig)(key, value);
        }
        (0, spinner_js_1.succeedSpinner)(`Configuration updated: ${key} = ${value}`);
    });
    cmd
        .command('reset')
        .description('Reset all configuration')
        .action(async () => {
        const answer = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Are you sure you want to reset all configuration?',
                default: false,
            },
        ]);
        if (answer.confirm) {
            (0, config_js_1.clearConfig)();
            (0, spinner_js_1.succeedSpinner)('Configuration reset successfully');
        }
    });
    cmd
        .command('network')
        .description('Switch network')
        .argument('<network>', 'Network: mainnet-beta, devnet, or testnet')
        .action((network) => {
        if (!['mainnet-beta', 'devnet', 'testnet'].includes(network)) {
            (0, spinner_js_1.failSpinner)('Invalid network. Use: mainnet-beta, devnet, or testnet');
            process.exit(1);
        }
        (0, config_js_1.setNetwork)(network);
        (0, spinner_js_1.succeedSpinner)(`Switched to ${network}`);
    });
    return cmd;
}
//# sourceMappingURL=config.js.map