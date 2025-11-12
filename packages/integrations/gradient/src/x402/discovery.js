"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceDiscovery = void 0;
const events_1 = require("events");
const x402_registry_client_js_1 = require("../x402-registry-client.js");
const ioredis_1 = __importDefault(require("ioredis"));
class ServiceDiscovery extends events_1.EventEmitter {
    registryUrl;
    registryClient;
    cache = null;
    redis = null;
    cacheTimeout;
    keyPrefix = 'gradient:services:';
    constructor(config) {
        super();
        this.registryUrl = config.registryUrl.replace(/\/$/, '');
        this.registryClient = new x402_registry_client_js_1.X402RegistryClient(this.registryUrl);
        this.cacheTimeout = config.cacheTimeout || 60000;
        if (config.redisUrl) {
            this.redis = new ioredis_1.default(config.redisUrl);
        }
        else {
            this.cache = new Map();
        }
    }
    convertToServiceInfo(remote) {
        return {
            id: remote.id,
            name: remote.name,
            description: remote.description,
            url: remote.url,
            category: remote.category,
            pricePerCall: remote.pricePerCall,
            reputation: remote.reputation / 2000,
            ownerAddress: remote.ownerWalletAddress,
            status: remote.status,
        };
    }
    async discoverServices(request = {}) {
        const cacheKey = this.getCacheKey(request);
        if (this.redis) {
            const cached = await this.redis.get(this.keyPrefix + cacheKey);
            if (cached) {
                this.emit('discovery:cache_hit', { cacheKey });
                return JSON.parse(cached);
            }
        }
        else if (this.cache) {
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                this.emit('discovery:cache_hit', { cacheKey });
                return cached.services;
            }
        }
        try {
            const query = {
                category: request.category,
                maxPrice: request.maxPrice,
                minReputation: request.minReputation ? request.minReputation * 2000 : undefined,
                limit: request.limit,
            };
            const remoteServices = await this.registryClient.discoverServices(query);
            const services = remoteServices.map(s => this.convertToServiceInfo(s));
            if (this.redis) {
                await this.redis.setex(this.keyPrefix + cacheKey, Math.floor(this.cacheTimeout / 1000), JSON.stringify(services));
            }
            else if (this.cache) {
                this.cache.set(cacheKey, {
                    services,
                    timestamp: Date.now(),
                });
            }
            this.emit('discovery:success', {
                count: services.length,
                category: request.category,
            });
            return services;
        }
        catch (error) {
            this.emit('discovery:error', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    rankServicesByValue(services, optimizeFor = 'value') {
        const scored = services.map(service => {
            const priceNormalized = service.pricePerCall > 0 ? 1 / service.pricePerCall : 1000;
            const reputationNormalized = service.reputation / 5;
            let valueScore;
            switch (optimizeFor) {
                case 'price':
                    valueScore = priceNormalized;
                    break;
                case 'reputation':
                    valueScore = reputationNormalized;
                    break;
                case 'value':
                default:
                    valueScore = (reputationNormalized / Math.max(service.pricePerCall, 0.001));
                    break;
            }
            return {
                service,
                valueScore,
                priceScore: priceNormalized,
                reputationScore: reputationNormalized,
            };
        });
        scored.sort((a, b) => b.valueScore - a.valueScore);
        return scored;
    }
    async findBestService(request) {
        const services = await this.discoverServices(request);
        if (services.length === 0) {
            return null;
        }
        const ranked = this.rankServicesByValue(services, request.optimizeFor || 'value');
        this.emit('discovery:best_service', {
            service: ranked[0].service,
            valueScore: ranked[0].valueScore,
            alternativesCount: ranked.length - 1,
        });
        return ranked[0].service;
    }
    async compareServices(request, minimumComparisons = 3) {
        const services = await this.discoverServices({
            ...request,
            limit: Math.max(request.limit || 10, minimumComparisons),
        });
        const ranked = this.rankServicesByValue(services);
        this.emit('discovery:comparison', {
            compared: ranked.length,
            topService: ranked[0]?.service.name,
            valueScore: ranked[0]?.valueScore,
        });
        return ranked.slice(0, minimumComparisons);
    }
    async clearCache() {
        if (this.redis) {
            const keys = await this.redis.keys(this.keyPrefix + '*');
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        }
        else if (this.cache) {
            this.cache.clear();
        }
        this.emit('cache:cleared');
    }
    async disconnect() {
        if (this.redis) {
            await this.redis.quit();
        }
    }
    getCacheKey(request) {
        return JSON.stringify(request);
    }
}
exports.ServiceDiscovery = ServiceDiscovery;
//# sourceMappingURL=discovery.js.map