import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';
export async function paymentRoutes(fastify) {
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
    fastify.post('/verify', {
        preHandler: [fastify.auth]
    }, async (request, reply) => {
        const { signature, expectedAmount, recipient } = request.body;
        if (!signature || !expectedAmount || !recipient) {
            return reply.status(400).send({
                error: 'Missing required fields: signature, expectedAmount, recipient'
            });
        }
        try {
            const tx = await connection.getTransaction(signature, {
                commitment: 'confirmed',
            });
            if (!tx || !tx.meta) {
                return reply.status(404).send({
                    verified: false,
                    error: 'Transaction not found'
                });
            }
            const recipientPubkey = new PublicKey(recipient);
            const recipientIndex = tx.transaction.message.accountKeys.findIndex(key => key.equals(recipientPubkey));
            if (recipientIndex === -1) {
                return reply.send({
                    verified: false,
                    error: 'Recipient not found in transaction'
                });
            }
            const lamportsReceived = tx.meta.postBalances[recipientIndex] - tx.meta.preBalances[recipientIndex];
            const solReceived = lamportsReceived / 1_000_000_000;
            const expected = parseFloat(expectedAmount);
            const verified = Math.abs(solReceived - expected) < 0.000001;
            await fastify.redis.incr('payments:verified:total');
            if (verified) {
                await fastify.redis.incr('payments:verified:success');
            }
            return reply.send({
                verified,
                amount: solReceived,
                expected,
                signature,
                timestamp: new Date(tx.blockTime * 1000).toISOString()
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                verified: false,
                error: error.message
            });
        }
    });
    fastify.post('/route', {
        preHandler: [fastify.auth]
    }, async (request, reply) => {
        const { from, to, amount, asset } = request.body;
        if (!from || !to || !amount || !asset) {
            return reply.status(400).send({
                error: 'Missing required fields: from, to, amount, asset'
            });
        }
        const routeId = `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await fastify.redis.set(`route:${routeId}`, JSON.stringify({ from, to, amount, asset, status: 'pending', createdAt: Date.now() }), 3600);
        await fastify.redis.incr('routes:created:total');
        return reply.send({
            routeId,
            from,
            to,
            amount,
            asset,
            status: 'pending'
        });
    });
    fastify.get('/route/:routeId', {
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
    fastify.post('/notify', {
        preHandler: [fastify.auth]
    }, async (request, reply) => {
        const { webhookUrl, event, data } = request.body;
        if (!webhookUrl || !event) {
            return reply.status(400).send({
                error: 'Missing required fields: webhookUrl, event'
            });
        }
        try {
            await axios.post(webhookUrl, {
                event,
                data,
                timestamp: Date.now()
            }, {
                timeout: 5000
            });
            await fastify.redis.incr('webhooks:sent:total');
            return reply.send({ success: true });
        }
        catch (error) {
            fastify.log.error('Webhook delivery failed:', error);
            await fastify.redis.incr('webhooks:failed:total');
            return reply.status(500).send({
                success: false,
                error: error.message
            });
        }
    });
}
//# sourceMappingURL=payments.js.map