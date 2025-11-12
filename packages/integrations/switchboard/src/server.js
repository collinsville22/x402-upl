import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { OracleDataMarketplace } from './marketplace.js';
import { TAPVerifier } from './tap-verifier.js';
import { Keypair } from '@solana/web3.js';
export class SwitchboardMarketplaceServer {
    server;
    marketplace;
    tapVerifier;
    config;
    metrics = {
        totalFeeds: 0,
        totalUpdates: 0,
        revenue: 0,
        averageLatency: 0,
        successRate: 100,
        cacheHitRate: 0,
        activeSubscriptions: 0,
    };
    constructor(config) {
        this.config = config;
        this.server = Fastify({
            logger: {
                transport: {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                        translateTime: 'HH:MM:ss',
                        ignore: 'pid,hostname',
                    },
                },
            },
        });
        this.marketplace = new OracleDataMarketplace(config.rpcUrl, config.queueKey, config.paymentRecipient, config.x402RegistryUrl, config.network, config.redisUrl);
        this.tapVerifier = new TAPVerifier(config.tapRegistryUrl, config.redisUrl);
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        this.server.register(cors, {
            origin: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'Signature', 'X-Payment-Proof'],
        });
        this.server.register(rateLimit, {
            max: 100,
            timeWindow: '1 minute',
        });
        this.server.register(websocket);
        this.server.addHook('onRequest', async (request, reply) => {
            this.metrics.totalUpdates++;
        });
    }
    setupRoutes() {
        this.server.get('/health', async (request, reply) => {
            return {
                status: 'healthy',
                uptime: process.uptime(),
                metrics: this.metrics,
            };
        });
        this.server.get('/feeds', async (request, reply) => {
            const { category } = request.query;
            const feeds = this.marketplace.listFeeds(category);
            this.metrics.totalFeeds = feeds.length;
            return feeds;
        });
        this.server.get('/feeds/:feedId', async (request, reply) => {
            const { feedId } = request.params;
            const feed = this.marketplace.getFeed(feedId);
            if (!feed) {
                reply.code(404).send({ error: 'Feed not found' });
                return;
            }
            return feed;
        });
        this.server.post('/feeds/:feedId/simulate', async (request, reply) => {
            const { feedId } = request.params;
            const tapResult = await this.verifyTAPSignature(request);
            if (!tapResult.valid) {
                reply.code(401).send({ error: 'TAP authentication failed', detail: tapResult.error });
                return;
            }
            try {
                const result = await this.marketplace.simulateFeed(feedId);
                return result;
            }
            catch (error) {
                reply.code(500).send({ error: error.message });
            }
        });
        this.server.post('/feeds/:feedId/update', async (request, reply) => {
            return this.handleFeedUpdate(request, reply);
        });
        this.server.post('/feeds/custom', async (request, reply) => {
            const tapResult = await this.verifyTAPSignature(request);
            if (!tapResult.valid) {
                reply.code(401).send({ error: 'TAP authentication failed' });
                return;
            }
            try {
                const customRequest = request.body;
                const feed = await this.marketplace.createCustomFeed(customRequest, tapResult.identity.keyId);
                this.metrics.totalFeeds++;
                return feed;
            }
            catch (error) {
                reply.code(500).send({ error: error.message });
            }
        });
        this.server.post('/feeds/batch/simulate', async (request, reply) => {
            const tapResult = await this.verifyTAPSignature(request);
            if (!tapResult.valid) {
                reply.code(401).send({ error: 'TAP authentication failed' });
                return;
            }
            const { feedIds } = request.body;
            try {
                const results = await this.marketplace.batchSimulateFeeds(feedIds);
                return Object.fromEntries(results);
            }
            catch (error) {
                reply.code(500).send({ error: error.message });
            }
        });
        this.server.get('/marketplace/services', async (request, reply) => {
            const { category, maxPrice } = request.query;
            try {
                const services = await this.marketplace.discoverMarketplaceServices(category, maxPrice ? parseFloat(maxPrice) : undefined);
                return services;
            }
            catch (error) {
                reply.code(500).send({ error: error.message });
            }
        });
        this.server.get('/metrics', async (request, reply) => {
            return this.metrics;
        });
        this.server.get('/ws/feed/:feedId', { websocket: true }, async (connection, req) => {
            await this.handleWebSocketFeed(connection, req);
        });
    }
    async handleFeedUpdate(request, reply) {
        const { feedId } = request.params;
        const tapResult = await this.verifyTAPSignature(request);
        if (!tapResult.valid) {
            reply.code(401).send({ error: 'TAP authentication failed' });
            return;
        }
        const paymentProofHeader = request.headers['x-payment-proof'];
        if (!paymentProofHeader) {
            const requirement = await this.marketplace.requestFeedUpdate(feedId, tapResult.identity.keyId);
            reply.code(402).send({
                error: 'Payment Required',
                payment: {
                    amount: requirement.amount,
                    currency: requirement.currency,
                    recipient: requirement.recipient,
                    mint: requirement.mint,
                    requestId: requirement.requestId,
                    expiresAt: requirement.expiresAt,
                },
            });
            return;
        }
        try {
            const proof = JSON.parse(paymentProofHeader);
            const payer = Keypair.generate();
            const result = await this.marketplace.fulfillFeedUpdate(proof, payer);
            this.metrics.revenue += proof.amount;
            this.metrics.successRate =
                (this.metrics.successRate * (this.metrics.totalUpdates - 1) + 100) / this.metrics.totalUpdates;
            reply.code(200).send(result);
        }
        catch (error) {
            reply.code(403).send({ error: 'Payment verification failed', detail: error.message });
        }
    }
    async handleWebSocketFeed(connection, request) {
        const feedId = request.params.feedId;
        const feed = this.marketplace.getFeed(feedId);
        if (!feed) {
            connection.socket.send(JSON.stringify({ error: 'Feed not found' }));
            connection.socket.close();
            return;
        }
        this.metrics.activeSubscriptions++;
        const sendUpdate = async () => {
            try {
                const result = await this.marketplace.simulateFeed(feedId);
                connection.socket.send(JSON.stringify({
                    type: 'update',
                    data: result,
                }));
            }
            catch (error) {
                connection.socket.send(JSON.stringify({
                    type: 'error',
                    error: error.message,
                }));
            }
        };
        const interval = setInterval(sendUpdate, 5000);
        await sendUpdate();
        connection.socket.on('close', () => {
            clearInterval(interval);
            this.metrics.activeSubscriptions--;
        });
    }
    async verifyTAPSignature(request) {
        const signatureHeader = request.headers['signature'];
        if (!signatureHeader) {
            return { valid: false, error: 'No signature header present' };
        }
        return await this.tapVerifier.verifySignature(request.method, request.url, request.headers, JSON.stringify(request.body));
    }
    async start() {
        try {
            await this.marketplace.initialize();
            await this.server.listen({
                port: this.config.port,
                host: this.config.host,
            });
            this.server.log.info(`Switchboard Oracle Marketplace running on ${this.config.host}:${this.config.port}`);
            this.server.log.info(`Network: ${this.config.network}`);
            this.server.log.info(`Payment recipient: ${this.config.paymentRecipient}`);
        }
        catch (error) {
            this.server.log.error(error);
            process.exit(1);
        }
    }
    async stop() {
        await this.server.close();
    }
}
async function main() {
    const config = {
        port: parseInt(process.env.PORT || '3003', 10),
        host: process.env.HOST || '0.0.0.0',
        rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        queueKey: process.env.SWITCHBOARD_QUEUE_KEY || 'A43DyUGA7s8eXPxqEjJY5CfCZaKdYxCmCKe5wGMuYiCe',
        paymentRecipient: process.env.PAYMENT_RECIPIENT || '',
        tapRegistryUrl: process.env.TAP_REGISTRY_URL || 'http://localhost:8001',
        x402RegistryUrl: process.env.X402_REGISTRY_URL || 'http://localhost:3001',
        network: process.env.NETWORK || 'devnet',
    };
    if (!config.paymentRecipient) {
        console.error('PAYMENT_RECIPIENT environment variable is required');
        process.exit(1);
    }
    const server = new SwitchboardMarketplaceServer(config);
    await server.start();
    process.on('SIGINT', async () => {
        await server.stop();
        process.exit(0);
    });
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
//# sourceMappingURL=server.js.map