import { X402ParallaxAgent, X402ParallaxAgentConfig } from './x402-agent.js';
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
export declare class TAPEnabledGradientAgent extends X402ParallaxAgent {
    private tapAgent;
    private tapConfig;
    private ownerDID;
    private tapRegistered;
    constructor(config: TAPEnabledAgentConfig);
    initialize(): Promise<void>;
    private registerWithTAP;
    callServiceWithTAP(url: string, options?: {
        tag?: 'agent-browser-auth' | 'agent-payer-auth';
    }): Promise<any>;
    executeTaskWithTAP(task: string): Promise<any>;
    getTAPIdentity(): {
        keyId: string;
        algorithm: string;
        publicKey: string;
        agent: AgentResponse | null;
    } | null;
    isTAPRegistered(): boolean;
    exportTAPPrivateKey(): string | null;
    static loadFromTAPRegistry(config: TAPEnabledAgentConfig, tapPrivateKey: string, tapKeyId: string): Promise<TAPEnabledGradientAgent>;
}
//# sourceMappingURL=tap-agent.d.ts.map