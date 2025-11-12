import { EventEmitter } from 'events';
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionRequestSchema,
  ChatCompletionResponseSchema,
  InferenceMetrics,
} from '../types/index.js';

export interface ParallaxClientConfig {
  schedulerUrl: string;
  model?: string;
  timeout?: number;
}

export class ParallaxClient extends EventEmitter {
  private schedulerUrl: string;
  private model: string;
  private timeout: number;
  private requestCounter: number = 0;

  constructor(config: ParallaxClientConfig) {
    super();
    this.schedulerUrl = config.schedulerUrl.replace(/\/$/, '');
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.schedulerUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Parallax API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
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

  async streamChatCompletion(
    request: ChatCompletionRequest,
    onChunk: (chunk: string) => void,
    onMetrics?: (metrics: Partial<InferenceMetrics>) => void
  ): Promise<void> {
    const validatedRequest = ChatCompletionRequestSchema.parse({
      ...request,
      model: request.model || this.model,
      stream: true,
    });

    const requestId = `req-${Date.now()}-${this.requestCounter++}`;
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    let completionTokens = 0;
    let promptTokens = 0;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.schedulerUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Parallax API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            const endTime = performance.now();
            const metrics: InferenceMetrics = {
              requestId,
              startTime,
              endTime,
              totalLatencyMs: endTime - startTime,
              ttftMs: firstTokenTime ? firstTokenTime - startTime : undefined,
              promptTokens,
              completionTokens,
              totalTokens: promptTokens + completionTokens,
              throughputTokensPerSec: (completionTokens / (endTime - (firstTokenTime || startTime))) * 1000,
            };
            this.emit('inference:complete', metrics);
            if (onMetrics) onMetrics(metrics);
            return;
          }

          try {
            const parsed = JSON.parse(data);

            if (parsed.choices?.[0]?.delta?.content) {
              if (firstTokenTime === null) {
                firstTokenTime = performance.now();
              }
              completionTokens++;
              onChunk(parsed.choices[0].delta.content);
            }

            if (parsed.usage) {
              promptTokens = parsed.usage.prompt_tokens || 0;
              completionTokens = parsed.usage.completion_tokens || completionTokens;
            }
          } catch {
            continue;
          }
        }
      }
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.schedulerUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  getSchedulerUrl(): string {
    return this.schedulerUrl;
  }

  getModel(): string {
    return this.model;
  }
}
