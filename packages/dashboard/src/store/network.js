"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useNetworkStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
exports.useNetworkStore = (0, zustand_1.create)()((0, middleware_1.persist)((set, get) => ({
    network: 'devnet',
    rpcUrl: null,
    registryApiUrl: null,
    setNetwork: (network) => {
        set({ network });
    },
    setRpcUrl: (url) => {
        set({ rpcUrl: url });
    },
    setRegistryApiUrl: (url) => {
        set({ registryApiUrl: url });
    },
    getDefaultRpcUrl: () => {
        const { network, rpcUrl } = get();
        if (rpcUrl)
            return rpcUrl;
        return network === 'mainnet-beta'
            ? 'https://api.mainnet-beta.solana.com'
            : 'https://api.devnet.solana.com';
    },
    getDefaultRegistryApiUrl: () => {
        const { network, registryApiUrl } = get();
        if (registryApiUrl)
            return registryApiUrl;
        return network === 'mainnet-beta'
            ? 'https://api.x402-upl.network'
            : 'https://api-dev.x402-upl.network';
    },
}), {
    name: 'x402-network-storage',
}));
//# sourceMappingURL=network.js.map