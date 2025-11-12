import { PhantomAgent } from './phantom-agent.js';
import { VisaTAPAgent } from '@x402-upl/visa-tap-agent';
export class TAPPhantomAgent extends PhantomAgent {
    tapAgent = null;
    tapConfig;
    ownerDID;
    tapRegistered = false;
    config;
    constructor(config) {
        super(config);
        this.tapConfig = config.tap;
        this.ownerDID = config.ownerDID;
        this.config = config;
    }
    async initialize() {
        await this.registerWithTAP();
    }
    async registerWithTAP() {
        try {
            this.tapAgent = await VisaTAPAgent.create({
                name: this.tapConfig.name,
                domain: this.tapConfig.domain,
                description: this.tapConfig.description || `Phantom CASH Agent - ${this.tapConfig.name}`,
                contactEmail: this.tapConfig.contactEmail,
                algorithm: this.tapConfig.algorithm || 'ed25519',
                registryUrl: this.tapConfig.registryUrl || 'http://localhost:8001',
                solanaRpc: this.config.rpcUrl || 'https://api.mainnet-beta.solana.com',
                phantom: {
                    publicKey: this.config.wallet.publicKey,
                    signTransaction: async (tx) => {
                        tx.partialSign(this.config.wallet);
                        return tx;
                    },
                    signAllTransactions: async (txs) => {
                        txs.forEach(tx => tx.partialSign(this.config.wallet));
                        return txs;
                    },
                },
            });
            this.tapRegistered = true;
        }
        catch (error) {
            throw new Error(`TAP registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async executeTaskWithTAP(task) {
        if (!this.tapRegistered) {
            throw new Error('TAP not registered. Call initialize() first.');
        }
        const agentTask = {
            description: task,
            constraints: {
                maxBudget: this.getRemainingHourlyBudget(),
                allowedCategories: ['all'],
            },
        };
        return await this.executeTask(agentTask);
    }
    async callServiceWithTAP(url, options) {
        if (!this.tapAgent) {
            throw new Error('TAP agent not initialized. Call initialize() first.');
        }
        try {
            if (options?.method === 'POST' && options.data) {
                return await this.tapAgent.makeX402Post(url, options.data, {
                    tag: options?.tag || 'agent-browser-auth',
                });
            }
            else {
                return await this.tapAgent.makeX402Request(url, {
                    tag: options?.tag || 'agent-browser-auth',
                });
            }
        }
        catch (error) {
            throw error;
        }
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
        const agent = new TAPPhantomAgent(config);
        const algorithm = config.tap.algorithm || 'ed25519';
        const privateKey = VisaTAPAgent.importPrivateKey(tapPrivateKey, algorithm);
        agent.tapAgent = await VisaTAPAgent.loadFromRegistry({
            name: config.tap.name,
            domain: config.tap.domain,
            description: config.tap.description,
            contactEmail: config.tap.contactEmail,
            algorithm,
            registryUrl: config.tap.registryUrl || 'http://localhost:8001',
            solanaRpc: config.rpcUrl || 'https://api.mainnet-beta.solana.com',
            phantom: {
                publicKey: config.wallet.publicKey,
                signTransaction: async (tx) => {
                    tx.partialSign(config.wallet);
                    return tx;
                },
                signAllTransactions: async (txs) => {
                    txs.forEach(tx => tx.partialSign(config.wallet));
                    return txs;
                },
            },
        }, privateKey, tapKeyId);
        agent.tapRegistered = true;
        return agent;
    }
}
//# sourceMappingURL=tap-phantom-agent.js.map