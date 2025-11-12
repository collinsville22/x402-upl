import type { FastifyInstance } from 'fastify';
import { AgentService } from '../services/agent.js';
import { ServiceManagement } from '../services/service-management.js';
import { RegisterAgentSchema, UpdateAgentSchema, RecordTransactionSchema, RateServiceSchema } from '../schemas/agent.js';

export async function agentRoutes(fastify: FastifyInstance) {
  fastify.post('/agents/register', {
    schema: {
      body: RegisterAgentSchema,
    },
  }, async (request, reply) => {
    const agent = await AgentService.register(request.body);
    return reply.status(201).send(agent);
  });

  fastify.get('/agents/:agentId', async (request, reply) => {
    const { agentId } = request.params as { agentId: string };
    const agent = await AgentService.getById(agentId);

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    return reply.send(agent);
  });

  fastify.get('/agents/wallet/:walletAddress', async (request, reply) => {
    const { walletAddress } = request.params as { walletAddress: string };
    const agent = await AgentService.getByWalletAddress(walletAddress);

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    return reply.send(agent);
  });

  fastify.patch('/agents/:agentId', {
    schema: {
      body: UpdateAgentSchema,
    },
  }, async (request, reply) => {
    const { agentId } = request.params as { agentId: string };
    const agent = await AgentService.update(agentId, request.body);
    return reply.send(agent);
  });

  fastify.get('/agents/:agentId/stats', async (request, reply) => {
    const { agentId } = request.params as { agentId: string };
    const stats = await AgentService.getAgentStatistics(agentId);

    if (!stats) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    return reply.send(stats);
  });

  fastify.post('/transactions/record', {
    schema: {
      body: RecordTransactionSchema,
    },
  }, async (request, reply) => {
    await AgentService.recordTransaction(request.body);
    return reply.status(201).send({ success: true });
  });

  fastify.post('/ratings/create', {
    schema: {
      body: RateServiceSchema,
    },
  }, async (request, reply) => {
    const { transactionId, rating, comment } = request.body;

    const transaction = await fastify.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return reply.status(404).send({ error: 'Transaction not found' });
    }

    await ServiceManagement.rateService(
      transactionId,
      transaction.agentId,
      transaction.serviceId,
      rating,
      comment
    );

    return reply.status(201).send({ success: true });
  });
}
