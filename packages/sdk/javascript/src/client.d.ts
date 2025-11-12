import { Connection, Keypair } from '@solana/web3.js';
import { X402Service, DiscoverOptions } from './service-discovery.js';
import { TAPClient, TAPConfig, AgentIdentity } from './tap/tap-client.js';
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
export { SolanaX402Client, SolanaX402Config, PaymentMetrics, PaymentRecord, CASH_MINT, } from './solana-x402-client.js';
export { ServiceDiscovery, X402Service, DiscoverOptions, } from './service-discovery.js';
export type { PaymentPayload, PaymentRequirements } from './solana-x402-client.js';
export { TAPClient, TAPConfig, AgentIdentity } from './tap/tap-client.js';
export { RFC9421Signature, SignatureAlgorithm } from './tap/rfc9421.js';
export declare class X402Client {
    private solanaClient;
    private discovery;
    private config;
    private tapClient?;
    constructor(config: X402ClientConfig);
    discover(options?: DiscoverOptions): Promise<X402Service[]>;
    getService(serviceId: string): Promise<X402Service>;
    get<T = any>(url: string, params?: Record<string, any>): Promise<T>;
    post<T = any>(url: string, data?: any, params?: Record<string, any>): Promise<T>;
    payAndFetch(serviceUrl: string, params?: unknown): Promise<unknown>;
    getConnection(): Connection;
    getWallet(): Keypair;
    getNetwork(): string;
    registerService(service: ServiceRegistration): Promise<X402Service>;
    getCategories(): Promise<string[]>;
    registerAgent(stake?: number): Promise<AgentIdentity>;
    discoverAgents(filters?: {
        category?: string;
        minReputation?: number;
        verified?: boolean;
    }): Promise<AgentIdentity[]>;
    getAgentIdentity(): AgentIdentity | undefined;
    getTAPClient(): TAPClient | undefined;
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
//# sourceMappingURL=client.d.ts.map