"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.X402Client = exports.RFC9421Signature = exports.TAPClient = exports.ServiceDiscovery = exports.CASH_MINT = exports.SolanaX402Client = void 0;
const solana_x402_client_js_1 = require("./solana-x402-client.js");
const service_discovery_js_1 = require("./service-discovery.js");
const tap_client_js_1 = require("./tap/tap-client.js");
var solana_x402_client_js_2 = require("./solana-x402-client.js");
Object.defineProperty(exports, "SolanaX402Client", { enumerable: true, get: function () { return solana_x402_client_js_2.SolanaX402Client; } });
Object.defineProperty(exports, "CASH_MINT", { enumerable: true, get: function () { return solana_x402_client_js_2.CASH_MINT; } });
var service_discovery_js_2 = require("./service-discovery.js");
Object.defineProperty(exports, "ServiceDiscovery", { enumerable: true, get: function () { return service_discovery_js_2.ServiceDiscovery; } });
var tap_client_js_2 = require("./tap/tap-client.js");
Object.defineProperty(exports, "TAPClient", { enumerable: true, get: function () { return tap_client_js_2.TAPClient; } });
var rfc9421_js_1 = require("./tap/rfc9421.js");
Object.defineProperty(exports, "RFC9421Signature", { enumerable: true, get: function () { return rfc9421_js_1.RFC9421Signature; } });
class X402Client {
    solanaClient;
    discovery;
    config;
    tapClient;
    constructor(config) {
        this.config = config;
        this.solanaClient = new solana_x402_client_js_1.SolanaX402Client({
            network: config.network,
            rpcUrl: config.rpcUrl,
            wallet: config.wallet,
            facilitatorUrl: config.facilitatorUrl,
        });
        this.discovery = new service_discovery_js_1.ServiceDiscovery(config.registryApiUrl);
        if (config.enableTAP && config.tapConfig) {
            this.tapClient = new tap_client_js_1.TAPClient(config.tapConfig, config.agentIdentity);
        }
    }
    async discover(options = {}) {
        return this.discovery.discover(options);
    }
    async getService(serviceId) {
        return this.discovery.getService(serviceId);
    }
    async get(url, params) {
        return this.solanaClient.get(url, params);
    }
    async post(url, data, params) {
        return this.solanaClient.post(url, data, params);
    }
    async payAndFetch(serviceUrl, params) {
        return this.solanaClient.post(serviceUrl, params);
    }
    getConnection() {
        return this.solanaClient.getConnection();
    }
    getWallet() {
        return this.solanaClient.getWallet();
    }
    getNetwork() {
        return this.config.network;
    }
    async registerService(service) {
        return this.discovery.registerService(service);
    }
    async getCategories() {
        return this.discovery.getCategories();
    }
    async registerAgent(stake) {
        if (!this.tapClient) {
            throw new Error('TAP must be enabled to register as an agent');
        }
        const walletAddress = this.config.wallet.publicKey.toBase58();
        return this.tapClient.registerAgent(walletAddress, stake);
    }
    async discoverAgents(filters) {
        if (!this.tapClient) {
            throw new Error('TAP must be enabled to discover agents');
        }
        return this.tapClient.discoverAgents(filters);
    }
    getAgentIdentity() {
        return this.tapClient?.getAgentIdentity();
    }
    getTAPClient() {
        return this.tapClient;
    }
}
exports.X402Client = X402Client;
//# sourceMappingURL=client.js.map