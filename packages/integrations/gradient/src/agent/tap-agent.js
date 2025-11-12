"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TAPEnabledGradientAgent = void 0;
const x402_agent_js_1 = require("./x402-agent.js");
const visa_tap_agent_1 = require("@x402-upl/visa-tap-agent");
class TAPEnabledGradientAgent extends x402_agent_js_1.X402ParallaxAgent {
    tapAgent = null;
    tapConfig;
    ownerDID;
    tapRegistered = false;
    constructor(config) {
        super(config);
        this.tapConfig = config.tap;
        this.ownerDID = config.ownerDID;
    }
    async initialize() {
        await this.registerWithTAP();
        await super.initialize();
    }
    async registerWithTAP() {
        try {
            this.tapAgent = await visa_tap_agent_1.VisaTAPAgent.create({
                name: this.tapConfig.name,
                domain: this.tapConfig.domain,
                description: this.tapConfig.description || `Gradient Parallax Agent - ${this.tapConfig.name}`,
                contactEmail: this.tapConfig.contactEmail,
                algorithm: this.tapConfig.algorithm || 'ed25519',
                registryUrl: this.tapConfig.registryUrl || 'http://localhost:8001',
                solanaRpc: this.config.solana.rpcUrl,
                phantom: {
                    publicKey: this.config.solana.wallet.publicKey,
                    signTransaction: async (tx) => {
                        tx.partialSign(this.config.solana.wallet);
                        return tx;
                    },
                    signAllTransactions: async (txs) => {
                        txs.forEach(tx => tx.partialSign(this.config.solana.wallet));
                        return txs;
                    },
                },
            });
            this.tapRegistered = true;
            this.emit('tap:registered', {
                keyId: this.tapAgent.getKeyId(),
                algorithm: this.tapAgent.getAlgorithm(),
                agentInfo: this.tapAgent.getAgent(),
            });
        }
        catch (error) {
            this.emit('tap:error', {
                error: error instanceof Error ? error.message : 'Unknown error',
                phase: 'registration',
            });
            throw error;
        }
    }
    async callServiceWithTAP(url, options) {
        if (!this.tapAgent) {
            throw new Error('TAP agent not initialized. Call initialize() first.');
        }
        try {
            const result = await this.tapAgent.makeX402Request(url, {
                tag: options?.tag || 'agent-browser-auth',
            });
            this.emit('tap:request:success', {
                url,
                tag: options?.tag || 'agent-browser-auth',
            });
            return result;
        }
        catch (error) {
            this.emit('tap:request:error', {
                url,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async executeTaskWithTAP(task) {
        if (!this.tapRegistered) {
            throw new Error('TAP not registered. Call initialize() first.');
        }
        const result = await this.executeTask(task);
        this.emit('tap:task:completed', {
            task,
            tapKeyId: this.tapAgent?.getKeyId(),
        });
        return result;
    }
    getTAPIdentity() {
        if (!this.tapAgent)
            return null;
        return {
            keyId: this.tapAgent.getKeyId(),
            algorithm: this.tapAgent.getAlgorithm(),
            publicKey: this.tapAgent.getPublicKey(),
            agent: this.tapAgent.getAgent(),
        };
    }
    isTAPRegistered() {
        return this.tapRegistered;
    }
    exportTAPPrivateKey() {
        if (!this.tapAgent)
            return null;
        return this.tapAgent.exportPrivateKey();
    }
    static async loadFromTAPRegistry(config, tapPrivateKey, tapKeyId) {
        const agent = new TAPEnabledGradientAgent(config);
        const algorithm = config.tap.algorithm || 'ed25519';
        const privateKey = visa_tap_agent_1.VisaTAPAgent.importPrivateKey(tapPrivateKey, algorithm);
        agent.tapAgent = await visa_tap_agent_1.VisaTAPAgent.loadFromRegistry({
            name: config.tap.name,
            domain: config.tap.domain,
            description: config.tap.description,
            contactEmail: config.tap.contactEmail,
            algorithm,
            registryUrl: config.tap.registryUrl || 'http://localhost:8001',
            solanaRpc: config.solana.rpcUrl,
            phantom: {
                publicKey: config.solana.wallet.publicKey,
                signTransaction: async (tx) => {
                    tx.partialSign(config.solana.wallet);
                    return tx;
                },
                signAllTransactions: async (txs) => {
                    txs.forEach(tx => tx.partialSign(config.solana.wallet));
                    return txs;
                },
            },
        }, privateKey, tapKeyId);
        agent.tapRegistered = true;
        await agent.initialize();
        return agent;
    }
}
exports.TAPEnabledGradientAgent = TAPEnabledGradientAgent;
//# sourceMappingURL=tap-agent.js.map