import { PhantomAgent, PhantomAgentConfig, AgentExecutionReport } from './phantom-agent.js';
import type { AgentResponse } from '@x402-upl/visa-tap-agent';
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
export declare class TAPPhantomAgent extends PhantomAgent {
    private tapAgent;
    private tapConfig;
    private ownerDID;
    private tapRegistered;
    private config;
    constructor(config: TAPPhantomAgentConfig);
    initialize(): Promise<void>;
    private registerWithTAP;
    executeTaskWithTAP(task: string): Promise<AgentExecutionReport>;
    callServiceWithTAP(url: string, options?: {
        tag?: 'agent-browser-auth' | 'agent-payer-auth';
        method?: 'GET' | 'POST';
        data?: any;
    }): Promise<any>;
    getTAPIdentity(): {
        keyId: string;
        algorithm: string;
        publicKey: string;
        agent: AgentResponse | null;
    } | null;
    isTAPRegistered(): boolean;
    exportTAPPrivateKey(): string | null;
    static loadFromTAPRegistry(config: TAPPhantomAgentConfig, tapPrivateKey: string, tapKeyId: string): Promise<TAPPhantomAgent>;
}
//# sourceMappingURL=tap-phantom-agent.d.ts.map