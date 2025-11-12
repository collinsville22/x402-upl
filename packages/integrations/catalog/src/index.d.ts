import { DarkResearchClient } from '@x402-upl/integration-dark/client';
import { TritonClient } from '@x402-upl/integration-triton/client';
import { GradientClient } from '@x402-upl/integration-gradient/client';
import { OM1Client } from '@x402-upl/integration-om1/client';
export interface SponsorServiceConfig {
    dark?: {
        apiKey: string;
        pricePerCall: number;
    };
    triton?: {
        apiKey: string;
        pricePerCall: number;
    };
    gradient?: {
        apiKey: string;
        pricePerCall: number;
    };
    om1?: {
        apiKey: string;
        pricePerCall: number;
    };
    solana: {
        network: 'mainnet-beta' | 'devnet' | 'testnet';
        rpcUrl: string;
        recipientAddress: string;
    };
}
export interface ServiceDefinition {
    id: string;
    name: string;
    description: string;
    category: string;
    sponsor: 'dark' | 'triton' | 'gradient' | 'om1';
    pricePerCall: number;
    capabilities: string[];
    inputSchema: Record<string, unknown>;
}
export declare class SponsorServiceCatalog {
    private darkClient?;
    private tritonClient?;
    private gradientClient?;
    private om1Client?;
    private config;
    constructor(config: SponsorServiceConfig);
    getServiceCatalog(): ServiceDefinition[];
    executeService(serviceId: string, params: unknown): Promise<unknown>;
    getDarkClient(): DarkResearchClient | undefined;
    getTritonClient(): TritonClient | undefined;
    getGradientClient(): GradientClient | undefined;
    getOM1Client(): OM1Client | undefined;
}
//# sourceMappingURL=index.d.ts.map