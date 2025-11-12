import { EventEmitter } from 'events';
import { Keypair } from '@solana/web3.js';
import { ParallaxX402Client } from '../parallax/x402-client.js';
import { ClusterManager } from '../parallax/cluster-manager.js';
import { ServiceDiscovery } from '../x402/discovery.js';
import { SolanaX402Client } from '@x402-upl/sdk';
import { AgentBrain, AgentExecutionResult } from './brain.js';
import {
  ParallaxInferenceTool,
  ServiceDiscoveryTool,
  WalletInfoTool,
  BaseTool,
} from './tools/index.js';
import { AgentConfig, ParallaxClusterConfig } from '../types/index.js';

export interface X402ParallaxAgentConfig {
  parallax: ParallaxClusterConfig;
  solana: {
    rpcUrl: string;
    wallet: Keypair;
    network: 'mainnet-beta' | 'devnet' | 'testnet';
  };
  x402: {
    registryUrl: string;
    facilitatorUrl?: string;
    spendingLimitPerHour?: number;
    reserveMinimum?: number;
  };
  agent: AgentConfig;
  customTools?: BaseTool[];
}

export class X402ParallaxAgent extends EventEmitter {
  private parallaxClient: ParallaxX402Client;
  private clusterManager: ClusterManager;
  private serviceDiscovery: ServiceDiscovery;
  private x402Client: SolanaX402Client;
  private brain: AgentBrain;
  private config: X402ParallaxAgentConfig;
  private isInitialized: boolean = false;

  constructor(config: X402ParallaxAgentConfig) {
    super();
    this.config = config;

    this.x402Client = new SolanaX402Client({
      wallet: config.solana.wallet,
      network: config.solana.network,
      rpcUrl: config.solana.rpcUrl,
      facilitatorUrl: config.x402.facilitatorUrl,
    });

    this.parallaxClient = new ParallaxX402Client({
      schedulerUrl: config.parallax.schedulerUrl,
      x402Client: this.x402Client,
      model: config.parallax.model,
    });

    this.clusterManager = new ClusterManager(config.parallax);

    this.serviceDiscovery = new ServiceDiscovery({
      registryUrl: config.x402.registryUrl,
    });

    const tools: BaseTool[] = [
      new ParallaxInferenceTool(this.parallaxClient),
      new ServiceDiscoveryTool(this.serviceDiscovery),
      new WalletInfoTool(this.x402Client),
      ...(config.customTools || []),
    ];

    this.brain = new AgentBrain(this.parallaxClient, config.agent, tools);

    this.setupEventForwarding();
  }

  private setupEventForwarding(): void {
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

  async initialize(): Promise<void> {
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

  async run(task: string): Promise<AgentExecutionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await this.brain.executeTask(task);
  }

  async shutdown(): Promise<void> {
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

  async getWalletBalance(currency: string = 'SOL') {
    return await this.x402Client.getBalance(currency);
  }

  getRemainingBudget() {
    return this.x402Client.getRemainingHourlyBudget();
  }

  getAgentState() {
    return this.brain.getState();
  }

  getPaymentHistory(limit?: number) {
    return this.x402Client.getPaymentHistory(limit);
  }

  getWalletAddress(): string {
    return this.x402Client.getWalletAddress();
  }
}
