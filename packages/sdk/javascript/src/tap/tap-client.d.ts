import { SignatureAlgorithm } from './rfc9421.js';
export interface TAPConfig {
    keyId: string;
    privateKey: Uint8Array | string;
    algorithm: SignatureAlgorithm;
    registryUrl?: string;
    did?: string;
    visaTapCert?: string;
}
export interface AgentIdentity {
    did: string;
    visaTapCert: string;
    walletAddress: string;
    reputationScore?: number;
}
export declare class TAPClient {
    private config;
    private httpClient;
    private agentIdentity?;
    constructor(config: TAPConfig, agentIdentity?: AgentIdentity);
    signRequest(url: string, method?: 'GET' | 'POST'): Promise<Record<string, string>>;
    request<T = any>(method: 'GET' | 'POST', url: string, data?: any, params?: Record<string, any>): Promise<T>;
    registerAgent(walletAddress: string, stake?: number): Promise<AgentIdentity>;
    discoverAgents(filters?: {
        category?: string;
        minReputation?: number;
        verified?: boolean;
    }): Promise<AgentIdentity[]>;
    getAgentIdentity(): AgentIdentity | undefined;
    private getPublicKeyString;
}
//# sourceMappingURL=tap-client.d.ts.map