import { EventEmitter } from 'events';
import { ChatCompletionRequest, ChatCompletionResponse, InferenceMetrics } from '../types/index.js';
export interface ParallaxClientConfig {
    schedulerUrl: string;
    model?: string;
    timeout?: number;
}
export declare class ParallaxClient extends EventEmitter {
    private schedulerUrl;
    private model;
    private timeout;
    private requestCounter;
    constructor(config: ParallaxClientConfig);
    chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
    streamChatCompletion(request: ChatCompletionRequest, onChunk: (chunk: string) => void, onMetrics?: (metrics: Partial<InferenceMetrics>) => void): Promise<void>;
    healthCheck(): Promise<boolean>;
    getSchedulerUrl(): string;
    getModel(): string;
}
//# sourceMappingURL=client.d.ts.map