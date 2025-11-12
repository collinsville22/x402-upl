import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../db/client.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

interface RecordTransactionRequest {
  signature: string;
  amount: string;
  token: string;
  senderAddress: string;
  recipientAddress: string;
  serviceId?: string;
  agentId?: string;
  status: string;
  timestamp: string;
}

export const transactionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: RecordTransactionRequest }>(
    '/api/transactions/record',
    {
      preHandler: [(fastify as any).auth],
      schema: {
        body: {
          type: 'object',
          required: [
            'signature',
            'amount',
            'token',
            'senderAddress',
            'recipientAddress',
            'status',
            'timestamp',
          ],
          properties: {
            signature: { type: 'string' },
            amount: { type: 'string' },
            token: { type: 'string' },
            senderAddress: { type: 'string' },
            recipientAddress: { type: 'string' },
            serviceId: { type: 'string' },
            agentId: { type: 'string' },
            status: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const {
        signature,
        amount,
        token,
        senderAddress,
        recipientAddress,
        serviceId,
        agentId,
        status,
        timestamp,
      } = request.body;

      try {
        const existingTx = await prisma.transaction.findUnique({
          where: { signature },
        });

        if (existingTx) {
          return reply.status(409).send({
            error: 'Transaction already recorded',
            transaction: existingTx,
          });
        }

        const transaction = await prisma.transaction.create({
          data: {
            signature,
            amount,
            token,
            senderAddress,
            recipientAddress,
            serviceId,
            agentId,
            status,
            timestamp: new Date(timestamp),
            confirmedAt: status === 'confirmed' ? new Date() : null,
          },
        });

        return reply.status(201).send({
          transaction: {
            id: transaction.id,
            signature: transaction.signature,
            amount: transaction.amount,
            status: transaction.status,
            timestamp: transaction.timestamp,
          },
        });
      } catch (error) {
        fastify.log.error('Failed to record transaction:', error);

        return reply.status(500).send({
          error: 'Failed to record transaction',
        });
      }
    }
  );

  fastify.get<{ Querystring: { serviceId?: string; agentId?: string; limit?: number } }>(
    '/api/transactions',
    {
      preHandler: [(fastify as any).auth],
      schema: {
        querystring: {
          type: 'object',
          properties: {
            serviceId: { type: 'string' },
            agentId: { type: 'string' },
            limit: { type: 'number', default: 50 },
          },
        },
      },
    },
    async (request, reply) => {
      const { serviceId, agentId, limit = 50 } = request.query;
      const authReq = request as AuthenticatedRequest;

      try {
        const where: any = {};

        where.OR = [
          { recipientAddress: authReq.wallet },
          { senderAddress: authReq.wallet }
        ];

        if (serviceId) {
          where.serviceId = serviceId;
        }

        if (agentId) {
          where.agentId = agentId;
        }

        const transactions = await prisma.transaction.findMany({
          where,
          orderBy: {
            timestamp: 'desc',
          },
          take: limit,
        });

        return reply.send({
          transactions: transactions.map(tx => ({
            id: tx.id,
            signature: tx.signature,
            amount: tx.amount,
            token: tx.token,
            senderAddress: tx.senderAddress,
            recipientAddress: tx.recipientAddress,
            status: tx.status,
            timestamp: tx.timestamp,
            settledAt: tx.settledAt,
          })),
        });
      } catch (error) {
        fastify.log.error('Failed to fetch transactions:', error);

        return reply.status(500).send({
          error: 'Failed to fetch transactions',
        });
      }
    }
  );

  fastify.get<{ Params: { signature: string } }>(
    '/api/transactions/:signature',
    {
      schema: {
        params: {
          type: 'object',
          required: ['signature'],
          properties: {
            signature: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { signature } = request.params;

      try {
        const transaction = await prisma.transaction.findUnique({
          where: { signature },
        });

        if (!transaction) {
          return reply.status(404).send({
            error: 'Transaction not found',
          });
        }

        return reply.send({
          transaction: {
            id: transaction.id,
            signature: transaction.signature,
            amount: transaction.amount,
            token: transaction.token,
            senderAddress: transaction.senderAddress,
            recipientAddress: transaction.recipientAddress,
            serviceId: transaction.serviceId,
            agentId: transaction.agentId,
            status: transaction.status,
            timestamp: transaction.timestamp,
            confirmedAt: transaction.confirmedAt,
            settledAt: transaction.settledAt,
            settlementId: transaction.settlementId,
            settlementSignature: transaction.settlementSignature,
          },
        });
      } catch (error) {
        fastify.log.error('Failed to fetch transaction:', error);

        return reply.status(500).send({
          error: 'Failed to fetch transaction',
        });
      }
    }
  );
};
