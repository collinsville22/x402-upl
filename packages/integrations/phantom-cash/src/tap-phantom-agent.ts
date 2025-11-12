import { Keypair } from '@solana/web3.js';
import { PhantomAgent, PhantomAgentConfig, AgentExecutionReport } from './phantom-agent.js';
import { VisaTAPAgent } from '@x402-upl/visa-tap-agent';
import type { AgentResponse } from '@x402-upl/visa-tap-agent';
import { AgentTask } from './agent-brain.js';

export interface TAPPhantomAgentConfig extends PhantomAgentConfig {
  tap: {
    registryUrl?: string;
    name: string;
    domain: string;
    description?: string;
    contactEmail?: string;
    algorithm?: 'ed25519' | 'rsa-pss-sha256';
  };
  ownerDID: string;
}

export class TAPPhantomAgent extends PhantomAgent {
  private tapAgent: VisaTAPAgent | null = null;
  private tapConfig: TAPPhantomAgentConfig['tap'];
  private ownerDID: string;
  private tapRegistered: boolean = false;
  private config: TAPPhantomAgentConfig;

  constructor(config: TAPPhantomAgentConfig) {
    super(config);
    this.tapConfig = config.tap;
    this.ownerDID = config.ownerDID;
    this.config = config;
  }

  async initialize(): Promise<void> {
    await this.registerWithTAP();
  }

  private async registerWithTAP(): Promise<void> {
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
    } catch (error) {
      throw new Error(`TAP registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async executeTaskWithTAP(task: string): Promise<AgentExecutionReport> {
    if (!this.tapRegistered) {
      throw new Error('TAP not registered. Call initialize() first.');
    }

    const agentTask: AgentTask = {
      description: task,
      constraints: {
        maxBudget: this.getRemainingHourlyBudget(),
        allowedCategories: ['all'],
      },
    };

    return await this.executeTask(agentTask);
  }

  async callServiceWithTAP(url: string, options?: {
    tag?: 'agent-browser-auth' | 'agent-payer-auth';
    method?: 'GET' | 'POST';
    data?: any;
  }): Promise<any> {
    if (!this.tapAgent) {
      throw new Error('TAP agent not initialized. Call initialize() first.');
    }

    try {
      if (options?.method === 'POST' && options.data) {
        return await this.tapAgent.makeX402Post(url, options.data, {
          tag: options?.tag || 'agent-browser-auth',
        });
      } else {
        return await this.tapAgent.makeX402Request(url, {
          tag: options?.tag || 'agent-browser-auth',
        });
      }
    } catch (error) {
      throw error;
    }
  }

  getTAPIdentity(): {
    keyId: string;
    algorithm: string;
    publicKey: string;
    agent: AgentResponse | null;
  } | null {
    if (!this.tapAgent) return null;

    return {
      keyId: this.tapAgent.getKeyId(),
      algorithm: this.tapAgent.getAlgorithm(),
      publicKey: this.tapAgent.getPublicKey(),
      agent: this.tapAgent.getAgent(),
    };
  }

  isTAPRegistered(): boolean {
    return this.tapRegistered;
  }

  exportTAPPrivateKey(): string | null {
    if (!this.tapAgent) return null;
    return this.tapAgent.exportPrivateKey();
  }

  static async loadFromTAPRegistry(
    config: TAPPhantomAgentConfig,
    tapPrivateKey: string,
    tapKeyId: string
  ): Promise<TAPPhantomAgent> {
    const agent = new TAPPhantomAgent(config);

    const algorithm = config.tap.algorithm || 'ed25519';
    const privateKey = VisaTAPAgent.importPrivateKey(tapPrivateKey, algorithm);

    agent.tapAgent = await VisaTAPAgent.loadFromRegistry(
      {
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
      },
      privateKey,
      tapKeyId
    );

    agent.tapRegistered = true;

    return agent;
  }
}
