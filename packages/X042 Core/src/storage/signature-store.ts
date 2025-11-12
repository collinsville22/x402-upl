import Redis from 'ioredis';

export interface SignatureStore {
  has(signature: string): Promise<boolean>;
  add(signature: string, ttl?: number): Promise<void>;
  clear(): Promise<void>;
  disconnect?(): Promise<void>;
}

export class RedisSignatureStore implements SignatureStore {
  private redis: Redis;
  private keyPrefix: string;

  constructor(redisUrl?: string, keyPrefix: string = 'x402:signatures:') {
    this.redis = redisUrl ? new Redis(redisUrl) : new Redis();
    this.keyPrefix = keyPrefix;
  }

  async has(signature: string): Promise<boolean> {
    const exists = await this.redis.exists(this.keyPrefix + signature);
    return exists === 1;
  }

  async add(signature: string, ttl: number = 86400): Promise<void> {
    await this.redis.setex(
      this.keyPrefix + signature,
      ttl,
      Date.now().toString()
    );
  }

  async clear(): Promise<void> {
    const keys = await this.redis.keys(this.keyPrefix + '*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

export class InMemorySignatureStore implements SignatureStore {
  private signatures: Set<string>;
  private expirations: Map<string, number>;

  constructor() {
    this.signatures = new Set();
    this.expirations = new Map();
  }

  async has(signature: string): Promise<boolean> {
    const expiration = this.expirations.get(signature);
    if (expiration && Date.now() > expiration) {
      this.signatures.delete(signature);
      this.expirations.delete(signature);
      return false;
    }
    return this.signatures.has(signature);
  }

  async add(signature: string, ttl: number = 86400): Promise<void> {
    this.signatures.add(signature);
    this.expirations.set(signature, Date.now() + ttl * 1000);
  }

  async clear(): Promise<void> {
    this.signatures.clear();
    this.expirations.clear();
  }
}
