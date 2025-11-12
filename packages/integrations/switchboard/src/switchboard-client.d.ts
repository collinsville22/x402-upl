import { Keypair, PublicKey } from '@solana/web3.js';
import { OracleFeedConfig, FeedUpdateRequest, FeedUpdateResult, OracleJobDefinition, CustomFeedRequest } from './types.js';
export declare class SwitchboardOracleClient {
    private connection;
    private crossbar;
    private queue;
    private luts;
    private network;
    constructor(rpcUrl: string, queueKey: string, network?: 'mainnet-beta' | 'devnet');
    initialize(): Promise<void>;
    createFeedFromJob(job: OracleJobDefinition): Promise<string>;
    private buildOracleJob;
    private mapHttpMethod;
    simulateFeed(feedHash: string, variables?: Record<string, string>): Promise<FeedUpdateResult>;
    fetchFeedUpdate(request: FeedUpdateRequest, payer: Keypair): Promise<FeedUpdateResult>;
    createCustomFeed(config: CustomFeedRequest): Promise<OracleFeedConfig>;
    batchSimulateFeeds(feedHashes: string[]): Promise<FeedUpdateResult[]>;
    getOraclePubkey(feedHash: string): PublicKey;
}
//# sourceMappingURL=switchboard-client.d.ts.map