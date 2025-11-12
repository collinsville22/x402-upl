export declare class RedisClient {
    private client;
    constructor();
    connect(): Promise<void>;
    ping(): Promise<string>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, expirySeconds?: number): Promise<void>;
    del(key: string): Promise<void>;
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<void>;
    getMetrics(): Promise<any>;
    disconnect(): Promise<void>;
}
//# sourceMappingURL=redis.d.ts.map