import { EventEmitter } from 'events';
import { SolanaX402Client } from '@x402-upl/sdk';
import { ChatCompletionRequest, ChatCompletionResponse } from '../types/index.js';
export interface ParallaxX402ClientConfig {
    schedulerUrl: string;
    x402Client: SolanaX402Client;
    model?: string;
    timeout?: number;
}
export declare class ParallaxX402Client extends EventEmitter {
    private schedulerUrl;
    private x402Client;
    private model;
    private timeout;
    private requestCounter;
    constructor(config: ParallaxX402ClientConfig);
    chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
    healthCheck(): Promise<boolean>;
}
//# sourceMappingURL=x402-client.d.ts.map