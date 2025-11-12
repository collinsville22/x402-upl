import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { Connection, Keypair } from '@solana/web3.js';
import { createX402Middleware } from '@x402-upl/core';
import Redis from 'ioredis';
import pino from 'pino';
import { config } from './config.js';
import { RefundManager } from './refund-manager.js';
import { testEndpoints, registerTestEndpoints } from './test-endpoints.js';

const PORT = parseInt(config.PORT, 10);
const HOST = config.HOST;

async function buildServer() {
  const logger = pino({
    level: config.LOG_LEVEL,
    transport: config.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    } : undefined,
  });

  const fastify = Fastify({ logger });

  await fastify.register(cors, {
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Payment'],
  });

  await fastify.register(rateLimit, {
    max: parseInt(config.RATE_LIMIT_MAX, 10),
    timeWindow: parseInt(config.RATE_LIMIT_WINDOW, 10),
  });

  const connection = new Connection(config.SOLANA_RPC_URL, 'confirmed');
  const refundWallet = Keypair.fromSecretKey(
    Buffer.from(config.REFUND_WALLET_KEYPAIR, 'base64')
  );
  const redis = new Redis(config.REDIS_URL);

  const refundManager = new RefundManager(connection, refundWallet, redis, logger);

  if (config.ENABLE_REFUNDS === 'true') {
    await refundManager.startRefundProcessor();
  }

  const paymentMiddleware = createX402Middleware({
    network: config.NETWORK,
    treasuryWallet: refundWallet.publicKey.toBase58(),
    redisUrl: config.REDIS_URL,
    onPaymentVerified: async (paymentData) => {
      logger.info({
        signature: paymentData.signature,
        from: paymentData.from,
        amount: paymentData.amount,
        asset: paymentData.asset,
      }, 'Payment verified');

      if (config.ENABLE_REFUNDS === 'true') {
        await refundManager.recordPayment(
          paymentData.signature,
          paymentData.from,
          parseFloat(paymentData.amount),
          paymentData.asset,
          paymentData.resource || 'unknown'
        );
      }
    },
  });

  fastify.addHook('preHandler', paymentMiddleware);

  fastify.get('/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    network: config.NETWORK,
    refundsEnabled: config.ENABLE_REFUNDS === 'true',
  }));

  fastify.get('/endpoints', async () => ({
    endpoints: testEndpoints.map(e => ({
      path: e.path,
      method: e.method,
      price: e.price,
      asset: e.asset,
      description: e.description,
      example: `curl -X ${e.method} ${config.NODE_ENV === 'production' ? 'https://sandbox.x402.network' : `http://localhost:${PORT}`}${e.path}`,
    })),
    refundPolicy: 'All payments are automatically refunded within 30 seconds',
    documentation: 'https://docs.x402.network/testing-sandbox',
  }));

  fastify.get('/stats', async () => {
    const refundStats = await refundManager.getStats();
    const walletBalance = await refundManager.getWalletBalance();

    return {
      refunds: refundStats,
      wallet: {
        address: refundWallet.publicKey.toBase58(),
        balance: walletBalance,
      },
      uptime: process.uptime(),
      network: config.NETWORK,
    };
  });

  fastify.get('/refund/:signature', async (request, reply) => {
    const { signature } = request.params as { signature: string };

    const status = await refundManager.getRefundStatus(signature);

    if (!status) {
      return reply.code(404).send({
        error: 'Refund record not found',
        signature,
      });
    }

    return status;
  });

  registerTestEndpoints(fastify);

  fastify.setErrorHandler(async (error, request, reply) => {
    fastify.log.error(error);

    return reply.status(500).send({
      error: config.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: Date.now(),
    });
  });

  return fastify;
}

async function start() {
  try {
    const fastify = await buildServer();

    await fastify.listen({ port: PORT, host: HOST });

    fastify.log.info(`Testing Sandbox running on http://${HOST}:${PORT}`);
    fastify.log.info(`Network: ${config.NETWORK}`);
    fastify.log.info(`Refunds: ${config.ENABLE_REFUNDS === 'true' ? 'Enabled' : 'Disabled'}`);
    fastify.log.info(`Environment: ${config.NODE_ENV}`);

    process.on('SIGTERM', async () => {
      fastify.log.info('SIGTERM received, shutting down gracefully');
      await fastify.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      fastify.log.info('SIGINT received, shutting down gracefully');
      await fastify.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
