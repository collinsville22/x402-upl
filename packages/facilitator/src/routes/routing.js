export async function routingRoutes(fastify) {
    fastify.post('/routes/create', {
        preHandler: [fastify.auth]
    }, async (request, reply) => {
        const routeReq = request.body;
        if (!routeReq.sourceService || !routeReq.targetService || !routeReq.amount || !routeReq.asset) {
            return reply.status(400).send({
                error: 'Missing required fields'
            });
        }
        const routeId = `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const route = {
            id: routeId,
            source: routeReq.sourceService,
            target: routeReq.targetService,
            amount: routeReq.amount,
            asset: routeReq.asset,
            hops: routeReq.hops || [],
            status: 'pending',
            createdAt: Date.now()
        };
        await fastify.redis.set(`route:${routeId}`, JSON.stringify(route), 3600);
        return reply.send(route);
    });
    fastify.get('/routes/:routeId', {
        preHandler: [fastify.auth]
    }, async (request, reply) => {
        const { routeId } = request.params;
        const routeData = await fastify.redis.get(`route:${routeId}`);
        if (!routeData) {
            return reply.status(404).send({
                error: 'Route not found'
            });
        }
        return reply.send(JSON.parse(routeData));
    });
    fastify.post('/routes/:routeId/execute', {
        preHandler: [fastify.auth]
    }, async (request, reply) => {
        const { routeId } = request.params;
        const routeData = await fastify.redis.get(`route:${routeId}`);
        if (!routeData) {
            return reply.status(404).send({
                error: 'Route not found'
            });
        }
        const route = JSON.parse(routeData);
        route.status = 'executing';
        route.executedAt = Date.now();
        await fastify.redis.set(`route:${routeId}`, JSON.stringify(route), 3600);
        await fastify.redis.incr('routes:executed:total');
        return reply.send(route);
    });
    fastify.post('/routes/:routeId/complete', {
        preHandler: [fastify.auth]
    }, async (request, reply) => {
        const { routeId } = request.params;
        const { signature } = request.body;
        const routeData = await fastify.redis.get(`route:${routeId}`);
        if (!routeData) {
            return reply.status(404).send({
                error: 'Route not found'
            });
        }
        const route = JSON.parse(routeData);
        route.status = 'completed';
        route.signature = signature;
        route.completedAt = Date.now();
        await fastify.redis.set(`route:${routeId}`, JSON.stringify(route), 86400);
        await fastify.redis.incr('routes:completed:total');
        return reply.send(route);
    });
    fastify.get('/routes/stats', {
        preHandler: [fastify.auth]
    }, async (request, reply) => {
        const created = await fastify.redis.get('routes:created:total') || '0';
        const executed = await fastify.redis.get('routes:executed:total') || '0';
        const completed = await fastify.redis.get('routes:completed:total') || '0';
        return reply.send({
            created: parseInt(created),
            executed: parseInt(executed),
            completed: parseInt(completed)
        });
    });
}
//# sourceMappingURL=routing.js.map