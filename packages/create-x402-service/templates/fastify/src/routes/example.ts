import { FastifyPluginAsync } from 'fastify';

const exampleRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/example', async (request, reply) => {
    const body = request.body;

    return reply.send({
      success: true,
      message: 'Request processed successfully',
      data: {
        input: body,
        timestamp: new Date().toISOString(),
        tapVerified: request.headers['x-tap-verified'] === 'true',
        agentDid: request.headers['x-tap-did'] || null,
      },
    });
  });

  fastify.get('/example', async (request, reply) => {
    return reply.send({
      success: true,
      message: 'GET request processed',
      timestamp: new Date().toISOString(),
      tapVerified: request.headers['x-tap-verified'] === 'true',
    });
  });
};

export default exampleRoutes;
