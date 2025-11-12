"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceDiscoveryEngine = void 0;
const axios_1 = __importDefault(require("axios"));
const ioredis_1 = __importDefault(require("ioredis"));
class ServiceDiscoveryEngine {
    httpClient;
    redis;
    cacheTTL;
    registryUrl;
    constructor(config) {
        this.registryUrl = config.registryUrl;
        this.httpClient = axios_1.default.create({
            baseURL: config.registryUrl,
            timeout: 10000,
        });
        this.cacheTTL = config.cacheTTL || 300;
        if (config.redisUrl) {
            this.redis = new ioredis_1.default(config.redisUrl);
        }
    }
    async discoverServices(category) {
        const cacheKey = `services:${category || 'all'}`;
        if (this.redis) {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        }
        try {
            const response = await this.httpClient.get('/services', {
                params: category ? { category } : {},
            });
            const services = response.data.services || response.data;
            if (this.redis) {
                await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(services));
            }
            return services;
        }
        catch (error) {
            console.error('Failed to discover services:', error);
            return [];
        }
    }
    async matchServiceToStep(step) {
        const allServices = await this.discoverServices();
        if (allServices.length === 0) {
            return null;
        }
        const matches = allServices.map((service) => ({
            service,
            score: this.calculateMatchScore(step, service),
            reasoning: this.explainMatch(step, service),
        }));
        matches.sort((a, b) => b.score - a.score);
        const bestMatch = matches[0];
        if (bestMatch.score < 0.3) {
            return null;
        }
        return bestMatch;
    }
    async matchAllSteps(steps) {
        const matches = new Map();
        for (const step of steps) {
            const match = await this.matchServiceToStep(step);
            if (match) {
                matches.set(step.id, match);
            }
        }
        return matches;
    }
    calculateMatchScore(step, service) {
        let score = 0;
        const semanticSimilarity = this.calculateSemanticSimilarity(step.action, service.description);
        score += semanticSimilarity * 0.4;
        const normalizedReputation = service.reputationScore / 10000;
        score += normalizedReputation * 0.3;
        const normalizedPrice = 1 - Math.min(service.pricePerCall / 10, 1);
        score += normalizedPrice * 0.2;
        const normalizedLatency = 1 - Math.min(service.averageResponseTime / 10000, 1);
        score += normalizedLatency * 0.1;
        if (service.verified) {
            score += 0.1;
        }
        if (service.uptimePercentage >= 99) {
            score += 0.05;
        }
        return Math.min(score, 1);
    }
    calculateSemanticSimilarity(text1, text2) {
        const words1 = new Set(text1
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 3));
        const words2 = new Set(text2
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 3));
        const intersection = new Set([...words1].filter((w) => words2.has(w)));
        const union = new Set([...words1, ...words2]);
        if (union.size === 0)
            return 0;
        return intersection.size / union.size;
    }
    explainMatch(step, service) {
        const reasons = [];
        const similarity = this.calculateSemanticSimilarity(step.action, service.description);
        if (similarity > 0.3) {
            reasons.push(`High semantic match (${(similarity * 100).toFixed(0)}%)`);
        }
        if (service.reputationScore > 8000) {
            reasons.push('Excellent reputation');
        }
        if (service.pricePerCall < 1) {
            reasons.push('Cost-effective');
        }
        if (service.verified) {
            reasons.push('Verified service');
        }
        if (service.averageResponseTime < 2000) {
            reasons.push('Fast response time');
        }
        return reasons.join(', ');
    }
    async getServiceById(serviceId) {
        const cacheKey = `service:${serviceId}`;
        if (this.redis) {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        }
        try {
            const response = await this.httpClient.get(`/services/${serviceId}`);
            const service = response.data.service || response.data;
            if (this.redis) {
                await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(service));
            }
            return service;
        }
        catch (error) {
            console.error(`Failed to get service ${serviceId}:`, error);
            return null;
        }
    }
    async rateService(serviceId, agentAddress, rating) {
        try {
            await this.httpClient.post(`/services/${serviceId}/rate`, {
                agentAddress,
                rating,
            });
            if (this.redis) {
                await this.redis.del(`service:${serviceId}`);
                await this.redis.del('services:all');
            }
        }
        catch (error) {
            console.error(`Failed to rate service ${serviceId}:`, error);
        }
    }
    async disconnect() {
        if (this.redis) {
            await this.redis.quit();
        }
    }
}
exports.ServiceDiscoveryEngine = ServiceDiscoveryEngine;
//# sourceMappingURL=service-discovery.js.map