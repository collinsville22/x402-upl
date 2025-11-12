"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const client_js_1 = require("../src/parallax/client.js");
(0, vitest_1.describe)('ParallaxClient Integration Tests', () => {
    let client;
    const schedulerUrl = process.env.PARALLAX_SCHEDULER_URL || 'http://localhost:3001';
    (0, vitest_1.beforeAll)(() => {
        client = new client_js_1.ParallaxClient({
            schedulerUrl,
            model: 'default',
            timeout: 30000,
        });
    });
    (0, vitest_1.describe)('Health Check', () => {
        (0, vitest_1.it)('should successfully check scheduler health', async () => {
            const isHealthy = await client.healthCheck();
            (0, vitest_1.expect)(isHealthy).toBe(true);
        });
    });
    (0, vitest_1.describe)('Chat Completion', () => {
        (0, vitest_1.it)('should complete a simple chat request', async () => {
            const response = await client.chatCompletion({
                model: 'default',
                messages: [
                    { role: 'user', content: 'What is 2+2? Answer with just the number.' },
                ],
                max_tokens: 10,
                temperature: 0.0,
            });
            (0, vitest_1.expect)(response).toBeDefined();
            (0, vitest_1.expect)(response.choices).toHaveLength(1);
            (0, vitest_1.expect)(response.choices[0].message.content).toBeDefined();
            (0, vitest_1.expect)(response.choices[0].message.role).toBe('assistant');
            (0, vitest_1.expect)(response.usage.total_tokens).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should handle system prompts', async () => {
            const response = await client.chatCompletion({
                model: 'default',
                messages: [
                    { role: 'system', content: 'You are a helpful math tutor.' },
                    { role: 'user', content: 'What is 5+3?' },
                ],
                max_tokens: 50,
            });
            (0, vitest_1.expect)(response.choices[0].message.content).toBeDefined();
            (0, vitest_1.expect)(response.choices[0].message.content.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should respect max_tokens parameter', async () => {
            const response = await client.chatCompletion({
                model: 'default',
                messages: [
                    { role: 'user', content: 'Write a long story.' },
                ],
                max_tokens: 20,
            });
            (0, vitest_1.expect)(response.usage.completion_tokens).toBeLessThanOrEqual(20);
        });
        (0, vitest_1.it)('should handle temperature parameter', async () => {
            const response = await client.chatCompletion({
                model: 'default',
                messages: [
                    { role: 'user', content: 'Say hello' },
                ],
                temperature: 0.0,
            });
            (0, vitest_1.expect)(response).toBeDefined();
        });
    });
    (0, vitest_1.describe)('Streaming Chat Completion', () => {
        (0, vitest_1.it)('should stream chat completion chunks', async () => {
            const chunks = [];
            let metricsReceived = false;
            await client.streamChatCompletion({
                model: 'default',
                messages: [
                    { role: 'user', content: 'Count to 5' },
                ],
                max_tokens: 50,
            }, (chunk) => {
                chunks.push(chunk);
            }, (metrics) => {
                (0, vitest_1.expect)(metrics.totalLatencyMs).toBeGreaterThan(0);
                (0, vitest_1.expect)(metrics.completionTokens).toBeGreaterThan(0);
                metricsReceived = true;
            });
            (0, vitest_1.expect)(chunks.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(metricsReceived).toBe(true);
            const fullText = chunks.join('');
            (0, vitest_1.expect)(fullText.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should emit inference:complete event', async () => {
            return new Promise((resolve) => {
                client.once('inference:complete', (metrics) => {
                    (0, vitest_1.expect)(metrics.requestId).toBeDefined();
                    (0, vitest_1.expect)(metrics.totalLatencyMs).toBeGreaterThan(0);
                    (0, vitest_1.expect)(metrics.throughputTokensPerSec).toBeGreaterThan(0);
                    resolve();
                });
                client.chatCompletion({
                    model: 'default',
                    messages: [{ role: 'user', content: 'Test' }],
                    max_tokens: 10,
                });
            });
        });
    });
    (0, vitest_1.describe)('Error Handling', () => {
        (0, vitest_1.it)('should handle invalid request gracefully', async () => {
            await (0, vitest_1.expect)(client.chatCompletion({
                model: 'default',
                messages: [],
                max_tokens: 10,
            })).rejects.toThrow();
        });
    });
    (0, vitest_1.describe)('Performance Metrics', () => {
        (0, vitest_1.it)('should track latency metrics', async () => {
            const start = performance.now();
            await client.chatCompletion({
                model: 'default',
                messages: [
                    { role: 'user', content: 'Hello' },
                ],
                max_tokens: 20,
            });
            const end = performance.now();
            const latency = end - start;
            (0, vitest_1.expect)(latency).toBeGreaterThan(0);
            (0, vitest_1.expect)(latency).toBeLessThan(30000);
        });
        (0, vitest_1.it)('should measure throughput', async () => {
            let throughput = 0;
            client.once('inference:complete', (metrics) => {
                throughput = metrics.throughputTokensPerSec;
            });
            await client.chatCompletion({
                model: 'default',
                messages: [
                    { role: 'user', content: 'Generate 100 tokens of text' },
                ],
                max_tokens: 100,
            });
            (0, vitest_1.expect)(throughput).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=parallax-client.test.js.map