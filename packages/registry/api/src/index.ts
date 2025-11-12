import Fastify from 'fastify';
import { connectDatabase, prisma } from './db/client.js';
import { serviceRoutes } from './routes/services.js';
import { agentRoutes } from './routes/agents.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  fastify.decorate('prisma', prisma);

  fastify.addHook('onRequest', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  });

  fastify.options('*', async (_request, reply) => {
    return reply.status(204).send();
  });

  await fastify.register(serviceRoutes);
  await fastify.register(agentRoutes);

  fastify.get('/health', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({ status: 'healthy', timestamp: new Date().toISOString() });
    } catch (error) {
      return reply.status(503).send({ status: 'unhealthy', error: 'Database connection failed' });
    }
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
    await connectDatabase();

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
    process.exit(1);
  }
}

start();
