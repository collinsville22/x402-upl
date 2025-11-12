import { z } from 'zod';
const DataRequestSchema = z.object({
    query: z.string().optional(),
    limit: z.number().int().positive().max(100).default(10),
});
export function exampleRoutes(app) {
    app.get('/api/data', async (req, res) => {
        const { query, limit } = DataRequestSchema.parse({
            query: req.query.query,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
        });
        const data = Array.from({ length: limit }, (_, i) => ({
            id: i + 1,
            value: Math.random() * 100,
            query: query || 'default',
            timestamp: Date.now(),
        }));
        res.json({
            success: true,
            data,
            count: data.length,
        });
    });
    app.post('/api/process', async (req, res) => {
        const input = req.body;
        const result = {
            processed: true,
            input,
            output: {
                hash: Buffer.from(JSON.stringify(input)).toString('base64'),
                timestamp: Date.now(),
            },
        };
        res.json(result);
    });
    app.get('/api/analytics', async (req, res) => {
        res.json({
            metrics: {
                totalRequests: Math.floor(Math.random() * 10000),
                avgResponseTime: Math.floor(Math.random() * 500),
                successRate: Math.random() * 0.1 + 0.9,
            },
            timestamp: Date.now(),
        });
    });
}
//# sourceMappingURL=examples.js.map