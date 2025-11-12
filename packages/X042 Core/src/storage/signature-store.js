"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemorySignatureStore = exports.RedisSignatureStore = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
class RedisSignatureStore {
    redis;
    keyPrefix;
    constructor(redisUrl, keyPrefix = 'x402:signatures:') {
        this.redis = redisUrl ? new ioredis_1.default(redisUrl) : new ioredis_1.default();
        this.keyPrefix = keyPrefix;
    }
    async has(signature) {
        const exists = await this.redis.exists(this.keyPrefix + signature);
        return exists === 1;
    }
    async add(signature, ttl = 86400) {
        await this.redis.setex(this.keyPrefix + signature, ttl, Date.now().toString());
    }
    async clear() {
        const keys = await this.redis.keys(this.keyPrefix + '*');
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
    }
    async disconnect() {
        await this.redis.quit();
    }
}
exports.RedisSignatureStore = RedisSignatureStore;
class InMemorySignatureStore {
    signatures;
    expirations;
    constructor() {
        this.signatures = new Set();
        this.expirations = new Map();
    }
    async has(signature) {
        const expiration = this.expirations.get(signature);
        if (expiration && Date.now() > expiration) {
            this.signatures.delete(signature);
            this.expirations.delete(signature);
            return false;
        }
        return this.signatures.has(signature);
    }
    async add(signature, ttl = 86400) {
        this.signatures.add(signature);
        this.expirations.set(signature, Date.now() + ttl * 1000);
    }
    async clear() {
        this.signatures.clear();
        this.expirations.clear();
    }
}
exports.InMemorySignatureStore = InMemorySignatureStore;
//# sourceMappingURL=signature-store.js.map