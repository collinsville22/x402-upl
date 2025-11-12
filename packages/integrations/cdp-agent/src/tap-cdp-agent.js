import { DemandSideAgent } from './demand-agent.js';
import { VisaTAPAgent } from '@x402-upl/visa-tap-agent';
import { Keypair } from '@solana/web3.js';
import { X402RegistryClient } from './x402-registry-client.js';
export class TAPCDPAgent extends DemandSideAgent {
    tapAgent = null;
    tapConfig;
    ownerDID;
    tapRegistered = false;
    fullConfig;
    registryClient = null;
    cdpWallet = null;
    constructor(config) {
        super(config);
        this.tapConfig = config.tap;
        this.ownerDID = config.ownerDID;
        this.fullConfig = config;
        // Initialize x402 Registry client if configured
        if (config.x402?.registryUrl) {
            this.registryClient = new X402RegistryClient(config.x402.registryUrl);
        }
    }
    async initialize() {
        // First, initialize the CDP account
        const cdpAddress = await super.initialize();
        // Create a keypair for TAP (using CDP address as seed for consistency)
        // Note: In production, you might want to derive this differently
        const seed = Buffer.from(cdpAddress.slice(0, 32));
        this.cdpWallet = Keypair.fromSeed(seed);
        // Register with TAP
        await this.registerWithTAP();
        // Discover services from x402 Registry if available
        if (this.registryClient) {
            await this.syncRegistryServices();
        }
        return cdpAddress;
    }
    async registerWithTAP() {
        try {
            if (!this.cdpWallet) {
                throw new Error('CDP wallet not initialized');
            }
            this.tapAgent = await VisaTAPAgent.create({
                name: this.tapConfig.name,
                domain: this.tapConfig.domain,
                description: this.tapConfig.description || `CDP Demand Agent - ${this.tapConfig.name}`,
                contactEmail: this.tapConfig.contactEmail,
                algorithm: this.tapConfig.algorithm || 'ed25519',
                registryUrl: this.tapConfig.registryUrl || 'http://localhost:8001',
                solanaRpc: this.fullConfig.solanaRpcUrl,
                phantom: {
                    publicKey: this.cdpWallet.publicKey,
                    signTransaction: async (tx) => {
                        tx.partialSign(this.cdpWallet);
                        return tx;
                    },
                    signAllTransactions: async (txs) => {
                        txs.forEach(tx => tx.partialSign(this.cdpWallet));
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
    async syncRegistryServices() {
        if (!this.registryClient)
            return;
        try {
            const services = await this.registryClient.discoverServices({
                limit: 100,
                sortBy: 'reputation',
            });
            // Convert x402 services to tool metadata format
            for (const service of services) {
                const tool = {
                    toolId: service.id,
                    name: service.name,
                    description: service.description,
                    category: service.category,
                    costLamports: Math.floor(service.pricePerCall * 1_000_000_000), // Convert to lamports
                    paymentAddress: service.ownerWalletAddress,
                    endpoint: service.url,
                    method: 'POST',
                    parameters: {},
                };
                this.registerTool(tool);
            }
        }
        catch (error) {
            console.warn('Failed to sync registry services:', error);
        }
    }
    async executeTaskWithTAP(task) {
        if (!this.tapRegistered) {
            throw new Error('TAP not registered. Call initialize() first.');
        }
        return await this.executeTask(task);
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
    async discoverX402Services(query) {
        if (!this.registryClient) {
            throw new Error('x402 Registry not configured');
        }
        return await this.registryClient.discoverServices(query);
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
    getRegistryClient() {
        return this.registryClient;
    }
    static async loadFromTAPRegistry(config, tapPrivateKey, tapKeyId) {
        const agent = new TAPCDPAgent(config);
        const cdpAddress = await agent.initialize();
        // Load existing TAP identity
        const algorithm = config.tap.algorithm || 'ed25519';
        const privateKey = VisaTAPAgent.importPrivateKey(tapPrivateKey, algorithm);
        const seed = Buffer.from(cdpAddress.slice(0, 32));
        agent.cdpWallet = Keypair.fromSeed(seed);
        agent.tapAgent = await VisaTAPAgent.loadFromRegistry({
            name: config.tap.name,
            domain: config.tap.domain,
            description: config.tap.description,
            contactEmail: config.tap.contactEmail,
            algorithm,
            registryUrl: config.tap.registryUrl || 'http://localhost:8001',
            solanaRpc: config.solanaRpcUrl,
            phantom: {
                publicKey: agent.cdpWallet.publicKey,
                signTransaction: async (tx) => {
                    tx.partialSign(agent.cdpWallet);
                    return tx;
                },
                signAllTransactions: async (txs) => {
                    txs.forEach(tx => tx.partialSign(agent.cdpWallet));
                    return txs;
                },
            },
        }, privateKey, tapKeyId);
        agent.tapRegistered = true;
        return agent;
    }
}
//# sourceMappingURL=tap-cdp-agent.js.map