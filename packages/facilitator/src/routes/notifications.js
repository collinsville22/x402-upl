import { prisma } from '../db/client.js';
export const notificationsRoutes = async (fastify) => {
    fastify.get('/api/notifications/preferences', {
        preHandler: [fastify.auth]
    }, async (request, reply) => {
        const authReq = request;
        if (!authReq.wallet) {
            return reply.status(401).send({ error: 'Authentication required' });
        }
        try {
            let prefs = await prisma.notificationPreference.findUnique({
                where: { merchantWallet: authReq.wallet }
            });
            if (!prefs) {
                prefs = await prisma.notificationPreference.create({
                    data: { merchantWallet: authReq.wallet }
                });
            }
            return reply.send({ preferences: prefs });
        }
        catch (error) {
            fastify.log.error('Failed to fetch notification preferences:', error);
            return reply.status(500).send({ error: 'Failed to fetch preferences' });
        }
    });
    fastify.put('/api/notifications/preferences', {
        preHandler: [fastify.auth]
    }, async (request, reply) => {
        const authReq = request;
        if (!authReq.wallet) {
            return reply.status(401).send({ error: 'Authentication required' });
        }
        const data = request.body;
        try {
            const prefs = await prisma.notificationPreference.upsert({
                where: { merchantWallet: authReq.wallet },
                update: data,
                create: {
                    merchantWallet: authReq.wallet,
                    ...data
                }
            });
            return reply.send({ preferences: prefs });
        }
        catch (error) {
            fastify.log.error('Failed to update notification preferences:', error);
            return reply.status(500).send({ error: 'Failed to update preferences' });
        }
    });
};
//# sourceMappingURL=notifications.js.map