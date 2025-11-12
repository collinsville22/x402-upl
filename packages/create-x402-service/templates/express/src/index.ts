import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { createX402Middleware } from '@x402-upl/core';
import { config } from './config.js';
import { registerRoutes } from './routes/index.js';
import { RegistryClient } from './x402/registry-client.js';
import { createTAPMiddleware } from './x402/tap-middleware.js';

const app = express();

const logger = pinoHttp({
  level: config.LOG_LEVEL,
});

app.use(logger);
app.use(helmet());
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());

if (config.ENABLE_TAP) {
  const tapMiddleware = createTAPMiddleware({
    enabled: true,
    registryUrl: config.REGISTRY_URL,
    cacheTimeout: 3600000,
  });
  app.use(tapMiddleware);
}

const paymentMiddleware = createX402Middleware({
  network: config.NETWORK,
  treasuryWallet: config.TREASURY_WALLET,
  redisUrl: config.REDIS_URL,
  onPaymentVerified: (payment) => {
    logger.logger.info({
      signature: payment.signature,
      from: payment.from,
      amount: payment.amount,
      asset: payment.asset,
    }, 'Payment verified');
  },
});

app.use(paymentMiddleware);

registerRoutes(app);

let registryClient: RegistryClient | undefined;

if (config.AUTO_REGISTER_SERVICE && config.SERVICE_URL) {
  registryClient = new RegistryClient(config.REGISTRY_URL);

  registryClient.registerService({
    url: config.SERVICE_URL,
    name: config.SERVICE_NAME || 'x402 Service',
    description: config.SERVICE_DESCRIPTION || 'x402-enabled service',
    category: config.SERVICE_CATEGORY || 'API',
    ownerWalletAddress: config.TREASURY_WALLET,
    pricePerCall: config.SERVICE_PRICE || 0.01,
    acceptedTokens: config.ACCEPTED_TOKENS?.split(',') || ['CASH', 'USDC', 'SOL'],
    capabilities: config.SERVICE_CAPABILITIES?.split(','),
    tags: config.SERVICE_TAGS?.split(','),
  }).catch((error) => {
    logger.logger.error({ error }, 'Failed to auto-register service');
  });
}

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.logger.error(err);
  res.status(500).json({
    error: config.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

const server = app.listen(config.PORT, config.HOST, () => {
  logger.logger.info(`Server running on http://${config.HOST}:${config.PORT}`);
  logger.logger.info(`Environment: ${config.NODE_ENV}`);
  logger.logger.info(`Network: ${config.NETWORK}`);
});

process.on('SIGTERM', async () => {
  logger.logger.info('SIGTERM received, shutting down');

  if (registryClient) {
    await registryClient.updateServiceStatus('PAUSED');
  }

  server.close(() => {
    logger.logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.logger.info('SIGINT received, shutting down');

  if (registryClient) {
    await registryClient.updateServiceStatus('PAUSED');
  }

  server.close(() => {
    logger.logger.info('Server closed');
    process.exit(0);
  });
});
