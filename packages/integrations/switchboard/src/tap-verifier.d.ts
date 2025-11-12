export interface TAPIdentity {
    keyId: string;
    algorithm: string;
    publicKey: string;
    domain: string;
}
export interface TAPSignature {
    keyId: string;
    algorithm: string;
    signature: string;
    headers: string[];
    created: number;
    expires?: number;
    nonce?: string;
    tag?: string;
}
export declare class TAPVerifier {
    private registryUrl;
    private identityCache;
    private nonceStore;
    private cacheTimeout;
    constructor(registryUrl?: string, redisUrl?: string);
    verifySignature(method: string, path: string, headers: Record<string, string>, body?: string): Promise<{
        valid: boolean;
        identity?: TAPIdentity;
        error?: string;
    }>;
    private parseSignature;
    private buildSignatureBase;
    private verifySignatureData;
    private formatPublicKey;
    private getIdentity;
    private startNonceCleanup;
    clearCache(): Promise<void>;
    disconnect(): Promise<void>;
}
//# sourceMappingURL=tap-verifier.d.ts.map