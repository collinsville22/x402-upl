import { EventEmitter } from 'events';
import { Keypair } from '@solana/web3.js';
import { AgentExecutionResult } from './brain.js';
import { BaseTool } from './tools/index.js';
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
export declare class X402ParallaxAgent extends EventEmitter {
    private parallaxClient;
    private clusterManager;
    private serviceDiscovery;
    private x402Client;
    private brain;
    private config;
    private isInitialized;
    constructor(config: X402ParallaxAgentConfig);
    private setupEventForwarding;
    initialize(): Promise<void>;
    run(task: string): Promise<AgentExecutionResult>;
    shutdown(): Promise<void>;
    getClusterStatus(): import("../parallax/cluster-manager.js").ClusterStatus;
    getEconomicMetrics(): import("@x402-upl/sdk").PaymentMetrics;
    getWalletBalance(currency?: string): Promise<number>;
    getRemainingBudget(): number;
    getAgentState(): import("./brain.js").AgentState;
    getPaymentHistory(limit?: number): import("@x402-upl/sdk").PaymentRecord[];
    getWalletAddress(): string;
}
//# sourceMappingURL=x402-agent.d.ts.map