import Redis from 'ioredis';
export class RedisClient {
    client;
    constructor() {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        this.client = new Redis(redisUrl, {
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });
        this.client.on('error', (error) => {
            console.error('Redis connection error:', error);
        });
        this.client.on('connect', () => {
            console.log('Redis connected');
        });
    }
    async connect() {
        await this.client.ping();
    }
    async ping() {
        return await this.client.ping();
    }
    async get(key) {
        return await this.client.get(key);
    }
    async set(key, value, expirySeconds) {
        if (expirySeconds) {
            await this.client.setex(key, expirySeconds, value);
        }
        else {
            await this.client.set(key, value);
        }
    }
    async del(key) {
        await this.client.del(key);
    }
    async incr(key) {
        return await this.client.incr(key);
    }
    async expire(key, seconds) {
        await this.client.expire(key, seconds);
    }
    async getMetrics() {
        const info = await this.client.info('stats');
        const lines = info.split('\r\n');
        const metrics = {};
        lines.forEach(line => {
            if (line.includes(':')) {
                const [key, value] = line.split(':');
                metrics[key] = value;
            }
        });
        return metrics;
    }
    async disconnect() {
        await this.client.quit();
    }
}
//# sourceMappingURL=redis.js.map