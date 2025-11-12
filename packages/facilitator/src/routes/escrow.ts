import { FastifyInstance } from 'fastify';

interface EscrowRequest {
  buyer: string;
  seller: string;
  amount: string;
  asset: string;
  condition?: string;
}

export async function escrowRoutes(fastify: FastifyInstance) {
  fastify.post('/escrow/create', {
    preHandler: [(fastify as any).auth]
  }, async (request, reply) => {
    const escrowReq = request.body as EscrowRequest;

    if (!escrowReq.buyer || !escrowReq.seller || !escrowReq.amount || !escrowReq.asset) {
      return reply.status(400).send({
        error: 'Missing required fields: buyer, seller, amount, asset'
      });
    }

    const escrowId = `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const escrow = {
      id: escrowId,
      buyer: escrowReq.buyer,
      seller: escrowReq.seller,
      amount: escrowReq.amount,
      asset: escrowReq.asset,
      condition: escrowReq.condition,
      status: 'pending',
      createdAt: Date.now()
    };

    await fastify.redis.set(`escrow:${escrowId}`, JSON.stringify(escrow), 86400);

    await fastify.redis.incr('escrow:created:total');

    return reply.send(escrow);
  });

  fastify.get('/escrow/:escrowId', {
    preHandler: [(fastify as any).auth]
  }, async (request, reply) => {
    const { escrowId } = request.params as any;

    const escrowData = await fastify.redis.get(`escrow:${escrowId}`);

    if (!escrowData) {
      return reply.status(404).send({
        error: 'Escrow not found'
      });
    }

    return reply.send(JSON.parse(escrowData));
  });

  fastify.post('/escrow/:escrowId/fund', {
    preHandler: [(fastify as any).auth]
  }, async (request, reply) => {
    const { escrowId } = request.params as any;
    const { signature } = request.body as any;

    if (!signature) {
      return reply.status(400).send({
        error: 'Missing signature'
      });
    }

    const escrowData = await fastify.redis.get(`escrow:${escrowId}`);

    if (!escrowData) {
      return reply.status(404).send({
        error: 'Escrow not found'
      });
    }

    const escrow = JSON.parse(escrowData);

    if (escrow.status !== 'pending') {
      return reply.status(400).send({
        error: 'Escrow already funded or released'
      });
    }

    escrow.status = 'funded';
    escrow.fundSignature = signature;
    escrow.fundedAt = Date.now();

    await fastify.redis.set(`escrow:${escrowId}`, JSON.stringify(escrow), 86400);

    await fastify.redis.incr('escrow:funded:total');

    return reply.send(escrow);
  });

  fastify.post('/escrow/:escrowId/release', {
    preHandler: [(fastify as any).auth]
  }, async (request, reply) => {
    const { escrowId } = request.params as any;

    const escrowData = await fastify.redis.get(`escrow:${escrowId}`);

    if (!escrowData) {
      return reply.status(404).send({
        error: 'Escrow not found'
      });
    }

    const escrow = JSON.parse(escrowData);

    if (escrow.status !== 'funded') {
      return reply.status(400).send({
        error: 'Escrow must be funded before release'
      });
    }

    escrow.status = 'released';
    escrow.releasedAt = Date.now();

    await fastify.redis.set(`escrow:${escrowId}`, JSON.stringify(escrow), 86400);

    await fastify.redis.incr('escrow:released:total');

    return reply.send(escrow);
  });

  fastify.post('/escrow/:escrowId/refund', {
    preHandler: [(fastify as any).auth]
  }, async (request, reply) => {
    const { escrowId } = request.params as any;
    const { reason } = request.body as any;

    const escrowData = await fastify.redis.get(`escrow:${escrowId}`);

    if (!escrowData) {
      return reply.status(404).send({
        error: 'Escrow not found'
      });
    }

    const escrow = JSON.parse(escrowData);

    if (escrow.status === 'released' || escrow.status === 'refunded') {
      return reply.status(400).send({
        error: 'Escrow already released or refunded'
      });
    }

    escrow.status = 'refunded';
    escrow.refundReason = reason;
    escrow.refundedAt = Date.now();

    await fastify.redis.set(`escrow:${escrowId}`, JSON.stringify(escrow), 86400);

    await fastify.redis.incr('escrow:refunded:total');

    return reply.send(escrow);
  });

  fastify.get('/escrow/stats', {
    preHandler: [(fastify as any).auth]
  }, async (request, reply) => {
    const created = await fastify.redis.get('escrow:created:total') || '0';
    const funded = await fastify.redis.get('escrow:funded:total') || '0';
    const released = await fastify.redis.get('escrow:released:total') || '0';
    const refunded = await fastify.redis.get('escrow:refunded:total') || '0';

    return reply.send({
      created: parseInt(created),
      funded: parseInt(funded),
      released: parseInt(released),
      refunded: parseInt(refunded)
    });
  });
}
