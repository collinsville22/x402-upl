"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
exports.setConfig = setConfig;
exports.getNetwork = getNetwork;
exports.setNetwork = setNetwork;
exports.getWallet = getWallet;
exports.setWallet = setWallet;
exports.getRegistryApiUrl = getRegistryApiUrl;
exports.clearConfig = clearConfig;
exports.isConfigured = isConfigured;
const conf_1 = __importDefault(require("conf"));
const web3_js_1 = require("@solana/web3.js");
const config = new conf_1.default({
    projectName: 'x402-upl',
    defaults: {
        network: 'devnet',
    },
});
function getConfig() {
    return {
        network: config.get('network'),
        rpcUrl: config.get('rpcUrl'),
        registryApiUrl: config.get('registryApiUrl'),
        walletPrivateKey: config.get('walletPrivateKey'),
        agentId: config.get('agentId'),
        did: config.get('did'),
        visaTapCert: config.get('visaTapCert'),
    };
}
function setConfig(key, value) {
    config.set(key, value);
}
function getNetwork() {
    return config.get('network') || 'devnet';
}
function setNetwork(network) {
    config.set('network', network);
}
function getWallet() {
    const privateKey = config.get('walletPrivateKey');
    if (!privateKey)
        return null;
    try {
        const secretKey = Uint8Array.from(JSON.parse(privateKey));
        return web3_js_1.Keypair.fromSecretKey(secretKey);
    }
    catch {
        return null;
    }
}
function setWallet(keypair) {
    const secretKey = Array.from(keypair.secretKey);
    config.set('walletPrivateKey', JSON.stringify(secretKey));
}
function getRegistryApiUrl() {
    const customUrl = config.get('registryApiUrl');
    if (customUrl)
        return customUrl;
    const network = getNetwork();
    return network === 'mainnet-beta'
        ? 'https://api.x402-upl.network'
        : 'https://api-dev.x402-upl.network';
}
function clearConfig() {
    config.clear();
}
function isConfigured() {
    return !!config.get('walletPrivateKey');
}
//# sourceMappingURL=config.js.map