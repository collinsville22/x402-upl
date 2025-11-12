"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWalletStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const web3_js_1 = require("@solana/web3.js");
exports.useWalletStore = (0, zustand_1.create)()((0, middleware_1.persist)((set, get) => ({
    privateKey: null,
    publicKey: null,
    agentId: null,
    did: null,
    setWallet: (privateKey, publicKey) => {
        set({ privateKey, publicKey });
    },
    setAgentId: (agentId) => {
        set({ agentId });
    },
    setDid: (did) => {
        set({ did });
    },
    clearWallet: () => {
        set({
            privateKey: null,
            publicKey: null,
            agentId: null,
            did: null,
        });
    },
    getKeypair: () => {
        const { privateKey } = get();
        if (!privateKey)
            return null;
        try {
            const secretKey = Uint8Array.from(JSON.parse(privateKey));
            return web3_js_1.Keypair.fromSecretKey(secretKey);
        }
        catch {
            return null;
        }
    },
}), {
    name: 'x402-wallet-storage',
}));
//# sourceMappingURL=wallet.js.map