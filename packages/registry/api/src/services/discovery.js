"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceDiscovery = void 0;
const client_js_1 = require("../db/client.js");
const redis_js_1 = require("../cache/redis.js");
class ServiceDiscovery {
    static CACHE_TTL = 60;
    static async discover(params) {
        const cacheKey = `discovery:${JSON.stringify(params)}`;
        const cached = await (0, redis_js_1.cacheGet)(cacheKey);
        if (cached) {
            return cached;
        }
        const where = {
            status: 'ACTIVE',
        };
        if (params.category) {
            where.category = params.category;
        }
        if (params.maxPrice) {
            where.pricePerCall = { lte: params.maxPrice };
        }
        if (params.minReputation) {
            where.reputationScore = { gte: params.minReputation };
        }
        if (params.minUptime) {
            where.uptimePercentage = { gte: params.minUptime };
        }
        if (params.tags && params.tags.length > 0) {
            where.tags = { hasSome: params.tags };
        }
        if (params.query) {
            where.OR = [
                { name: { contains: params.query, mode: 'insensitive' } },
                { description: { contains: params.query, mode: 'insensitive' } },
                { capabilities: { hasSome: [params.query] } },
            ];
        }
        const services = await client_js_1.prisma.service.findMany({
            where,
            take: params.limit,
            skip: params.offset,
        });
        const servicesWithScores = services.map(service => {
            const valueScore = this.calculateValueScore(service);
            return { ...service, valueScore };
        });
        const sorted = this.sortServices(servicesWithScores, params.sortBy);
        await (0, redis_js_1.cacheSet)(cacheKey, sorted, this.CACHE_TTL);
        return sorted;
    }
    static async getServiceById(serviceId) {
        const cacheKey = `service:${serviceId}`;
        const cached = await (0, redis_js_1.cacheGet)(cacheKey);
        if (cached) {
            return cached;
        }
        const service = await client_js_1.prisma.service.findUnique({
            where: { id: serviceId },
        });
        if (service) {
            await (0, redis_js_1.cacheSet)(cacheKey, service, this.CACHE_TTL);
        }
        return service;
    }
    static async getServiceByUrl(url) {
        return client_js_1.prisma.service.findUnique({
            where: { url },
        });
    }
    static calculateValueScore(service) {
        const priceNum = Number(service.pricePerCall);
        if (priceNum === 0)
            return 0;
        const reputationFactor = service.reputationScore / 10000;
        const uptimeFactor = service.uptimePercentage / 100;
        const qualityScore = (reputationFactor + uptimeFactor) / 2;
        return (qualityScore / priceNum) * 1000;
    }
    static sortServices(services, sortBy) {
        switch (sortBy) {
            case 'price':
                return services.sort((a, b) => Number(a.pricePerCall) - Number(b.pricePerCall));
            case 'reputation':
                return services.sort((a, b) => b.reputationScore - a.reputationScore);
            case 'value':
                return services.sort((a, b) => b.valueScore - a.valueScore);
            case 'recent':
                return services.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            default:
                return services;
        }
    }
    static async getAllCategories() {
        const cacheKey = 'categories:all';
        const cached = await (0, redis_js_1.cacheGet)(cacheKey);
        if (cached) {
            return cached;
        }
        const services = await client_js_1.prisma.service.findMany({
            where: { status: 'ACTIVE' },
            select: { category: true },
            distinct: ['category'],
        });
        const categories = services.map(s => s.category);
        await (0, redis_js_1.cacheSet)(cacheKey, categories, 300);
        return categories;
    }
    static async getServiceMetrics(serviceId) {
        return client_js_1.prisma.serviceMetrics.findMany({
            where: { serviceId },
            orderBy: { timestamp: 'desc' },
            take: 100,
        });
    }
}
exports.ServiceDiscovery = ServiceDiscovery;
//# sourceMappingURL=discovery.js.map