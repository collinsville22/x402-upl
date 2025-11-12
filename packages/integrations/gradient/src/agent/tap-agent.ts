import { Keypair } from '@solana/web3.js';
import { X402ParallaxAgent, X402ParallaxAgentConfig } from './x402-agent.js';
import { VisaTAPAgent } from '@x402-upl/visa-tap-agent';
import type { AgentResponse } from '@x402-upl/visa-tap-agent';

export interface TAPEnabledAgentConfig extends X402ParallaxAgentConfig {
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

export class TAPEnabledGradientAgent extends X402ParallaxAgent {
  private tapAgent: VisaTAPAgent | null = null;
  private tapConfig: TAPEnabledAgentConfig['tap'];
  private ownerDID: string;
  private tapRegistered: boolean = false;

  constructor(config: TAPEnabledAgentConfig) {
    super(config);
    this.tapConfig = config.tap;
    this.ownerDID = config.ownerDID;
  }

  async initialize(): Promise<void> {
    await this.registerWithTAP();
    await super.initialize();
  }

  private async registerWithTAP(): Promise<void> {
    try {
      this.tapAgent = await VisaTAPAgent.create({
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
    } catch (error) {
      this.emit('tap:error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        phase: 'registration',
      });
      throw error;
    }
  }

  async callServiceWithTAP(url: string, options?: { tag?: 'agent-browser-auth' | 'agent-payer-auth' }): Promise<any> {
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
    } catch (error) {
      this.emit('tap:request:error', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async executeTaskWithTAP(task: string): Promise<any> {
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
    config: TAPEnabledAgentConfig,
    tapPrivateKey: string,
    tapKeyId: string
  ): Promise<TAPEnabledGradientAgent> {
    const agent = new TAPEnabledGradientAgent(config);

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
      },
      privateKey,
      tapKeyId
    );

    agent.tapRegistered = true;

    await agent.initialize();

    return agent;
  }
}
