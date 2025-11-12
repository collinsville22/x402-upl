import { z } from 'zod';
export const testEndpoints = [
    {
        path: '/echo',
        method: 'POST',
        price: 0.001,
        asset: 'SOL',
        description: 'Echo service that returns your input with metadata',
        responseSchema: z.object({
            echo: z.string(),
            timestamp: z.number(),
            signature: z.string(),
            refundScheduled: z.boolean(),
        }),
        handler: async (params) => ({
            echo: params.message || 'No message provided',
            timestamp: Date.now(),
            signature: 'test_signature',
            refundScheduled: true,
        }),
    },
    {
        path: '/random-data',
        method: 'GET',
        price: 0.005,
        asset: 'SOL',
        description: 'Generate random test data',
        responseSchema: z.object({
            data: z.array(z.object({
                id: z.string(),
                value: z.number(),
                category: z.string(),
            })),
            count: z.number(),
            generatedAt: z.number(),
        }),
        handler: async () => {
            const count = Math.floor(Math.random() * 10) + 5;
            const categories = ['alpha', 'beta', 'gamma', 'delta'];
            return {
                data: Array.from({ length: count }, (_, i) => ({
                    id: `item_${i + 1}`,
                    value: Math.random() * 100,
                    category: categories[Math.floor(Math.random() * categories.length)],
                })),
                count,
                generatedAt: Date.now(),
            };
        },
    },
    {
        path: '/weather',
        method: 'GET',
        price: 0.002,
        asset: 'SOL',
        description: 'Mock weather data for testing',
        responseSchema: z.object({
            location: z.string(),
            temperature: z.number(),
            conditions: z.string(),
            humidity: z.number(),
            windSpeed: z.number(),
            timestamp: z.number(),
        }),
        handler: async () => ({
            location: 'San Francisco, CA',
            temperature: Math.floor(Math.random() * 30) + 50,
            conditions: ['Sunny', 'Cloudy', 'Rainy', 'Foggy'][Math.floor(Math.random() * 4)],
            humidity: Math.floor(Math.random() * 60) + 30,
            windSpeed: Math.floor(Math.random() * 20) + 5,
            timestamp: Date.now(),
        }),
    },
    {
        path: '/analytics',
        method: 'POST',
        price: 0.01,
        asset: 'SOL',
        description: 'Process analytics data',
        responseSchema: z.object({
            processed: z.boolean(),
            metrics: z.object({
                totalItems: z.number(),
                average: z.number(),
                median: z.number(),
                stdDev: z.number(),
            }),
            insights: z.array(z.string()),
            processingTimeMs: z.number(),
        }),
        handler: async (params) => {
            const data = params.data || Array.from({ length: 100 }, () => Math.random() * 100);
            const sorted = [...data].sort((a, b) => a - b);
            const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
            const median = sorted[Math.floor(sorted.length / 2)];
            const variance = data.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / data.length;
            const stdDev = Math.sqrt(variance);
            return {
                processed: true,
                metrics: {
                    totalItems: data.length,
                    average: parseFloat(avg.toFixed(2)),
                    median: parseFloat(median.toFixed(2)),
                    stdDev: parseFloat(stdDev.toFixed(2)),
                },
                insights: [
                    `Dataset contains ${data.length} items`,
                    `Values range from ${Math.min(...data).toFixed(2)} to ${Math.max(...data).toFixed(2)}`,
                    `Standard deviation indicates ${stdDev > 25 ? 'high' : 'low'} variability`,
                ],
                processingTimeMs: Math.floor(Math.random() * 100) + 50,
            };
        },
    },
    {
        path: '/crypto-price',
        method: 'GET',
        price: 0.003,
        asset: 'SOL',
        description: 'Mock cryptocurrency price data',
        responseSchema: z.object({
            symbol: z.string(),
            price: z.number(),
            change24h: z.number(),
            volume24h: z.number(),
            marketCap: z.number(),
            timestamp: z.number(),
        }),
        handler: async () => ({
            symbol: 'SOL/USD',
            price: parseFloat((Math.random() * 50 + 100).toFixed(2)),
            change24h: parseFloat((Math.random() * 20 - 10).toFixed(2)),
            volume24h: Math.floor(Math.random() * 1000000000),
            marketCap: Math.floor(Math.random() * 50000000000),
            timestamp: Date.now(),
        }),
    },
    {
        path: '/ml-inference',
        method: 'POST',
        price: 0.02,
        asset: 'SOL',
        description: 'Mock machine learning inference',
        responseSchema: z.object({
            model: z.string(),
            prediction: z.object({
                class: z.string(),
                confidence: z.number(),
                alternatives: z.array(z.object({
                    class: z.string(),
                    confidence: z.number(),
                })),
            }),
            inferenceTimeMs: z.number(),
        }),
        handler: async (params) => {
            const classes = ['positive', 'negative', 'neutral'];
            const mainClass = classes[Math.floor(Math.random() * classes.length)];
            const confidence = Math.random() * 0.3 + 0.7;
            return {
                model: 'test-classifier-v1',
                prediction: {
                    class: mainClass,
                    confidence: parseFloat(confidence.toFixed(3)),
                    alternatives: classes
                        .filter(c => c !== mainClass)
                        .map(c => ({
                        class: c,
                        confidence: parseFloat((Math.random() * (1 - confidence)).toFixed(3)),
                    })),
                },
                inferenceTimeMs: Math.floor(Math.random() * 200) + 100,
            };
        },
    },
    {
        path: '/blockchain-data',
        method: 'GET',
        price: 0.015,
        asset: 'SOL',
        description: 'Mock blockchain transaction data',
        responseSchema: z.object({
            chain: z.string(),
            latestBlock: z.number(),
            transactions: z.array(z.object({
                hash: z.string(),
                from: z.string(),
                to: z.string(),
                value: z.number(),
                timestamp: z.number(),
            })),
            networkStats: z.object({
                tps: z.number(),
                avgFee: z.number(),
                activeValidators: z.number(),
            }),
        }),
        handler: async () => ({
            chain: 'solana-devnet',
            latestBlock: Math.floor(Math.random() * 1000000) + 200000000,
            transactions: Array.from({ length: 5 }, () => ({
                hash: `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
                from: `${Math.random().toString(36).substring(2, 15)}...${Math.random().toString(36).substring(2, 6)}`,
                to: `${Math.random().toString(36).substring(2, 15)}...${Math.random().toString(36).substring(2, 6)}`,
                value: parseFloat((Math.random() * 10).toFixed(4)),
                timestamp: Date.now() - Math.floor(Math.random() * 3600000),
            })),
            networkStats: {
                tps: Math.floor(Math.random() * 3000) + 1000,
                avgFee: parseFloat((Math.random() * 0.001).toFixed(6)),
                activeValidators: Math.floor(Math.random() * 500) + 1500,
            },
        }),
    },
];
export function registerTestEndpoints(fastify) {
    for (const endpoint of testEndpoints) {
        if (endpoint.method === 'GET') {
            fastify.get(endpoint.path, async (request, reply) => {
                const result = await endpoint.handler({});
                return result;
            });
        }
        else {
            fastify.post(endpoint.path, async (request, reply) => {
                const result = await endpoint.handler(request.body || {});
                return result;
            });
        }
    }
}
//# sourceMappingURL=test-endpoints.js.map