"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceRoutes = serviceRoutes;
const discovery_js_1 = require("../services/discovery.js");
const service_management_js_1 = require("../services/service-management.js");
const service_js_1 = require("../schemas/service.js");
async function serviceRoutes(fastify) {
    fastify.post('/services/register', {
        schema: {
            body: service_js_1.RegisterServiceSchema,
        },
    }, async (request, reply) => {
        const service = await service_management_js_1.ServiceManagement.register(request.body);
        return reply.status(201).send(service);
    });
    fastify.get('/services/discover', {
        schema: {
            querystring: service_js_1.DiscoverServicesSchema,
        },
    }, async (request, reply) => {
        const services = await discovery_js_1.ServiceDiscovery.discover(request.query);
        return reply.send(services);
    });
    fastify.get('/services/:serviceId', async (request, reply) => {
        const { serviceId } = request.params;
        const service = await discovery_js_1.ServiceDiscovery.getServiceById(serviceId);
        if (!service) {
            return reply.status(404).send({ error: 'Service not found' });
        }
        return reply.send(service);
    });
    fastify.patch('/services/:serviceId', {
        schema: {
            body: service_js_1.UpdateServiceSchema,
        },
    }, async (request, reply) => {
        const { serviceId } = request.params;
        const service = await service_management_js_1.ServiceManagement.update(serviceId, request.body);
        return reply.send(service);
    });
    fastify.get('/services/:serviceId/stats', async (request, reply) => {
        const { serviceId } = request.params;
        const stats = await service_management_js_1.ServiceManagement.getServiceStats(serviceId);
        if (!stats) {
            return reply.status(404).send({ error: 'Service not found' });
        }
        return reply.send(stats);
    });
    fastify.get('/services/:serviceId/metrics', async (request, reply) => {
        const { serviceId } = request.params;
        const metrics = await discovery_js_1.ServiceDiscovery.getServiceMetrics(serviceId);
        return reply.send(metrics);
    });
    fastify.get('/categories', async (_request, reply) => {
        const categories = await discovery_js_1.ServiceDiscovery.getAllCategories();
        return reply.send(categories);
    });
    fastify.post('/services/:serviceId/verify', async (request, reply) => {
        const { serviceId } = request.params;
        const service = await service_management_js_1.ServiceManagement.verifyService(serviceId);
        return reply.send(service);
    });
    fastify.get('/services/owner/:walletAddress', async (request, reply) => {
        const { walletAddress } = request.params;
        const services = await service_management_js_1.ServiceManagement.getServicesByOwner(walletAddress);
        return reply.send(services);
    });
    fastify.post('/services/:serviceId/rate', async (request, reply) => {
        const { serviceId } = request.params;
        const { rating, agentAddress } = request.body;
        if (rating < 1 || rating > 5) {
            return reply.status(400).send({ error: 'Rating must be between 1 and 5' });
        }
        const result = await service_management_js_1.ServiceManagement.rateService(serviceId, agentAddress, rating);
        return reply.send(result);
    });
}
//# sourceMappingURL=services.js.map