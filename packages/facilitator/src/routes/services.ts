import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

interface SearchQuery {
  query?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  tokens?: string[];
  sortBy?: 'price' | 'popularity' | 'rating' | 'recent';
  limit?: number;
  offset?: number;
}

interface ServiceRating {
  serviceId: string;
  rating: number;
  comment?: string;
  agentId: string;
}

export async function servicesRoutes(fastify: FastifyInstance) {
  fastify.get('/api/services', async (request, reply) => {
    try {
      const services = await prisma.service.findMany({
        orderBy: {
          createdAt: 'desc'
        }
      });

      return reply.send(services);
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to fetch services' });
    }
  });

  fastify.get('/api/services/search', async (request, reply) => {
    try {
      const query = request.query as SearchQuery;

      const where: any = {};

      if (query.query) {
        where.OR = [
          { name: { contains: query.query, mode: 'insensitive' } },
          { url: { contains: query.query, mode: 'insensitive' } },
          { description: { contains: query.query, mode: 'insensitive' } }
        ];
      }

      if (query.category) {
        where.category = query.category;
      }

      if (query.minPrice || query.maxPrice) {
        where.pricePerCall = {};
        if (query.minPrice) {
          where.pricePerCall.gte = query.minPrice;
        }
        if (query.maxPrice) {
          where.pricePerCall.lte = query.maxPrice;
        }
      }

      if (query.tokens && query.tokens.length > 0) {
        where.acceptedTokens = {
          hasSome: query.tokens
        };
      }

      let orderBy: any = { createdAt: 'desc' };

      if (query.sortBy === 'price') {
        orderBy = { pricePerCall: 'asc' };
      } else if (query.sortBy === 'recent') {
        orderBy = { createdAt: 'desc' };
      }

      const services = await prisma.service.findMany({
        where,
        orderBy,
        take: query.limit || 50,
        skip: query.offset || 0
      });

      const total = await prisma.service.count({ where });

      return reply.send({
        services,
        total,
        limit: query.limit || 50,
        offset: query.offset || 0
      });
    } catch (error) {
      return reply.status(500).send({ error: 'Search failed' });
    }
  });

  fastify.get('/api/services/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const service = await prisma.service.findUnique({
        where: { id }
      });

      if (!service) {
        return reply.status(404).send({ error: 'Service not found' });
      }

      const transactions = await prisma.transaction.findMany({
        where: { serviceId: id, status: 'confirmed' },
        take: 100
      });

      const totalRevenue = transactions.reduce(
        (sum, tx) => sum + parseFloat(tx.amount),
        0
      );

      const ratings = await prisma.serviceRating.findMany({
        where: { serviceId: id },
        select: { rating: true }
      });

      const averageRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

      const successfulCalls = transactions.filter(tx => tx.status === 'confirmed').length;
      const successRate = transactions.length > 0
        ? (successfulCalls / transactions.length) * 100
        : 0;

      const stats = {
        totalCalls: transactions.length,
        totalRevenue: totalRevenue.toString(),
        averageRating: Math.round(averageRating * 10) / 10,
        successRate: Math.round(successRate * 10) / 10
      };

      return reply.send({
        service,
        stats
      });
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to fetch service' });
    }
  });

  fastify.get('/api/services/:id/recommendations', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const service = await prisma.service.findUnique({
        where: { id }
      });

      if (!service) {
        return reply.status(404).send({ error: 'Service not found' });
      }

      const recommendations = await prisma.service.findMany({
        where: {
          id: { not: id },
          OR: [
            { category: service.category },
            {
              acceptedTokens: {
                hasSome: service.acceptedTokens
              }
            }
          ]
        },
        take: 5,
        orderBy: {
          createdAt: 'desc'
        }
      });

      return reply.send({ recommendations });
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to fetch recommendations' });
    }
  });

  fastify.get('/api/services/categories', async (request, reply) => {
    try {
      const categories = await prisma.service.groupBy({
        by: ['category'],
        where: {
          category: {
            not: null
          }
        },
        _count: {
          id: true
        }
      });

      const formattedCategories = categories.map(c => ({
        category: c.category || 'Uncategorized',
        count: c._count.id
      }));

      return reply.send(formattedCategories);
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to fetch categories' });
    }
  });

  fastify.post('/api/services/:id/rate', {
    preHandler: [(fastify as any).auth]
  }, async (request, reply) => {
    try {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const { rating, comment, agentId } = request.body as ServiceRating;

      if (!rating || rating < 1 || rating > 5) {
        return reply.status(400).send({ error: 'Rating must be between 1 and 5' });
      }

      if (!agentId) {
        return reply.status(400).send({ error: 'Agent ID required' });
      }

      if (authReq.wallet !== agentId) {
        return reply.status(403).send({
          error: 'Access denied',
          message: 'Can only rate services as yourself'
        });
      }

      const service = await prisma.service.findUnique({
        where: { id }
      });

      if (!service) {
        return reply.status(404).send({ error: 'Service not found' });
      }

      const ratingRecord = await prisma.serviceRating.upsert({
        where: {
          serviceId_agentId: {
            serviceId: id,
            agentId
          }
        },
        update: {
          rating,
          comment,
          updatedAt: new Date()
        },
        create: {
          serviceId: id,
          agentId,
          rating,
          comment
        }
      });

      return reply.send({
        success: true,
        message: 'Rating recorded',
        rating: {
          id: ratingRecord.id,
          rating: ratingRecord.rating,
          createdAt: ratingRecord.createdAt
        }
      });
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to record rating' });
    }
  });

  fastify.get('/api/services/:id/reputation', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const transactions = await prisma.transaction.findMany({
        where: { serviceId: id },
        select: { status: true }
      });

      const total = transactions.length;
      const successful = transactions.filter(tx => tx.status === 'confirmed').length;
      const failed = transactions.filter(tx => tx.status === 'failed').length;

      const successRate = total > 0 ? (successful / total) * 100 : 0;
      const failureRate = total > 0 ? (failed / total) * 100 : 0;

      let reputationScore = 5000;

      reputationScore += successful * 10;
      reputationScore -= failed * 50;

      if (successRate < 90 && total > 10) {
        reputationScore -= (90 - successRate) * 10;
      }

      reputationScore = Math.max(0, Math.min(10000, reputationScore));

      return reply.send({
        reputationScore,
        successRate,
        failureRate,
        totalTransactions: total,
        successfulTransactions: successful,
        failedTransactions: failed
      });
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to calculate reputation' });
    }
  });

  fastify.get('/api/services/trending', async (request, reply) => {
    try {
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);

      const recentTransactions = await prisma.transaction.findMany({
        where: {
          timestamp: { gte: last7Days },
          status: 'confirmed',
          serviceId: { not: null }
        },
        select: {
          serviceId: true,
          amount: true
        }
      });

      const serviceStats = recentTransactions.reduce((acc, tx) => {
        if (tx.serviceId) {
          if (!acc[tx.serviceId]) {
            acc[tx.serviceId] = { count: 0, revenue: 0 };
          }
          acc[tx.serviceId].count += 1;
          acc[tx.serviceId].revenue += parseFloat(tx.amount);
        }
        return acc;
      }, {} as Record<string, { count: number; revenue: number }>);

      const trendingServiceIds = Object.entries(serviceStats)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 10)
        .map(([id]) => id);

      const services = await prisma.service.findMany({
        where: {
          id: { in: trendingServiceIds }
        }
      });

      const trending = services.map(service => ({
        ...service,
        stats: serviceStats[service.id]
      }));

      return reply.send({ trending });
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to fetch trending services' });
    }
  });

  fastify.post('/api/services', {
    preHandler: [(fastify as any).auth],
    schema: {
      body: {
        type: 'object',
        required: ['wallet', 'name', 'url', 'pricePerCall', 'acceptedTokens'],
        properties: {
          wallet: { type: 'string' },
          name: { type: 'string' },
          url: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          pricePerCall: { type: 'string' },
          acceptedTokens: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const data = request.body as any;

    if (authReq.wallet !== data.wallet) {
      return reply.status(403).send({
        error: 'Access denied',
        message: 'Can only create services for your own wallet'
      });
    }

    try {
      const service = await prisma.service.create({
        data: {
          merchantWallet: authReq.wallet,
          wallet: data.wallet,
          name: data.name,
          url: data.url,
          description: data.description,
          category: data.category,
          pricePerCall: data.pricePerCall,
          acceptedTokens: data.acceptedTokens
        }
      });

      return reply.status(201).send({ service });
    } catch (error) {
      fastify.log.error('Failed to create service:', error);
      return reply.status(500).send({ error: 'Failed to create service' });
    }
  });
}
