export interface SignatureStore {
    has(signature: string): Promise<boolean>;
    add(signature: string, ttl?: number): Promise<void>;
    clear(): Promise<void>;
    disconnect?(): Promise<void>;
}
export declare class RedisSignatureStore implements SignatureStore {
    private redis;
    private keyPrefix;
    constructor(redisUrl?: string, keyPrefix?: string);
    has(signature: string): Promise<boolean>;
    add(signature: string, ttl?: number): Promise<void>;
    clear(): Promise<void>;
    disconnect(): Promise<void>;
}
export declare class InMemorySignatureStore implements SignatureStore {
    private signatures;
    private expirations;
    constructor();
    has(signature: string): Promise<boolean>;
    add(signature: string, ttl?: number): Promise<void>;
    clear(): Promise<void>;
}
//# sourceMappingURL=signature-store.d.ts.map