import { EventEmitter } from 'events';
import { SolanaX402Client } from '@x402-upl/sdk';
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionRequestSchema,
  ChatCompletionResponseSchema,
  InferenceMetrics,
} from '../types/index.js';

export interface ParallaxX402ClientConfig {
  schedulerUrl: string;
  x402Client: SolanaX402Client;
  model?: string;
  timeout?: number;
}

export class ParallaxX402Client extends EventEmitter {
  private schedulerUrl: string;
  private x402Client: SolanaX402Client;
  private model: string;
  private timeout: number;
  private requestCounter: number = 0;

  constructor(config: ParallaxX402ClientConfig) {
    super();
    this.schedulerUrl = config.schedulerUrl.replace(/\/$/, '');
    this.x402Client = config.x402Client;
    this.model = config.model || 'default';
    this.timeout = config.timeout || 120000;
  }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const validatedRequest = ChatCompletionRequestSchema.parse({
      ...request,
      model: request.model || this.model,
    });

    const requestId = `req-${Date.now()}-${this.requestCounter++}`;
    const startTime = performance.now();

    try {
      const data = await this.x402Client.post<ChatCompletionResponse>(
        `${this.schedulerUrl}/v1/chat/completions`,
        validatedRequest
      );

      const validatedResponse = ChatCompletionResponseSchema.parse(data);

      const endTime = performance.now();
      const metrics: InferenceMetrics = {
        requestId,
        startTime,
        endTime,
        totalLatencyMs: endTime - startTime,
        promptTokens: validatedResponse.usage.prompt_tokens,
        completionTokens: validatedResponse.usage.completion_tokens,
        totalTokens: validatedResponse.usage.total_tokens,
        throughputTokensPerSec: (validatedResponse.usage.total_tokens / (endTime - startTime)) * 1000,
      };

      this.emit('inference:complete', metrics);

      return validatedResponse;
    } catch (error) {
      const endTime = performance.now();

      this.emit('inference:error', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        latencyMs: endTime - startTime,
      });

      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.x402Client.get(`${this.schedulerUrl}/health`);
      return response.status === 'ok' || response.status === 'healthy';
    } catch {
      return false;
    }
  }
}
