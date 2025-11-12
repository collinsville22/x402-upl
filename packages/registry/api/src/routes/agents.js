"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentRoutes = agentRoutes;
const agent_js_1 = require("../services/agent.js");
const service_management_js_1 = require("../services/service-management.js");
const agent_js_2 = require("../schemas/agent.js");
async function agentRoutes(fastify) {
    fastify.post('/agents/register', {
        schema: {
            body: agent_js_2.RegisterAgentSchema,
        },
    }, async (request, reply) => {
        const agent = await agent_js_1.AgentService.register(request.body);
        return reply.status(201).send(agent);
    });
    fastify.get('/agents/:agentId', async (request, reply) => {
        const { agentId } = request.params;
        const agent = await agent_js_1.AgentService.getById(agentId);
        if (!agent) {
            return reply.status(404).send({ error: 'Agent not found' });
        }
        return reply.send(agent);
    });
    fastify.get('/agents/wallet/:walletAddress', async (request, reply) => {
        const { walletAddress } = request.params;
        const agent = await agent_js_1.AgentService.getByWalletAddress(walletAddress);
        if (!agent) {
            return reply.status(404).send({ error: 'Agent not found' });
        }
        return reply.send(agent);
    });
    fastify.patch('/agents/:agentId', {
        schema: {
            body: agent_js_2.UpdateAgentSchema,
        },
    }, async (request, reply) => {
        const { agentId } = request.params;
        const agent = await agent_js_1.AgentService.update(agentId, request.body);
        return reply.send(agent);
    });
    fastify.get('/agents/:agentId/stats', async (request, reply) => {
        const { agentId } = request.params;
        const stats = await agent_js_1.AgentService.getAgentStatistics(agentId);
        if (!stats) {
            return reply.status(404).send({ error: 'Agent not found' });
        }
        return reply.send(stats);
    });
    fastify.post('/transactions/record', {
        schema: {
            body: agent_js_2.RecordTransactionSchema,
        },
    }, async (request, reply) => {
        await agent_js_1.AgentService.recordTransaction(request.body);
        return reply.status(201).send({ success: true });
    });
    fastify.post('/ratings/create', {
        schema: {
            body: agent_js_2.RateServiceSchema,
        },
    }, async (request, reply) => {
        const { transactionId, rating, comment } = request.body;
        const transaction = await fastify.prisma.transaction.findUnique({
            where: { id: transactionId },
        });
        if (!transaction) {
            return reply.status(404).send({ error: 'Transaction not found' });
        }
        await service_management_js_1.ServiceManagement.rateService(transactionId, transaction.agentId, transaction.serviceId, rating, comment);
        return reply.status(201).send({ success: true });
    });
}
//# sourceMappingURL=agents.js.map