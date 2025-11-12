import { DemandSideAgent, DemandAgentConfig, AgentExecutionReport } from './demand-agent.js';
import { AgentTask } from './agent-brain.js';
import type { AgentResponse } from '@x402-upl/visa-tap-agent';
import { X402RegistryClient } from './x402-registry-client.js';
export interface TAPCDPAgentConfig extends DemandAgentConfig {
    tap: {
        registryUrl?: string;
        name: string;
        domain: string;
        description?: string;
        contactEmail?: string;
        algorithm?: 'ed25519' | 'rsa-pss-sha256';
    };
    x402: {
        registryUrl?: string;
    };
    ownerDID: string;
    solanaRpcUrl: string;
}
export declare class TAPCDPAgent extends DemandSideAgent {
    private tapAgent;
    private tapConfig;
    private ownerDID;
    private tapRegistered;
    private fullConfig;
    private registryClient;
    private cdpWallet;
    constructor(config: TAPCDPAgentConfig);
    initialize(): Promise<string>;
    private registerWithTAP;
    private syncRegistryServices;
    executeTaskWithTAP(task: AgentTask): Promise<AgentExecutionReport>;
    callServiceWithTAP(url: string, options?: {
        tag?: 'agent-browser-auth' | 'agent-payer-auth';
        method?: 'GET' | 'POST';
        data?: any;
    }): Promise<any>;
    discoverX402Services(query: {
        category?: string;
        maxPrice?: number;
        minReputation?: number;
        limit?: number;
    }): Promise<any[]>;
    getTAPIdentity(): {
        keyId: string;
        algorithm: string;
        publicKey: string;
        agent: AgentResponse | null;
    } | null;
    isTAPRegistered(): boolean;
    exportTAPPrivateKey(): string | null;
    getRegistryClient(): X402RegistryClient | null;
    static loadFromTAPRegistry(config: TAPCDPAgentConfig, tapPrivateKey: string, tapKeyId: string): Promise<TAPCDPAgent>;
}
//# sourceMappingURL=tap-cdp-agent.d.ts.map