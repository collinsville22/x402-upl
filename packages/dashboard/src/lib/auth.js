"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthToken = getAuthToken;
exports.getAuthHeaders = getAuthHeaders;
const wallet_1 = require("@/store/wallet");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
async function getAuthToken() {
    const { publicKey, privateKey } = wallet_1.useWalletStore.getState();
    if (!publicKey || !privateKey) {
        throw new Error('Wallet not connected');
    }
    const message = `x402-auth:${Date.now()}`;
    const messageBytes = new TextEncoder().encode(message);
    const { Keypair } = await import('@solana/web3.js');
    const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(privateKey)));
    const signature = tweetnacl_1.default.sign.detached(messageBytes, keypair.secretKey);
    return `${publicKey}:${Buffer.from(signature).toString('hex')}:${message}`;
}
async function getAuthHeaders() {
    const token = await getAuthToken();
    return {
        'Authorization': `Bearer ${token}`
    };
}
//# sourceMappingURL=auth.js.map