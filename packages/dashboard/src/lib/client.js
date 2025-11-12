"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
exports.useClient = useClient;
const sdk_1 = require("@x402-upl/sdk");
const wallet_1 = require("@/store/wallet");
const network_1 = require("@/store/network");
function createClient() {
    const wallet = wallet_1.useWalletStore.getState().getKeypair();
    const network = network_1.useNetworkStore.getState().network;
    const rpcUrl = network_1.useNetworkStore.getState().getDefaultRpcUrl();
    const registryApiUrl = network_1.useNetworkStore.getState().getDefaultRegistryApiUrl();
    const config = {
        network,
        rpcUrl,
        registryApiUrl,
        wallet: wallet || undefined,
    };
    return new sdk_1.X402Client(config);
}
function useClient() {
    return createClient();
}
//# sourceMappingURL=client.js.map