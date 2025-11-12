import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../db/client.js';
import crypto from 'crypto';
import type { AuthenticatedRequest } from '../middleware/auth.js';

interface CreateWebhookRequest {
  webhookUrl: string;
  events?: string[];
}

interface UpdateWebhookRequest {
  webhookUrl?: string;
  events?: string[];
  enabled?: boolean;
}

export const webhookConfigRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: CreateWebhookRequest }>(
    '/api/webhooks/config',
    {
      preHandler: [fastify.auth],
      schema: {
        body: {
          type: 'object',
          required: ['webhookUrl'],
          properties: {
            webhookUrl: { type: 'string', format: 'uri' },
            events: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['settlement.completed', 'settlement.failed', 'payment.verified']
              }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { webhookUrl, events = ['settlement.completed', 'settlement.failed'] } = request.body;
      const authReq = request as AuthenticatedRequest;

      if (!authReq.wallet) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const existingConfig = await prisma.webhookConfig.findFirst({
        where: {
          merchantWallet: authReq.wallet
        }
      });

      if (existingConfig) {
        return reply.status(400).send({
          error: 'Webhook configuration already exists',
          message: 'Update existing configuration or delete it first'
        });
      }

      const webhookSecret = crypto.randomBytes(32).toString('hex');

      const config = await prisma.webhookConfig.create({
        data: {
          merchantWallet: authReq.wallet,
          webhookUrl,
          webhookSecret,
          events,
          enabled: true
        }
      });

      return reply.status(201).send({
        webhookConfig: {
          id: config.id,
          webhookUrl: config.webhookUrl,
          webhookSecret: config.webhookSecret,
          events: config.events,
          enabled: config.enabled,
          createdAt: config.createdAt
        },
        warning: 'Save the webhook secret securely. Use it to verify webhook signatures.'
      });
    }
  );

  fastify.get(
    '/api/webhooks/config',
    {
      preHandler: [fastify.auth]
    },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;

      if (!authReq.wallet) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const config = await prisma.webhookConfig.findFirst({
        where: {
          merchantWallet: authReq.wallet
        },
        select: {
          id: true,
          webhookUrl: true,
          events: true,
          enabled: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!config) {
        return reply.status(404).send({
          error: 'Webhook configuration not found'
        });
      }

      return reply.send({ webhookConfig: config });
    }
  );

  fastify.put<{ Body: UpdateWebhookRequest }>(
    '/api/webhooks/config',
    {
      preHandler: [fastify.auth],
      schema: {
        body: {
          type: 'object',
          properties: {
            webhookUrl: { type: 'string', format: 'uri' },
            events: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['settlement.completed', 'settlement.failed', 'payment.verified']
              }
            },
            enabled: { type: 'boolean' }
          }
        }
      }
    },
    async (request, reply) => {
      const { webhookUrl, events, enabled } = request.body;
      const authReq = request as AuthenticatedRequest;

      if (!authReq.wallet) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const existingConfig = await prisma.webhookConfig.findFirst({
        where: {
          merchantWallet: authReq.wallet
        }
      });

      if (!existingConfig) {
        return reply.status(404).send({
          error: 'Webhook configuration not found'
        });
      }

      const updated = await prisma.webhookConfig.update({
        where: { id: existingConfig.id },
        data: {
          ...(webhookUrl && { webhookUrl }),
          ...(events && { events }),
          ...(enabled !== undefined && { enabled })
        },
        select: {
          id: true,
          webhookUrl: true,
          events: true,
          enabled: true,
          updatedAt: true
        }
      });

      return reply.send({ webhookConfig: updated });
    }
  );

  fastify.delete(
    '/api/webhooks/config',
    {
      preHandler: [fastify.auth]
    },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;

      if (!authReq.wallet) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const config = await prisma.webhookConfig.findFirst({
        where: {
          merchantWallet: authReq.wallet
        }
      });

      if (!config) {
        return reply.status(404).send({
          error: 'Webhook configuration not found'
        });
      }

      await prisma.webhookConfig.delete({
        where: { id: config.id }
      });

      return reply.send({
        message: 'Webhook configuration deleted successfully'
      });
    }
  );

  fastify.post(
    '/api/webhooks/test',
    {
      preHandler: [fastify.auth]
    },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;

      if (!authReq.wallet) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const config = await prisma.webhookConfig.findFirst({
        where: {
          merchantWallet: authReq.wallet,
          enabled: true
        }
      });

      if (!config) {
        return reply.status(404).send({
          error: 'No enabled webhook configuration found'
        });
      }

      const testPayload = {
        eventType: 'webhook.test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook from X402',
          merchantWallet: authReq.wallet
        }
      };

      const timestamp = Math.floor(Date.now() / 1000);
      const data = `${timestamp}.${JSON.stringify(testPayload)}`;
      const signature = crypto
        .createHmac('sha256', config.webhookSecret)
        .update(data)
        .digest('hex');

      try {
        const response = await fetch(config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'x402-facilitator/2.0',
            'X-Webhook-Event': 'webhook.test',
            'X-Webhook-Signature': signature,
            'X-Webhook-Timestamp': timestamp.toString()
          },
          body: JSON.stringify(testPayload),
          signal: AbortSignal.timeout(10000)
        });

        return reply.send({
          success: response.ok,
          statusCode: response.status,
          message: response.ok
            ? 'Webhook test successful'
            : `Webhook test failed with status ${response.status}`
        });
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: 'Webhook test failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );
};
