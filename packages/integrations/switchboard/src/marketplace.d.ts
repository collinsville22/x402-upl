import { Keypair } from '@solana/web3.js';
import { OracleFeedConfig, MarketplaceService, FeedSubscription, CustomFeedRequest, PaymentRequirement, PaymentProof, FeedUpdateResult } from './types.js';
export declare class OracleDataMarketplace {
    private switchboard;
    private paymentVerifier;
    private registryClient;
    private feeds;
    private subscriptions;
    private redis?;
    private paymentRecipient;
    constructor(rpcUrl: string, queueKey: string, paymentRecipient: string, registryUrl: string, network?: 'mainnet-beta' | 'devnet', redisUrl?: string);
    initialize(): Promise<void>;
    private loadPredefinedFeeds;
    private registerFeedInRegistry;
    createCustomFeed(request: CustomFeedRequest, owner: string): Promise<OracleFeedConfig>;
    requestFeedUpdate(feedId: string, payer: string): Promise<PaymentRequirement | FeedUpdateResult>;
    fulfillFeedUpdate(proof: PaymentProof, payer: Keypair): Promise<FeedUpdateResult>;
    simulateFeed(feedId: string): Promise<FeedUpdateResult>;
    createSubscription(feedId: string, subscriber: string, durationDays: number, updatesPerDay: number): Promise<FeedSubscription>;
    listFeeds(category?: string): OracleFeedConfig[];
    getFeed(feedId: string): OracleFeedConfig | undefined;
    discoverMarketplaceServices(category?: string, maxPrice?: number): Promise<MarketplaceService[]>;
    batchSimulateFeeds(feedIds: string[]): Promise<Map<string, FeedUpdateResult>>;
}
//# sourceMappingURL=marketplace.d.ts.map