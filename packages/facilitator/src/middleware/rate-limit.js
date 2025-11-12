export class RateLimiter {
    store = new Map();
    config;
    constructor(config) {
        this.config = {
            skipSuccessfulRequests: false,
            skipFailedRequests: false,
            keyGenerator: (request) => request.ip,
            ...config
        };
        setInterval(() => this.cleanup(), 60000);
    }
    cleanup() {
        const now = Date.now();
        for (const [key, value] of this.store.entries()) {
            if (value.resetTime < now) {
                this.store.delete(key);
            }
        }
    }
    async check(request, reply) {
        const key = this.config.keyGenerator(request);
        const now = Date.now();
        let record = this.store.get(key);
        if (!record || record.resetTime < now) {
            record = {
                count: 0,
                resetTime: now + this.config.windowMs
            };
            this.store.set(key, record);
        }
        record.count++;
        const remaining = Math.max(0, this.config.max - record.count);
        const resetTime = Math.ceil(record.resetTime / 1000);
        reply.header('X-RateLimit-Limit', this.config.max.toString());
        reply.header('X-RateLimit-Remaining', remaining.toString());
        reply.header('X-RateLimit-Reset', resetTime.toString());
        if (record.count > this.config.max) {
            const retryAfter = Math.ceil((record.resetTime - now) / 1000);
            reply.header('Retry-After', retryAfter.toString());
            return reply.status(429).send({
                error: 'Too many requests',
                message: `Rate limit exceeded. Try again in ${retryAfter} seconds`,
                retryAfter
            });
        }
    }
}
export const createRateLimitMiddleware = (config) => {
    const limiter = new RateLimiter(config);
    return async (request, reply) => {
        await limiter.check(request, reply);
    };
};
export const defaultRateLimiter = createRateLimitMiddleware({
    max: 100,
    windowMs: 60000
});
export const strictRateLimiter = createRateLimitMiddleware({
    max: 10,
    windowMs: 60000
});
export const authRateLimiter = createRateLimitMiddleware({
    max: 5,
    windowMs: 300000
});
export async function setupRateLimiting(fastify) {
    fastify.addHook('onRequest', async (request, reply) => {
        const path = request.url;
        if (path.startsWith('/api/settlement/request') || path.startsWith('/api/transactions/record')) {
            await strictRateLimiter(request, reply);
        }
        else if (path.startsWith('/api/')) {
            await defaultRateLimiter(request, reply);
        }
    });
}
//# sourceMappingURL=rate-limit.js.map