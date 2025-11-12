"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const client_js_1 = require("./db/client.js");
const services_js_1 = require("./routes/services.js");
const agents_js_1 = require("./routes/agents.js");
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
async function buildServer() {
    const fastify = (0, fastify_1.default)({
        logger: {
            level: process.env.LOG_LEVEL || 'info',
        },
    });
    fastify.decorate('prisma', client_js_1.prisma);
    fastify.addHook('onRequest', async (request, reply) => {
        reply.header('Access-Control-Allow-Origin', '*');
        reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        reply.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    });
    fastify.options('*', async (_request, reply) => {
        return reply.status(204).send();
    });
    await fastify.register(services_js_1.serviceRoutes);
    await fastify.register(agents_js_1.agentRoutes);
    fastify.get('/health', async (_request, reply) => {
        try {
            await client_js_1.prisma.$queryRaw `SELECT 1`;
            return reply.send({ status: 'healthy', timestamp: new Date().toISOString() });
        }
        catch (error) {
            return reply.status(503).send({ status: 'unhealthy', error: 'Database connection failed' });
        }
    });
    fastify.setErrorHandler(async (error, request, reply) => {
        fastify.log.error(error);
        if (error.validation) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: error.validation,
            });
        }
        return reply.status(500).send({
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    });
    return fastify;
}
async function start() {
    try {
        await (0, client_js_1.connectDatabase)();
        const fastify = await buildServer();
        await fastify.listen({ port: PORT, host: HOST });
        process.on('SIGTERM', async () => {
            await fastify.close();
            process.exit(0);
        });
        process.on('SIGINT', async () => {
            await fastify.close();
            process.exit(0);
        });
    }
    catch (error) {
        process.exit(1);
    }
}
start();
//# sourceMappingURL=index.js.map