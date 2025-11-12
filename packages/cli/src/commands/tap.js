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
Object.defineProperty(exports, "__esModule", { value: true });
exports.tapCommand = tapCommand;
const commander_1 = require("commander");
const sdk_1 = require("@x402-upl/sdk");
const config_js_1 = require("../utils/config.js");
const spinner_js_1 = require("../utils/spinner.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os_1 = require("os");
function tapCommand() {
    const cmd = new commander_1.Command('tap');
    cmd.description('Manage TAP (Trusted Agent Protocol) authentication');
    cmd
        .command('init')
        .description('Initialize TAP authentication for this agent')
        .option('--did <did>', 'Decentralized Identifier')
        .option('--alg <algorithm>', 'Signature algorithm (ed25519 or rsa-pss-sha256)', 'ed25519')
        .action(async (options) => {
        try {
            const wallet = (0, config_js_1.getWallet)();
            if (!wallet) {
                (0, spinner_js_1.failSpinner)('No wallet found. Run "x402 register" first.');
                process.exit(1);
            }
            const spinner = (0, spinner_js_1.startSpinner)('Generating TAP keypair...');
            let privateKey;
            let publicKey;
            let keyId;
            if (options.alg === 'ed25519') {
                const keypair = sdk_1.RFC9421Signature.generateEd25519KeyPair();
                privateKey = keypair.privateKey;
                publicKey = keypair.publicKey;
                keyId = `ed25519_${wallet.publicKey.toBase58().substring(0, 8)}`;
            }
            else if (options.alg === 'rsa-pss-sha256') {
                const keypair = sdk_1.RFC9421Signature.generateRsaKeyPair();
                privateKey = keypair.privateKey;
                publicKey = keypair.publicKey;
                keyId = `rsa_${wallet.publicKey.toBase58().substring(0, 8)}`;
            }
            else {
                (0, spinner_js_1.failSpinner)('Invalid algorithm. Use ed25519 or rsa-pss-sha256');
                process.exit(1);
            }
            const configDir = path.join((0, os_1.homedir)(), '.config', 'x402-upl');
            const keysDir = path.join(configDir, 'keys');
            if (!fs.existsSync(keysDir)) {
                fs.mkdirSync(keysDir, { recursive: true });
            }
            const privateKeyPath = path.join(keysDir, `${keyId}.private`);
            const publicKeyPath = path.join(keysDir, `${keyId}.public`);
            if (privateKey instanceof Uint8Array) {
                fs.writeFileSync(privateKeyPath, Buffer.from(privateKey).toString('base64'));
                fs.writeFileSync(publicKeyPath, Buffer.from(publicKey).toString('base64'));
            }
            else {
                fs.writeFileSync(privateKeyPath, privateKey);
                fs.writeFileSync(publicKeyPath, publicKey);
            }
            fs.chmodSync(privateKeyPath, 0o600);
            const did = options.did || `did:x402:${wallet.publicKey.toBase58().substring(0, 12)}`;
            (0, config_js_1.setConfig)('tapKeyId', keyId);
            (0, config_js_1.setConfig)('tapAlgorithm', options.alg);
            (0, config_js_1.setConfig)('tapPrivateKeyPath', privateKeyPath);
            (0, config_js_1.setConfig)('did', did);
            (0, config_js_1.setConfig)('visaTapCert', `cert_${keyId}`);
            (0, spinner_js_1.succeedSpinner)('TAP authentication initialized');
            console.log(`\nTAP Configuration:`);
            console.log(`  Key ID: ${keyId}`);
            console.log(`  Algorithm: ${options.alg}`);
            console.log(`  DID: ${did}`);
            console.log(`  Private Key: ${privateKeyPath}`);
            console.log(`  Public Key: ${publicKeyPath}`);
            console.log(`\nKeep your private key secure. Never commit it to version control.`);
        }
        catch (error) {
            (0, spinner_js_1.failSpinner)(`TAP initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    });
    cmd
        .command('verify')
        .description('Verify TAP configuration')
        .action(async () => {
        try {
            const tapKeyId = (0, config_js_1.getConfig)('tapKeyId');
            const tapAlgorithm = (0, config_js_1.getConfig)('tapAlgorithm');
            const tapPrivateKeyPath = (0, config_js_1.getConfig)('tapPrivateKeyPath');
            const did = (0, config_js_1.getConfig)('did');
            if (!tapKeyId || !tapAlgorithm || !tapPrivateKeyPath) {
                (0, spinner_js_1.failSpinner)('TAP not initialized. Run "x402 tap init" first.');
                process.exit(1);
            }
            if (!fs.existsSync(tapPrivateKeyPath)) {
                (0, spinner_js_1.failSpinner)(`Private key not found at ${tapPrivateKeyPath}`);
                process.exit(1);
            }
            console.log(`\nTAP Configuration:`);
            console.log(`  ✓ Key ID: ${tapKeyId}`);
            console.log(`  ✓ Algorithm: ${tapAlgorithm}`);
            console.log(`  ✓ DID: ${did || 'Not set'}`);
            console.log(`  ✓ Private Key: ${tapPrivateKeyPath}`);
            console.log(`\nTAP authentication is properly configured.`);
        }
        catch (error) {
            (0, spinner_js_1.failSpinner)(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            process.exit(1);
        }
    });
    cmd
        .command('show')
        .description('Show current TAP configuration')
        .action(() => {
        const tapKeyId = (0, config_js_1.getConfig)('tapKeyId');
        const tapAlgorithm = (0, config_js_1.getConfig)('tapAlgorithm');
        const did = (0, config_js_1.getConfig)('did');
        const visaTapCert = (0, config_js_1.getConfig)('visaTapCert');
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
//# sourceMappingURL=tap.js.map