export interface PricingTier {
    method: string;
    basePrice: number;
    volumeMultiplier: number;
    ageMultiplier: number;
    complexityFactors?: {
        maxSupportedTransactionVersion?: number;
        includeRewards?: boolean;
        transactionDetails?: 'full' | 'accounts' | 'signatures';
    };
}
export interface PaymentRequirement {
    amount: number;
    recipient: string;
    currency: 'CASH' | 'USDC' | 'SOL';
    mint?: string;
    expiresAt: number;
    requestId: string;
}
export interface PaymentProof {
    signature: string;
    amount: number;
    sender: string;
    recipient: string;
    mint?: string;
    timestamp: number;
    requestId: string;
}
export interface CostCalculation {
    baseCost: number;
    volumeCost: number;
    ageMultiplier: number;
    totalCost: number;
    currency: 'CASH' | 'USDC' | 'SOL';
    breakdown: {
        method: string;
        params: Record<string, any>;
        dataVolume?: number;
        dataAge?: number;
    };
}
export interface RPCRequest {
    jsonrpc: '2.0';
    id: string | number;
    method: string;
    params?: any[];
}
export interface RPCResponse {
    jsonrpc: '2.0';
    id: string | number;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}
export interface X402ServiceInfo {
    id: string;
    name: string;
    description: string;
    category: string;
    url: string;
    pricePerCall: number;
    ownerWalletAddress: string;
    acceptedTokens: string[];
    capabilities: string[];
    reputation: number;
    totalCalls: number;
    averageResponseTime: number;
    createdAt: string;
    updatedAt: string;
}
export interface X402ServiceRegistration {
    name: string;
    description: string;
    category: string;
    url: string;
    pricePerCall: number;
    ownerWalletAddress: string;
    acceptedTokens: string[];
    capabilities: string[];
    metadata?: Record<string, any>;
}
export interface TAPIdentity {
    keyId: string;
    algorithm: 'ed25519' | 'rsa-pss-sha256';
    publicKey: string;
    domain: string;
}
export interface ProxyConfig {
    port: number;
    host: string;
    oldFaithfulUrl: string;
    paymentRecipient: string;
    tapRegistryUrl: string;
    x402RegistryUrl: string;
    solanaRpcUrl: string;
    redisUrl?: string;
    cacheTTL?: number;
    rateLimitPerMinute?: number;
}
export interface CacheEntry {
    data: any;
    timestamp: number;
    cost: number;
}
export interface MetricsData {
    totalRequests: number;
    paidRequests: number;
    revenue: number;
    averageRequestCost: number;
    cacheHitRate: number;
    errorRate: number;
    methodCounts: Record<string, number>;
    methodRevenue: Record<string, number>;
}
//# sourceMappingURL=types.d.ts.map