import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { PublicKey, Connection } from '@solana/web3.js';
import { createX402FastifyPlugin } from '@x402-upl/core';
import { config } from './config.js';
import { RegistryClient } from './x402/registry-client.js';
import { createTAPMiddleware } from './x402/tap-middleware.js';
import exampleRoutes from './routes/example.js';

const fastify = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    transport: config.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});

let registryClient: RegistryClient | null = null;

async function start() {
  try {
    await fastify.register(helmet);
    await fastify.register(cors, {
      origin: config.CORS_ORIGIN,
    });

    if (config.ENABLE_TAP) {
      const tapMiddleware = createTAPMiddleware({
        registryUrl: config.REGISTRY_URL,
        requireTAP: false,
        cachePublicKeys: true,
        cacheTTL: 3600000,
      });

      fastify.addHook('onRequest', tapMiddleware);
      fastify.log.info('TAP authentication enabled');
    }

    const connection = new Connection(
      config.NETWORK === 'mainnet-beta'
        ? 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com'
    );

    const x402Plugin = createX402FastifyPlugin({
      connection,
      network: config.NETWORK,
      recipientAddress: new PublicKey(config.TREASURY_WALLET),
      pricePerCall: config.SERVICE_PRICE || 0.01,
      asset: 'CASH',
      serviceName: config.SERVICE_NAME,
      autoSettle: false,
    });

    fastify.addHook('onRequest', x402Plugin);
    fastify.log.info('x402 payment verification enabled');

    fastify.get('/health', async () => {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: config.SERVICE_NAME || 'x402-fastify-service',
      };
    });

    await fastify.register(exampleRoutes, { prefix: '/api' });

    if (config.AUTO_REGISTER_SERVICE && config.SERVICE_URL && config.SERVICE_NAME) {
      registryClient = new RegistryClient(config.REGISTRY_URL);

      const acceptedTokens = config.ACCEPTED_TOKENS?.split(',').map((t) => t.trim()) || ['CASH', 'USDC', 'SOL'];
      const capabilities = config.SERVICE_CAPABILITIES?.split(',').map((c) => c.trim()) || [];
      const tags = config.SERVICE_TAGS?.split(',').map((t) => t.trim()) || [];

      await registryClient.registerService({
        name: config.SERVICE_NAME,
        description: config.SERVICE_DESCRIPTION || '',
        url: config.SERVICE_URL,
        category: config.SERVICE_CATEGORY || 'API',
        pricing: {
          amount: config.SERVICE_PRICE || 0.01,
          currency: 'CASH',
        },
        walletAddress: config.TREASURY_WALLET,
        network: config.NETWORK,
        acceptedTokens,
        capabilities,
        tags,
      });

      fastify.log.info({ serviceId: registryClient.getServiceId() }, 'Service registered with x402 registry');

      const heartbeatInterval = setInterval(async () => {
        if (registryClient) {
          try {
            await registryClient.heartbeat();
          } catch (error) {
            fastify.log.warn({ error }, 'Failed to send heartbeat to registry');
          }
        }
      }, 60000);

      fastify.addHook('onClose', async () => {
        clearInterval(heartbeatInterval);
        if (registryClient) {
          try {
            await registryClient.setServiceStatus('PAUSED');
            fastify.log.info('Service status updated to PAUSED');
          } catch (error) {
            fastify.log.warn({ error }, 'Failed to update service status');
          }
        }
      });
    }

    await fastify.listen({
      host: config.HOST,
      port: parseInt(config.PORT, 10),
    });

    fastify.log.info(`Service running on http://${config.HOST}:${config.PORT}`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  fastify.log.info('SIGTERM received, shutting down gracefully');
  await fastify.close();
});

process.on('SIGINT', async () => {
  fastify.log.info('SIGINT received, shutting down gracefully');
  await fastify.close();
});

start();
