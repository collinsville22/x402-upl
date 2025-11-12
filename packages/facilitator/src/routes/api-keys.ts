import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../db/client.js';
import { generateApiKey, hashApiKey } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

interface CreateApiKeyRequest {
  name: string;
  permissions?: string[];
  expiresIn?: number;
}

export const apiKeysRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: CreateApiKeyRequest }>(
    '/api/keys/create',
    {
      preHandler: [fastify.auth],
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            permissions: { type: 'array', items: { type: 'string' } },
            expiresIn: { type: 'number', minimum: 86400 }
          }
        }
      }
    },
    async (request, reply) => {
      const { name, permissions = ['read'], expiresIn } = request.body;
      const authReq = request as AuthenticatedRequest;

      if (!authReq.wallet) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const apiKey = generateApiKey();
      const keyHash = hashApiKey(apiKey);
      const keyPrefix = apiKey.substring(0, 12);

      const existingCount = await prisma.apiKey.count({
        where: {
          merchantWallet: authReq.wallet,
          revoked: false
        }
      });

      if (existingCount >= 10) {
        return reply.status(400).send({
          error: 'API key limit reached',
          message: 'Maximum 10 active API keys per account'
        });
      }

      const apiKeyRecord = await prisma.apiKey.create({
        data: {
          merchantWallet: authReq.wallet,
          name,
          keyHash,
          keyPrefix,
          permissions,
          expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null
        }
      });

      return reply.status(201).send({
        apiKey: {
          id: apiKeyRecord.id,
          name: apiKeyRecord.name,
          key: apiKey,
          keyPrefix: apiKeyRecord.keyPrefix,
          permissions: apiKeyRecord.permissions,
          expiresAt: apiKeyRecord.expiresAt,
          createdAt: apiKeyRecord.createdAt
        },
        warning: 'Save this API key now. It will not be shown again.'
      });
    }
  );

  fastify.get(
    '/api/keys',
    {
      preHandler: [fastify.auth]
    },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;

      if (!authReq.wallet) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const keys = await prisma.apiKey.findMany({
        where: {
          merchantWallet: authReq.wallet
        },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          permissions: true,
          lastUsedAt: true,
          expiresAt: true,
          revoked: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return reply.send({ apiKeys: keys });
    }
  );

  fastify.delete<{ Params: { keyId: string } }>(
    '/api/keys/:keyId',
    {
      preHandler: [fastify.auth],
      schema: {
        params: {
          type: 'object',
          required: ['keyId'],
          properties: {
            keyId: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const { keyId } = request.params;
      const authReq = request as AuthenticatedRequest;

      if (!authReq.wallet) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const apiKey = await prisma.apiKey.findUnique({
        where: { id: keyId }
      });

      if (!apiKey) {
        return reply.status(404).send({ error: 'API key not found' });
      }

      if (apiKey.merchantWallet !== authReq.wallet) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      await prisma.apiKey.update({
        where: { id: keyId },
        data: {
          revoked: true,
          revokedAt: new Date()
        }
      });

      return reply.send({
        message: 'API key revoked successfully',
        keyId
      });
    }
  );

  fastify.put<{ Params: { keyId: string }; Body: { name?: string; permissions?: string[] } }>(
    '/api/keys/:keyId',
    {
      preHandler: [fastify.auth],
      schema: {
        params: {
          type: 'object',
          required: ['keyId'],
          properties: {
            keyId: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            permissions: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    },
    async (request, reply) => {
      const { keyId } = request.params;
      const { name, permissions } = request.body;
      const authReq = request as AuthenticatedRequest;

      if (!authReq.wallet) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const apiKey = await prisma.apiKey.findUnique({
        where: { id: keyId }
      });

      if (!apiKey) {
        return reply.status(404).send({ error: 'API key not found' });
      }

      if (apiKey.merchantWallet !== authReq.wallet) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      const updated = await prisma.apiKey.update({
        where: { id: keyId },
        data: {
          ...(name && { name }),
          ...(permissions && { permissions })
        },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          permissions: true,
          lastUsedAt: true,
          expiresAt: true,
          updatedAt: true
        }
      });

      return reply.send({ apiKey: updated });
    }
  );
};
