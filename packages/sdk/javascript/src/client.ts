import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { SolanaX402Client, SolanaX402Config } from './solana-x402-client.js';
import { ServiceDiscovery, X402Service, DiscoverOptions } from './service-discovery.js';
import { TAPClient, TAPConfig, AgentIdentity } from './tap/tap-client.js';
import { SignatureAlgorithm } from './tap/rfc9421.js';

export interface X402ClientConfig {
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  rpcUrl?: string;
  registryApiUrl?: string;
  wallet: Keypair;
  agentIdentity?: AgentIdentity;
  facilitatorUrl?: string;
  enableTAP?: boolean;
  tapConfig?: TAPConfig;
  preferredTokens?: string[];
}

export {
  SolanaX402Client,
  SolanaX402Config,
  PaymentMetrics,
  PaymentRecord,
  CASH_MINT,
} from './solana-x402-client.js';
export {
  ServiceDiscovery,
  X402Service,
  DiscoverOptions,
} from './service-discovery.js';
export type { PaymentPayload, PaymentRequirements } from './solana-x402-client.js';
export { TAPClient, TAPConfig, AgentIdentity } from './tap/tap-client.js';
export { RFC9421Signature, SignatureAlgorithm } from './tap/rfc9421.js';

export class X402Client {
  private solanaClient: SolanaX402Client;
  private discovery: ServiceDiscovery;
  private config: X402ClientConfig;
  private tapClient?: TAPClient;

  constructor(config: X402ClientConfig) {
    this.config = config;

    this.solanaClient = new SolanaX402Client({
      network: config.network,
      rpcUrl: config.rpcUrl,
      wallet: config.wallet,
      facilitatorUrl: config.facilitatorUrl,
    });

    this.discovery = new ServiceDiscovery(config.registryApiUrl);

    if (config.enableTAP && config.tapConfig) {
      this.tapClient = new TAPClient(config.tapConfig, config.agentIdentity);
    }
  }

  async discover(options: DiscoverOptions = {}): Promise<X402Service[]> {
    return this.discovery.discover(options);
  }

  async getService(serviceId: string): Promise<X402Service> {
    return this.discovery.getService(serviceId);
  }

  async get<T = any>(url: string, params?: Record<string, any>): Promise<T> {
    return this.solanaClient.get<T>(url, params);
  }

  async post<T = any>(url: string, data?: any, params?: Record<string, any>): Promise<T> {
    return this.solanaClient.post<T>(url, data, params);
  }

  async payAndFetch(serviceUrl: string, params?: unknown): Promise<unknown> {
    return this.solanaClient.post(serviceUrl, params);
  }

  getConnection(): Connection {
    return this.solanaClient.getConnection();
  }

  getWallet(): Keypair {
    return this.solanaClient.getWallet();
  }

  getNetwork(): string {
    return this.config.network;
  }

  async registerService(service: ServiceRegistration): Promise<X402Service> {
    return this.discovery.registerService(service);
  }

  async getCategories(): Promise<string[]> {
    return this.discovery.getCategories();
  }

  async registerAgent(stake?: number): Promise<AgentIdentity> {
    if (!this.tapClient) {
      throw new Error('TAP must be enabled to register as an agent');
    }

    const walletAddress = this.config.wallet.publicKey.toBase58();
    return this.tapClient.registerAgent(walletAddress, stake);
  }

  async discoverAgents(filters?: {
    category?: string;
    minReputation?: number;
    verified?: boolean;
  }): Promise<AgentIdentity[]> {
    if (!this.tapClient) {
      throw new Error('TAP must be enabled to discover agents');
    }

    return this.tapClient.discoverAgents(filters);
  }

  getAgentIdentity(): AgentIdentity | undefined {
    return this.tapClient?.getAgentIdentity();
  }

  getTAPClient(): TAPClient | undefined {
    return this.tapClient;
  }
}

interface AgentMetadata {
  did?: string;
  visaTapCert?: string;
  metadataUri?: string;
}

interface AgentRegistration {
  id: string;
  walletAddress: string;
  reputationScore: number;
  createdAt: string;
}

interface AgentStats {
  totalTransactions: number;
  successfulTransactions: number;
  totalSpent: number;
  reputationScore: number;
  successRate: number;
}

interface ServiceRegistration {
  url: string;
  name: string;
  description: string;
  category: string;
  ownerWalletAddress: string;
  pricePerCall: number;
  acceptedTokens: string[];
  capabilities?: string[];
  tags?: string[];
}
