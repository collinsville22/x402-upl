"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParallaxX402Client = void 0;
const events_1 = require("events");
const index_js_1 = require("../types/index.js");
class ParallaxX402Client extends events_1.EventEmitter {
    schedulerUrl;
    x402Client;
    model;
    timeout;
    requestCounter = 0;
    constructor(config) {
        super();
        this.schedulerUrl = config.schedulerUrl.replace(/\/$/, '');
        this.x402Client = config.x402Client;
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
            const data = await this.x402Client.post(`${this.schedulerUrl}/v1/chat/completions`, validatedRequest);
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
    async healthCheck() {
        try {
            const response = await this.x402Client.get(`${this.schedulerUrl}/health`);
            return response.status === 'ok' || response.status === 'healthy';
        }
        catch {
            return false;
        }
    }
}
exports.ParallaxX402Client = ParallaxX402Client;
//# sourceMappingURL=x402-client.js.map