import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import { paymentRoutes } from './routes/payments.js';
import { routingRoutes } from './routes/routing.js';
import { escrowRoutes } from './routes/escrow.js';
import { settlementRoutes } from './routes/settlement.js';
import { transactionRoutes } from './routes/transactions.js';
import { servicesRoutes } from './routes/services.js';
import { apiKeysRoutes } from './routes/api-keys.js';
import { webhookConfigRoutes } from './routes/webhook-config.js';
import { notificationsRoutes } from './routes/notifications.js';
import { RedisClient } from './cache/redis.js';
import { webhookService } from './webhooks/delivery.js';
import { verifyWalletSignature, verifyApiKey } from './middleware/auth.js';
import { setupRateLimiting } from './middleware/rate-limit.js';

const PORT = parseInt(process.env.PORT || '4001', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

  await fastify.register(cors, {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  let redis: RedisClient | null = null;
  try {
    redis = new RedisClient();
    await redis.connect();
    fastify.decorate('redis', redis);
    fastify.log.info('Redis connected successfully');
  } catch (error) {
    fastify.log.warn('Redis connection failed - running without Redis (some features disabled)');
    fastify.decorate('redis', null);
  }

  await setupRateLimiting(fastify);

  fastify.decorate('auth', async (request: FastifyRequest, reply: FastifyReply) => {
    const apiKey = request.headers['x-api-key'];
    if (apiKey) {
      await verifyApiKey(request, reply);
    } else {
      await verifyWalletSignature(request, reply);
    }
  });

  await fastify.register(paymentRoutes);
  await fastify.register(routingRoutes);
  await fastify.register(escrowRoutes);
  await fastify.register(settlementRoutes);
  await fastify.register(transactionRoutes);
  await fastify.register(servicesRoutes);
  await fastify.register(apiKeysRoutes);
  await fastify.register(webhookConfigRoutes);
  await fastify.register(notificationsRoutes);

  setInterval(() => {
    webhookService.retryFailedWebhooks().catch((error) => {
      fastify.log.error('Webhook retry failed:', error);
    });
  }, 60000);

  fastify.get('/health', async (request, reply) => {
    try {
      if (redis) {
        await redis.ping();
      }
      return reply.send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        redis: redis ? 'connected' : 'disabled'
      });
    } catch (error) {
      return reply.status(503).send({
        status: 'unhealthy',
        error: 'Redis connection failed'
      });
    }
  });

  fastify.get('/metrics', async (request, reply) => {
    if (!redis) {
      return reply.status(503).send({ error: 'Redis not available' });
    }
    const metrics = await redis.getMetrics();
    return reply.send(metrics);
  });

  fastify.setErrorHandler(async (error, request, reply) => {
    fastify.log.error(error);

    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: error.validation,
      });
    }

    return reply.status(500).send({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  });

  return fastify;
}

async function start() {
  try {
    const fastify = await buildServer();

    await fastify.listen({ port: PORT, host: HOST });

    process.on('SIGTERM', async () => {
      await fastify.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      await fastify.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
