"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.X402ParallaxAgent = void 0;
const events_1 = require("events");
const x402_client_js_1 = require("../parallax/x402-client.js");
const cluster_manager_js_1 = require("../parallax/cluster-manager.js");
const discovery_js_1 = require("../x402/discovery.js");
const sdk_1 = require("@x402-upl/sdk");
const brain_js_1 = require("./brain.js");
const index_js_1 = require("./tools/index.js");
class X402ParallaxAgent extends events_1.EventEmitter {
    parallaxClient;
    clusterManager;
    serviceDiscovery;
    x402Client;
    brain;
    config;
    isInitialized = false;
    constructor(config) {
        super();
        this.config = config;
        this.x402Client = new sdk_1.SolanaX402Client({
            wallet: config.solana.wallet,
            network: config.solana.network,
            rpcUrl: config.solana.rpcUrl,
            facilitatorUrl: config.x402.facilitatorUrl,
        });
        this.parallaxClient = new x402_client_js_1.ParallaxX402Client({
            schedulerUrl: config.parallax.schedulerUrl,
            x402Client: this.x402Client,
            model: config.parallax.model,
        });
        this.clusterManager = new cluster_manager_js_1.ClusterManager(config.parallax);
        this.serviceDiscovery = new discovery_js_1.ServiceDiscovery({
            registryUrl: config.x402.registryUrl,
        });
        const tools = [
            new index_js_1.ParallaxInferenceTool(this.parallaxClient),
            new index_js_1.ServiceDiscoveryTool(this.serviceDiscovery),
            new index_js_1.WalletInfoTool(this.x402Client),
            ...(config.customTools || []),
        ];
        this.brain = new brain_js_1.AgentBrain(this.parallaxClient, config.agent, tools);
        this.setupEventForwarding();
    }
    setupEventForwarding() {
        this.parallaxClient.on('inference:complete', (data) => this.emit('inference:complete', data));
        this.parallaxClient.on('inference:error', (data) => this.emit('inference:error', data));
        this.clusterManager.on('cluster:operational', () => this.emit('cluster:operational'));
        this.clusterManager.on('cluster:error', (data) => this.emit('cluster:error', data));
        this.clusterManager.on('node:ready', (data) => this.emit('node:ready', data));
        this.clusterManager.on('node:error', (data) => this.emit('node:error', data));
        this.serviceDiscovery.on('discovery:success', (data) => this.emit('discovery:success', data));
        this.serviceDiscovery.on('discovery:error', (data) => this.emit('discovery:error', data));
        this.x402Client.on('payment:success', (data) => this.emit('payment:success', data));
        this.x402Client.on('payment:error', (data) => this.emit('payment:error', data));
        this.x402Client.on('earnings:recorded', (data) => this.emit('earnings:recorded', data));
        this.brain.on('task:started', (data) => this.emit('task:started', data));
        this.brain.on('task:completed', (data) => this.emit('task:completed', data));
        this.brain.on('task:error', (data) => this.emit('task:error', data));
        this.brain.on('iteration:start', (data) => this.emit('iteration:start', data));
        this.brain.on('iteration:complete', (data) => this.emit('iteration:complete', data));
        this.brain.on('tool:executing', (data) => this.emit('tool:executing', data));
        this.brain.on('tool:executed', (data) => this.emit('tool:executed', data));
    }
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        this.emit('agent:initializing');
        await this.clusterManager.start();
        const isOperational = await this.clusterManager.waitUntilOperational(60000);
        if (!isOperational) {
            throw new Error('Parallax cluster failed to become operational within timeout');
        }
        const healthOk = await this.parallaxClient.healthCheck();
        if (!healthOk) {
            throw new Error('Parallax scheduler health check failed');
        }
        this.isInitialized = true;
        this.emit('agent:initialized');
    }
    async run(task) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return await this.brain.executeTask(task);
    }
    async shutdown() {
        await this.clusterManager.stop();
        this.isInitialized = false;
        this.emit('agent:shutdown');
    }
    getClusterStatus() {
        return this.clusterManager.getStatus();
    }
    getEconomicMetrics() {
        return this.x402Client.getMetrics();
    }
    async getWalletBalance(currency = 'SOL') {
        return await this.x402Client.getBalance(currency);
    }
    getRemainingBudget() {
        return this.x402Client.getRemainingHourlyBudget();
    }
    getAgentState() {
        return this.brain.getState();
    }
    getPaymentHistory(limit) {
        return this.x402Client.getPaymentHistory(limit);
    }
    getWalletAddress() {
        return this.x402Client.getWalletAddress();
    }
}
exports.X402ParallaxAgent = X402ParallaxAgent;
//# sourceMappingURL=x402-agent.js.map