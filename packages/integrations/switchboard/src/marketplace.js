import { SwitchboardOracleClient } from './switchboard-client.js';
import { PaymentVerifier } from './payment-verifier.js';
import { X402RegistryClient } from './x402-registry-client.js';
import { randomBytes } from 'crypto';
import Redis from 'ioredis';
export class OracleDataMarketplace {
    switchboard;
    paymentVerifier;
    registryClient;
    feeds = new Map();
    subscriptions = new Map();
    redis;
    paymentRecipient;
    constructor(rpcUrl, queueKey, paymentRecipient, registryUrl, network = 'mainnet-beta', redisUrl) {
        this.switchboard = new SwitchboardOracleClient(rpcUrl, queueKey, network);
        this.paymentVerifier = new PaymentVerifier(rpcUrl, paymentRecipient, redisUrl);
        this.registryClient = new X402RegistryClient(registryUrl);
        this.paymentRecipient = paymentRecipient;
        if (redisUrl) {
            this.redis = new Redis(redisUrl);
        }
    }
    async initialize() {
        await this.switchboard.initialize();
        await this.loadPredefinedFeeds();
    }
    async loadPredefinedFeeds() {
        const predefinedFeeds = [
            {
                feedId: '0x4a6f424c0c4d9b7fcad6e5b1e4c2f2b3a7d8e9f0',
                feedHash: '0x4a6f424c0c4d9b7fcad6e5b1e4c2f2b3a7d8e9f0',
                name: 'BTC/USD',
                description: 'Bitcoin to USD price from multiple sources',
                category: 'crypto-price',
                job: {
                    name: 'BTC/USD Multi-Source',
                    tasks: [
                        { httpTask: { url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT' } },
                        { jsonParseTask: { path: '$.price' } },
                        { cacheTask: { variableName: 'BINANCE_BTC' } },
                        { httpTask: { url: 'https://api.coinbase.com/v2/prices/BTC-USD/spot' } },
                        { jsonParseTask: { path: '$.data.amount' } },
                        { cacheTask: { variableName: 'COINBASE_BTC' } },
                        { httpTask: { url: 'https://api.kraken.com/0/public/Ticker?pair=XBTUSD' } },
                        { jsonParseTask: { path: '$.result.XXBTZUSD.c[0]' } },
                        { medianTask: {
                                tasks: [
                                    { cacheTask: { variableName: 'BINANCE_BTC' } },
                                    { cacheTask: { variableName: 'COINBASE_BTC' } },
                                ],
                            } },
                    ],
                },
                pricePerUpdate: 0.0001,
                currency: 'CASH',
                updateFrequency: 'high',
                minSignatures: 5,
                maxStaleness: 25,
                owner: this.paymentRecipient,
            },
            {
                feedId: '0x5b7f525d1d5e0c8fbd7f6c2f5d3c3d4b8e9fa1fb',
                feedHash: '0x5b7f525d1d5e0c8fbd7f6c2f5d3c3d4b8e9fa1fb',
                name: 'ETH/USD',
                description: 'Ethereum to USD price from multiple sources',
                category: 'crypto-price',
                job: {
                    name: 'ETH/USD Multi-Source',
                    tasks: [
                        { httpTask: { url: 'https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT' } },
                        { jsonParseTask: { path: '$.price' } },
                    ],
                },
                pricePerUpdate: 0.0001,
                currency: 'CASH',
                updateFrequency: 'high',
                minSignatures: 5,
                maxStaleness: 25,
                owner: this.paymentRecipient,
            },
            {
                feedId: '0x6c8f636e2e6f1d9gce8g7d3g6e4d5e5c9fafb2gc',
                feedHash: '0x6c8f636e2e6f1d9gce8g7d3g6e4d5e5c9fafb2gc',
                name: 'SOL/USD',
                description: 'Solana to USD price from multiple sources',
                category: 'crypto-price',
                job: {
                    name: 'SOL/USD Multi-Source',
                    tasks: [
                        { httpTask: { url: 'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT' } },
                        { jsonParseTask: { path: '$.price' } },
                    ],
                },
                pricePerUpdate: 0.00005,
                currency: 'CASH',
                updateFrequency: 'high',
                minSignatures: 3,
                maxStaleness: 25,
                owner: this.paymentRecipient,
            },
        ];
        for (const feed of predefinedFeeds) {
            this.feeds.set(feed.feedId, feed);
            await this.registerFeedInRegistry(feed);
        }
    }
    async registerFeedInRegistry(feed) {
        try {
            await this.registryClient.registerService({
                name: feed.name,
                description: feed.description,
                category: feed.category,
                url: `http://localhost:3003/feed/${feed.feedId}`,
                pricePerCall: feed.pricePerUpdate,
                ownerWalletAddress: feed.owner,
                acceptedTokens: [feed.currency],
                capabilities: ['oracle-data', 'real-time', 'multi-source', 'switchboard'],
                metadata: {
                    feedId: feed.feedId,
                    feedHash: feed.feedHash,
                    updateFrequency: feed.updateFrequency,
                    minSignatures: feed.minSignatures,
                    maxStaleness: feed.maxStaleness,
                },
            });
        }
        catch (error) {
            console.error(`Failed to register feed ${feed.feedId} in registry:`, error);
        }
    }
    async createCustomFeed(request, owner) {
        const feed = await this.switchboard.createCustomFeed(request);
        feed.owner = owner;
        this.feeds.set(feed.feedId, feed);
        await this.registerFeedInRegistry(feed);
        return feed;
    }
    async requestFeedUpdate(feedId, payer) {
        const feed = this.feeds.get(feedId);
        if (!feed) {
            throw new Error(`Feed ${feedId} not found`);
        }
        const requirement = {
            amount: feed.pricePerUpdate,
            recipient: this.paymentRecipient,
            currency: feed.currency,
            mint: feed.currency === 'CASH' ? 'CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT' : undefined,
            expiresAt: Date.now() + 300000,
            requestId: randomBytes(16).toString('hex'),
            feedId,
        };
        if (this.redis) {
            await this.redis.setex(`payment:${requirement.requestId}`, 300, JSON.stringify(requirement));
        }
        return requirement;
    }
    async fulfillFeedUpdate(proof, payer) {
        let requirement = null;
        if (this.redis) {
            const stored = await this.redis.get(`payment:${proof.requestId}`);
            if (!stored) {
                throw new Error('Invalid or expired payment request');
            }
            requirement = JSON.parse(stored);
        }
        if (!requirement) {
            throw new Error('Invalid or expired payment request');
        }
        const isValid = await this.paymentVerifier.verifyPayment(proof, requirement);
        if (!isValid) {
            throw new Error('Payment verification failed');
        }
        if (this.redis) {
            await this.redis.del(`payment:${proof.requestId}`);
        }
        const request = {
            feedId: requirement.feedId,
            payer: payer.publicKey.toBase58(),
            numSignatures: 3,
            maxStaleness: 25,
        };
        const result = await this.switchboard.fetchFeedUpdate(request, payer);
        return result;
    }
    async simulateFeed(feedId) {
        const feed = this.feeds.get(feedId);
        if (!feed) {
            throw new Error(`Feed ${feedId} not found`);
        }
        return await this.switchboard.simulateFeed(feed.feedHash);
    }
    async createSubscription(feedId, subscriber, durationDays, updatesPerDay) {
        const feed = this.feeds.get(feedId);
        if (!feed) {
            throw new Error(`Feed ${feedId} not found`);
        }
        const totalUpdates = durationDays * updatesPerDay;
        const totalCost = totalUpdates * feed.pricePerUpdate;
        const subscription = {
            subscriptionId: randomBytes(16).toString('hex'),
            feedId,
            subscriber,
            startTime: Date.now(),
            expiresAt: Date.now() + durationDays * 86400000,
            updateInterval: Math.floor(86400000 / updatesPerDay),
            totalPaid: totalCost,
            remainingUpdates: totalUpdates,
        };
        this.subscriptions.set(subscription.subscriptionId, subscription);
        return subscription;
    }
    listFeeds(category) {
        const allFeeds = Array.from(this.feeds.values());
        if (category) {
            return allFeeds.filter(feed => feed.category === category);
        }
        return allFeeds;
    }
    getFeed(feedId) {
        return this.feeds.get(feedId);
    }
    async discoverMarketplaceServices(category, maxPrice) {
        const services = await this.registryClient.discoverServices({
            category,
            maxPrice,
            capabilities: ['oracle-data', 'switchboard'],
            limit: 100,
        });
        return services.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            category: s.category,
            feedIds: s.metadata?.feedId ? [s.metadata.feedId] : [],
            pricePerCall: s.pricePerCall,
            owner: s.ownerWalletAddress,
            capabilities: s.capabilities,
            reputation: s.reputation,
            totalCalls: s.totalCalls,
        }));
    }
    async batchSimulateFeeds(feedIds) {
        const results = new Map();
        for (const feedId of feedIds) {
            try {
                const result = await this.simulateFeed(feedId);
                results.set(feedId, result);
            }
            catch (error) {
                console.error(`Failed to simulate feed ${feedId}:`, error);
            }
        }
        return results;
    }
}
//# sourceMappingURL=marketplace.js.map