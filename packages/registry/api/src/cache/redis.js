"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.cacheDelete = cacheDelete;
exports.cacheDeletePattern = cacheDeletePattern;
const redis_1 = require("@upstash/redis");
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('Missing required Upstash Redis environment variables');
}
exports.redis = new redis_1.Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
async function cacheGet(key) {
    const data = await exports.redis.get(key);
    return data;
}
async function cacheSet(key, value, ttlSeconds) {
    if (ttlSeconds) {
        await exports.redis.setex(key, ttlSeconds, JSON.stringify(value));
    }
    else {
        await exports.redis.set(key, JSON.stringify(value));
    }
}
async function cacheDelete(key) {
    await exports.redis.del(key);
}
async function cacheDeletePattern(pattern) {
    const keys = await exports.redis.keys(pattern);
    if (keys.length > 0) {
        await exports.redis.del(...keys);
    }
}
//# sourceMappingURL=redis.js.map