import type { FastifyInstance } from 'fastify';
import { ServiceDiscovery } from '../services/discovery.js';
import { ServiceManagement } from '../services/service-management.js';
import { RegisterServiceSchema, UpdateServiceSchema, DiscoverServicesSchema } from '../schemas/service.js';

export async function serviceRoutes(fastify: FastifyInstance) {
  fastify.post('/services/register', {
    schema: {
      body: RegisterServiceSchema,
    },
  }, async (request, reply) => {
    const service = await ServiceManagement.register(request.body);
    return reply.status(201).send(service);
  });

  fastify.get('/services/discover', {
    schema: {
      querystring: DiscoverServicesSchema,
    },
  }, async (request, reply) => {
    const services = await ServiceDiscovery.discover(request.query);
    return reply.send(services);
  });

  fastify.get('/services/:serviceId', async (request, reply) => {
    const { serviceId } = request.params as { serviceId: string };
    const service = await ServiceDiscovery.getServiceById(serviceId);

    if (!service) {
      return reply.status(404).send({ error: 'Service not found' });
    }

    return reply.send(service);
  });

  fastify.patch('/services/:serviceId', {
    schema: {
      body: UpdateServiceSchema,
    },
  }, async (request, reply) => {
    const { serviceId } = request.params as { serviceId: string };
    const service = await ServiceManagement.update(serviceId, request.body);
    return reply.send(service);
  });

  fastify.get('/services/:serviceId/stats', async (request, reply) => {
    const { serviceId } = request.params as { serviceId: string };
    const stats = await ServiceManagement.getServiceStats(serviceId);

    if (!stats) {
      return reply.status(404).send({ error: 'Service not found' });
    }

    return reply.send(stats);
  });

  fastify.get('/services/:serviceId/metrics', async (request, reply) => {
    const { serviceId } = request.params as { serviceId: string };
    const metrics = await ServiceDiscovery.getServiceMetrics(serviceId);
    return reply.send(metrics);
  });

  fastify.get('/categories', async (_request, reply) => {
    const categories = await ServiceDiscovery.getAllCategories();
    return reply.send(categories);
  });

  fastify.post('/services/:serviceId/verify', async (request, reply) => {
    const { serviceId } = request.params as { serviceId: string };
    const service = await ServiceManagement.verifyService(serviceId);
    return reply.send(service);
  });

  fastify.get('/services/owner/:walletAddress', async (request, reply) => {
    const { walletAddress } = request.params as { walletAddress: string };
    const services = await ServiceManagement.getServicesByOwner(walletAddress);
    return reply.send(services);
  });

  fastify.post('/services/:serviceId/rate', async (request, reply) => {
    const { serviceId } = request.params as { serviceId: string };
    const { rating, agentAddress } = request.body as { rating: number; agentAddress: string };

    if (rating < 1 || rating > 5) {
      return reply.status(400).send({ error: 'Rating must be between 1 and 5' });
    }

    const result = await ServiceManagement.rateService(serviceId, agentAddress, rating);

    return reply.send(result);
  });
}
