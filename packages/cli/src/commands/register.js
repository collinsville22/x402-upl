"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommand = registerCommand;
const commander_1 = require("commander");
const inquirer_1 = __importDefault(require("inquirer"));
const web3_js_1 = require("@solana/web3.js");
const sdk_1 = require("@x402-upl/sdk");
const config_js_1 = require("../utils/config.js");
const spinner_js_1 = require("../utils/spinner.js");
const fs = __importStar(require("fs"));
function registerCommand() {
    const cmd = new commander_1.Command('register');
    cmd
        .description('Register as an agent on the x402 network')
        .option('-s, --stake <amount>', 'Amount of SOL to stake')
        .option('--did <did>', 'Decentralized Identifier')
        .option('--cert <cert>', 'Visa TAP certificate')
        .option('--metadata <uri>', 'Metadata URI')
        .action(async (options) => {
        try {
            let wallet = (0, config_js_1.getWallet)();
            if (!wallet) {
                const answers = await inquirer_1.default.prompt([
                    {
                        type: 'confirm',
                        name: 'createNew',
                        message: 'No wallet found. Create a new wallet?',
                        default: true,
                    },
                ]);
                if (answers.createNew) {
                    wallet = web3_js_1.Keypair.generate();
                    (0, config_js_1.setWallet)(wallet);
                    (0, spinner_js_1.succeedSpinner)(`Created new wallet: ${wallet.publicKey.toBase58()}`);
                }
                else {
                    const keyAnswer = await inquirer_1.default.prompt([
                        {
                            type: 'password',
                            name: 'privateKey',
                            message: 'Enter private key (JSON array):',
                        },
                    ]);
                    try {
                        const secretKey = Uint8Array.from(JSON.parse(keyAnswer.privateKey));
                        wallet = web3_js_1.Keypair.fromSecretKey(secretKey);
                        (0, config_js_1.setWallet)(wallet);
                    }
                    catch {
                        (0, spinner_js_1.failSpinner)('Invalid private key format');
                        process.exit(1);
                    }
                }
            }
            let stake = parseFloat(options.stake || '0');
            if (!stake) {
                const stakeAnswer = await inquirer_1.default.prompt([
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
            const spinner = (0, spinner_js_1.startSpinner)('Registering agent...');
            const tapKeyId = (0, config_js_1.getConfig)('tapKeyId');
            const tapAlgorithm = (0, config_js_1.getConfig)('tapAlgorithm');
            const tapPrivateKeyPath = (0, config_js_1.getConfig)('tapPrivateKeyPath');
            const did = options.did || (0, config_js_1.getConfig)('did');
            const visaTapCert = options.cert || (0, config_js_1.getConfig)('visaTapCert');
            let clientConfig = {
                network: (0, config_js_1.getNetwork)(),
                wallet,
                registryApiUrl: (0, config_js_1.getConfig)('registryApiUrl') || 'https://registry.x402.network',
            };
            if (tapKeyId && tapAlgorithm && tapPrivateKeyPath && fs.existsSync(tapPrivateKeyPath)) {
                const privateKeyData = fs.readFileSync(tapPrivateKeyPath, 'utf-8');
                let privateKey;
                if (tapAlgorithm === 'ed25519') {
                    privateKey = Buffer.from(privateKeyData, 'base64');
                }
                else {
                    privateKey = privateKeyData;
                }
                clientConfig.enableTAP = true;
                clientConfig.tapConfig = {
                    keyId: tapKeyId,
                    privateKey,
                    algorithm: tapAlgorithm,
                    registryUrl: (0, config_js_1.getConfig)('registryApiUrl') || 'https://registry.x402.network',
                    did,
                    visaTapCert,
                };
                clientConfig.agentIdentity = {
                    did: did || `did:x402:${wallet.publicKey.toBase58().substring(0, 12)}`,
                    visaTapCert: visaTapCert || `cert_${tapKeyId}`,
                    walletAddress: wallet.publicKey.toBase58(),
                };
            }
            else if (options.did || options.cert) {
                console.log('\nNote: TAP not initialized. Run "x402 tap init" to enable TAP authentication.');
            }
            const client = new sdk_1.X402Client(clientConfig);
            const registration = await client.registerAgent(stake);
            (0, spinner_js_1.succeedSpinner)(`Agent registered successfully!`);
            (0, config_js_1.setConfig)('agentId', wallet.publicKey.toBase58());
            if (did)
                (0, config_js_1.setConfig)('did', did);
            if (visaTapCert)
                (0, config_js_1.setConfig)('visaTapCert', visaTapCert);
            console.log(`\nAgent Details:`);
            console.log(`  Wallet: ${wallet.publicKey.toBase58()}`);
            console.log(`  DID: ${registration.did}`);
            console.log(`  Reputation: ${registration.reputationScore || 0}`);
            if (clientConfig.enableTAP) {
                console.log(`  TAP: Enabled`);
            }
        }
        catch (error) {
            (0, spinner_js_1.failSpinner)(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    });
    return cmd;
}
//# sourceMappingURL=register.js.map