export interface OracleFeedConfig {
    feedId: string;
    feedHash: string;
    name: string;
    description: string;
    category: string;
    job: OracleJobDefinition;
    pricePerUpdate: number;
    currency: 'CASH' | 'USDC' | 'SOL';
    updateFrequency: 'realtime' | 'high' | 'medium' | 'low';
    minSignatures: number;
    maxStaleness: number;
    owner: string;
}
export interface OracleJobDefinition {
    name: string;
    tasks: OracleTask[];
    variables?: Record<string, string>;
}
export interface OracleTask {
    httpTask?: HttpTask;
    jsonParseTask?: JsonParseTask;
    medianTask?: MedianTask;
    multiplyTask?: MultiplyTask;
    divideTask?: DivideTask;
    cacheTask?: CacheTask;
    conditionalTask?: ConditionalTask;
    [key: string]: any;
}
export interface HttpTask {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Array<{
        key: string;
        value: string;
    }>;
    body?: string;
}
export interface JsonParseTask {
    path: string;
}
export interface MedianTask {
    tasks: OracleTask[];
}
export interface MultiplyTask {
    scalar?: number;
    job?: OracleJobDefinition;
}
export interface DivideTask {
    scalar?: number;
    job?: OracleJobDefinition;
}
export interface CacheTask {
    variableName: string;
}
export interface ConditionalTask {
    attempt: OracleTask[];
    onFailure?: OracleTask[];
}
export interface FeedUpdateRequest {
    feedId: string;
    payer: string;
    numSignatures?: number;
    maxStaleness?: number;
}
export interface FeedUpdateResult {
    feedId: string;
    value: number;
    timestamp: number;
    slot: number;
    signatures: number;
    cost: number;
    transactionSignature?: string;
}
export interface PaymentRequirement {
    amount: number;
    recipient: string;
    currency: 'CASH' | 'USDC' | 'SOL';
    mint?: string;
    expiresAt: number;
    requestId: string;
    feedId: string;
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
export interface FeedSubscription {
    subscriptionId: string;
    feedId: string;
    subscriber: string;
    startTime: number;
    expiresAt: number;
    updateInterval: number;
    totalPaid: number;
    remainingUpdates: number;
}
export interface MarketplaceService {
    id: string;
    name: string;
    description: string;
    category: string;
    feedIds: string[];
    pricePerCall: number;
    owner: string;
    capabilities: string[];
    reputation: number;
    totalCalls: number;
}
export interface OracleMetrics {
    totalFeeds: number;
    totalUpdates: number;
    revenue: number;
    averageLatency: number;
    successRate: number;
    cacheHitRate: number;
    activeSubscriptions: number;
}
export interface CustomFeedRequest {
    name: string;
    description: string;
    dataSources: DataSource[];
    aggregation: 'median' | 'mean' | 'min' | 'max';
    transformations?: Transformation[];
    updateFrequency: 'realtime' | 'high' | 'medium' | 'low';
    pricePerUpdate?: number;
}
export interface DataSource {
    name: string;
    url: string;
    jsonPath: string;
    headers?: Array<{
        key: string;
        value: string;
    }>;
    auth?: {
        type: 'bearer' | 'basic' | 'api-key';
        value: string;
    };
}
export interface Transformation {
    type: 'multiply' | 'divide' | 'add' | 'subtract';
    value: number;
}
export interface SurgeFeed {
    feedId: string;
    ws: any;
    lastUpdate: FeedUpdateResult;
    subscribers: Set<string>;
}
export interface PricingTier {
    name: string;
    maxFeeds: number;
    maxUpdatesPerDay: number;
    pricePerUpdate: number;
    features: string[];
}
//# sourceMappingURL=types.d.ts.map