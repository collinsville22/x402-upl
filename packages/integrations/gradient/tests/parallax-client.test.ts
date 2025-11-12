import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ParallaxClient } from '../src/parallax/client.js';

describe('ParallaxClient Integration Tests', () => {
  let client: ParallaxClient;
  const schedulerUrl = process.env.PARALLAX_SCHEDULER_URL || 'http://localhost:3001';

  beforeAll(() => {
    client = new ParallaxClient({
      schedulerUrl,
      model: 'default',
      timeout: 30000,
    });
  });

  describe('Health Check', () => {
    it('should successfully check scheduler health', async () => {
      const isHealthy = await client.healthCheck();
      expect(isHealthy).toBe(true);
    });
  });

  describe('Chat Completion', () => {
    it('should complete a simple chat request', async () => {
      const response = await client.chatCompletion({
        model: 'default',
        messages: [
          { role: 'user', content: 'What is 2+2? Answer with just the number.' },
        ],
        max_tokens: 10,
        temperature: 0.0,
      });

      expect(response).toBeDefined();
      expect(response.choices).toHaveLength(1);
      expect(response.choices[0].message.content).toBeDefined();
      expect(response.choices[0].message.role).toBe('assistant');
      expect(response.usage.total_tokens).toBeGreaterThan(0);
    });

    it('should handle system prompts', async () => {
      const response = await client.chatCompletion({
        model: 'default',
        messages: [
          { role: 'system', content: 'You are a helpful math tutor.' },
          { role: 'user', content: 'What is 5+3?' },
        ],
        max_tokens: 50,
      });

      expect(response.choices[0].message.content).toBeDefined();
      expect(response.choices[0].message.content.length).toBeGreaterThan(0);
    });

    it('should respect max_tokens parameter', async () => {
      const response = await client.chatCompletion({
        model: 'default',
        messages: [
          { role: 'user', content: 'Write a long story.' },
        ],
        max_tokens: 20,
      });

      expect(response.usage.completion_tokens).toBeLessThanOrEqual(20);
    });

    it('should handle temperature parameter', async () => {
      const response = await client.chatCompletion({
        model: 'default',
        messages: [
          { role: 'user', content: 'Say hello' },
        ],
        temperature: 0.0,
      });

      expect(response).toBeDefined();
    });
  });

  describe('Streaming Chat Completion', () => {
    it('should stream chat completion chunks', async () => {
      const chunks: string[] = [];
      let metricsReceived = false;

      await client.streamChatCompletion(
        {
          model: 'default',
          messages: [
            { role: 'user', content: 'Count to 5' },
          ],
          max_tokens: 50,
        },
        (chunk) => {
          chunks.push(chunk);
        },
        (metrics) => {
          expect(metrics.totalLatencyMs).toBeGreaterThan(0);
          expect(metrics.completionTokens).toBeGreaterThan(0);
          metricsReceived = true;
        }
      );

      expect(chunks.length).toBeGreaterThan(0);
      expect(metricsReceived).toBe(true);
      const fullText = chunks.join('');
      expect(fullText.length).toBeGreaterThan(0);
    });

    it('should emit inference:complete event', async () => {
      return new Promise<void>((resolve) => {
        client.once('inference:complete', (metrics) => {
          expect(metrics.requestId).toBeDefined();
          expect(metrics.totalLatencyMs).toBeGreaterThan(0);
          expect(metrics.throughputTokensPerSec).toBeGreaterThan(0);
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

  describe('Error Handling', () => {
    it('should handle invalid request gracefully', async () => {
      await expect(
        client.chatCompletion({
          model: 'default',
          messages: [],
          max_tokens: 10,
        })
      ).rejects.toThrow();
    });
  });

  describe('Performance Metrics', () => {
    it('should track latency metrics', async () => {
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

      expect(latency).toBeGreaterThan(0);
      expect(latency).toBeLessThan(30000);
    });

    it('should measure throughput', async () => {
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

      expect(throughput).toBeGreaterThan(0);
    });
  });
});
