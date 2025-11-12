"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceManagement = void 0;
const client_js_1 = require("../db/client.js");
const redis_js_1 = require("../cache/redis.js");
const nanoid_1 = require("nanoid");
class ServiceManagement {
    static async register(input) {
        const existing = await client_js_1.prisma.service.findUnique({
            where: { url: input.url },
        });
        if (existing) {
            throw new Error('Service already registered with this URL');
        }
        const proxyUrl = this.generateProxyUrl();
        const service = await client_js_1.prisma.service.create({
            data: {
                url: input.url,
                proxyUrl,
                name: input.name,
                description: input.description,
                category: input.category,
                ownerWalletAddress: input.ownerWalletAddress,
                pricePerCall: input.pricePerCall,
                pricingModel: input.pricingModel,
                acceptedTokens: input.acceptedTokens,
                openapiSchemaUri: input.openapiSchemaUri,
                inputSchema: input.inputSchema,
                outputSchema: input.outputSchema,
                capabilities: input.capabilities,
                tags: input.tags,
            },
        });
        await (0, redis_js_1.cacheDelete)('categories:all');
        return service;
    }
    static async update(serviceId, input) {
        const service = await client_js_1.prisma.service.update({
            where: { id: serviceId },
            data: input,
        });
        await (0, redis_js_1.cacheDelete)(`service:${serviceId}`);
        return service;
    }
    static async updateMetrics(serviceId, responseTimeMs, success) {
        const service = await client_js_1.prisma.service.findUnique({
            where: { id: serviceId },
        });
        if (!service)
            return;
        const newAvgResponseTime = Math.floor((service.averageResponseTimeMs + responseTimeMs) / 2);
        await client_js_1.prisma.service.update({
            where: { id: serviceId },
            data: {
                averageResponseTimeMs: newAvgResponseTime,
            },
        });
        const now = new Date();
        const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
        const existingMetrics = await client_js_1.prisma.serviceMetrics.findFirst({
            where: {
                serviceId,
                timestamp: {
                    gte: hourStart,
                },
            },
        });
        if (existingMetrics) {
            await client_js_1.prisma.serviceMetrics.update({
                where: { id: existingMetrics.id },
                data: {
                    totalCalls: { increment: 1 },
                    successfulCalls: success ? { increment: 1 } : undefined,
                    failedCalls: !success ? { increment: 1 } : undefined,
                    averageResponseTimeMs: Math.floor((existingMetrics.averageResponseTimeMs + responseTimeMs) / 2),
                },
            });
        }
        else {
            await client_js_1.prisma.serviceMetrics.create({
                data: {
                    serviceId,
                    timestamp: hourStart,
                    totalCalls: 1,
                    successfulCalls: success ? 1 : 0,
                    failedCalls: success ? 0 : 1,
                    averageResponseTimeMs: responseTimeMs,
                    p95ResponseTimeMs: responseTimeMs,
                    p99ResponseTimeMs: responseTimeMs,
                    uptimePercentage: success ? 100 : 0,
                    revenue: 0,
                    uniqueAgents: 0,
                },
            });
        }
        await (0, redis_js_1.cacheDelete)(`service:${serviceId}`);
    }
    static async rateService(transactionId, agentId, serviceId, rating, comment) {
        const transaction = await client_js_1.prisma.transaction.findUnique({
            where: { id: transactionId },
        });
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        if (transaction.agentId !== agentId) {
            throw new Error('Unauthorized to rate this transaction');
        }
        const existingRating = await client_js_1.prisma.rating.findUnique({
            where: { transactionId },
        });
        if (existingRating) {
            throw new Error('Transaction already rated');
        }
        await client_js_1.prisma.rating.create({
            data: {
                transactionId,
                agentId,
                serviceId,
                rating,
                comment,
            },
        });
        const service = await client_js_1.prisma.service.findUnique({
            where: { id: serviceId },
            include: {
                ratings: true,
            },
        });
        if (!service)
            return;
        const totalRatings = service.totalRatings + 1;
        const currentAverage = Number(service.averageRating);
        const newAverage = ((currentAverage * service.totalRatings) + rating) / totalRatings;
        const reputationScore = Math.floor(newAverage * 2000);
        await client_js_1.prisma.service.update({
            where: { id: serviceId },
            data: {
                totalRatings,
                averageRating: newAverage,
                reputationScore,
            },
        });
        await (0, redis_js_1.cacheDelete)(`service:${serviceId}`);
    }
    static generateProxyUrl() {
        const subdomain = (0, nanoid_1.nanoid)(12);
        return `https://${subdomain}.x402-upl.network`;
    }
    static async verifyService(serviceId) {
        const service = await client_js_1.prisma.service.update({
            where: { id: serviceId },
            data: { verified: true },
        });
        await (0, redis_js_1.cacheDelete)(`service:${serviceId}`);
        return service;
    }
    static async setVisaTapVerified(serviceId, verified) {
        const service = await client_js_1.prisma.service.update({
            where: { id: serviceId },
            data: { visaTapVerified: verified },
        });
        await (0, redis_js_1.cacheDelete)(`service:${serviceId}`);
        return service;
    }
    static async getServicesByOwner(ownerWalletAddress) {
        return client_js_1.prisma.service.findMany({
            where: { ownerWalletAddress },
            orderBy: { createdAt: 'desc' },
        });
    }
    static async getServiceStats(serviceId) {
        const service = await client_js_1.prisma.service.findUnique({
            where: { id: serviceId },
            include: {
                ratings: {
                    orderBy: { createdAt: 'desc' },
                    take: 100,
                },
                metrics: {
                    orderBy: { timestamp: 'desc' },
                    take: 168,
                },
            },
        });
        if (!service)
            return null;
        const successRate = service.totalCalls > 0
            ? (service.successfulCalls / service.totalCalls) * 100
            : 0;
        return {
            ...service,
            successRate,
            averageRevenue: service.totalCalls > 0
                ? Number(service.totalRevenue) / service.totalCalls
                : 0,
        };
    }
    static async rateService(serviceId, agentAddress, rating) {
        const existingRating = await client_js_1.prisma.rating.findFirst({
            where: {
                serviceId,
                fromAgentAddress: agentAddress,
            },
        });
        if (existingRating) {
            await client_js_1.prisma.rating.update({
                where: { id: existingRating.id },
                data: { rating },
            });
        }
        else {
            await client_js_1.prisma.rating.create({
                data: {
                    serviceId,
                    fromAgentAddress: agentAddress,
                    rating,
                },
            });
        }
        const allRatings = await client_js_1.prisma.rating.findMany({
            where: { serviceId },
            select: { rating: true },
        });
        const averageRating = allRatings.length > 0
            ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
            : 0;
        await client_js_1.prisma.service.update({
            where: { id: serviceId },
            data: { averageRating },
        });
        await (0, redis_js_1.cacheDelete)(`service:${serviceId}`);
        await (0, redis_js_1.cacheDelete)('discovery:*');
        return {
            success: true,
            newAverageRating: averageRating,
        };
    }
}
exports.ServiceManagement = ServiceManagement;
//# sourceMappingURL=service-management.js.map