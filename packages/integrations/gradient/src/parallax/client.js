"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParallaxClient = void 0;
const events_1 = require("events");
const index_js_1 = require("../types/index.js");
class ParallaxClient extends events_1.EventEmitter {
    schedulerUrl;
    model;
    timeout;
    requestCounter = 0;
    constructor(config) {
        super();
        this.schedulerUrl = config.schedulerUrl.replace(/\/$/, '');
        this.model = config.model || 'default';
        this.timeout = config.timeout || 120000;
    }
    async chatCompletion(request) {
        const validatedRequest = index_js_1.ChatCompletionRequestSchema.parse({
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
            const validatedResponse = index_js_1.ChatCompletionResponseSchema.parse(data);
            const endTime = performance.now();
            const metrics = {
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
        }
        catch (error) {
            const endTime = performance.now();
            this.emit('inference:error', {
                requestId,
                error: error instanceof Error ? error.message : String(error),
                latencyMs: endTime - startTime,
            });
            throw error;
        }
    }
    async streamChatCompletion(request, onChunk, onMetrics) {
        const validatedRequest = index_js_1.ChatCompletionRequestSchema.parse({
            ...request,
            model: request.model || this.model,
            stream: true,
        });
        const requestId = `req-${Date.now()}-${this.requestCounter++}`;
        const startTime = performance.now();
        let firstTokenTime = null;
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
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data: '))
                        continue;
                    const data = trimmed.slice(6);
                    if (data === '[DONE]') {
                        const endTime = performance.now();
                        const metrics = {
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
                        if (onMetrics)
                            onMetrics(metrics);
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
                    }
                    catch {
                        continue;
                    }
                }
            }
        }
        catch (error) {
            const endTime = performance.now();
            this.emit('inference:error', {
                requestId,
                error: error instanceof Error ? error.message : String(error),
                latencyMs: endTime - startTime,
            });
            throw error;
        }
    }
    async healthCheck() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(`${this.schedulerUrl}/health`, {
                method: 'GET',
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return response.ok;
        }
        catch {
            return false;
        }
    }
    getSchedulerUrl() {
        return this.schedulerUrl;
    }
    getModel() {
        return this.model;
    }
}
exports.ParallaxClient = ParallaxClient;
//# sourceMappingURL=client.js.map