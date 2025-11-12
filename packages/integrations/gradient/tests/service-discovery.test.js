"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const discovery_js_1 = require("../src/x402/discovery.js");
(0, vitest_1.describe)('ServiceDiscovery Tests', () => {
    let discovery;
    (0, vitest_1.beforeAll)(() => {
        discovery = new discovery_js_1.ServiceDiscovery({
            registryUrl: process.env.X402_REGISTRY_URL || 'http://localhost:4000',
            cacheTimeout: 60000,
        });
    });
    const mockServices = [
        {
            id: 'svc-1',
            name: 'cheap-low-quality',
            description: 'Cheap but low quality service',
            category: 'ai-inference',
            endpoint: 'http://localhost:5001',
            pricePerCall: 0.01,
            currency: 'USDC',
            reputation: 2.5,
            totalRatings: 10,
            provider: 'provider-1',
        },
        {
            id: 'svc-2',
            name: 'expensive-high-quality',
            description: 'Expensive but high quality',
            category: 'ai-inference',
            endpoint: 'http://localhost:5002',
            pricePerCall: 1.00,
            currency: 'USDC',
            reputation: 4.9,
            totalRatings: 100,
            provider: 'provider-2',
        },
        {
            id: 'svc-3',
            name: 'best-value',
            description: 'Great value - good quality, fair price',
            category: 'ai-inference',
            endpoint: 'http://localhost:5003',
            pricePerCall: 0.10,
            currency: 'USDC',
            reputation: 4.8,
            totalRatings: 75,
            provider: 'provider-3',
        },
        {
            id: 'svc-4',
            name: 'moderate',
            description: 'Moderate quality and price',
            category: 'ai-inference',
            endpoint: 'http://localhost:5004',
            pricePerCall: 0.25,
            currency: 'USDC',
            reputation: 4.0,
            totalRatings: 50,
            provider: 'provider-4',
        },
    ];
    (0, vitest_1.describe)('Value-Based Ranking', () => {
        (0, vitest_1.it)('should rank services by value (reputation/price)', () => {
            const ranked = discovery.rankServicesByValue(mockServices, 'value');
            (0, vitest_1.expect)(ranked[0].service.name).toBe('best-value');
            (0, vitest_1.expect)(ranked[0].valueScore).toBeGreaterThan(ranked[1].valueScore);
            ranked.forEach(r => {
                (0, vitest_1.expect)(r.valueScore).toBeGreaterThan(0);
                (0, vitest_1.expect)(r.priceScore).toBeGreaterThan(0);
                (0, vitest_1.expect)(r.reputationScore).toBeGreaterThanOrEqual(0);
                (0, vitest_1.expect)(r.reputationScore).toBeLessThanOrEqual(1);
            });
        });
        (0, vitest_1.it)('should rank services by price when optimizing for price', () => {
            const ranked = discovery.rankServicesByValue(mockServices, 'price');
            (0, vitest_1.expect)(ranked[0].service.pricePerCall).toBeLessThanOrEqual(ranked[1].service.pricePerCall);
            for (let i = 0; i < ranked.length - 1; i++) {
                (0, vitest_1.expect)(ranked[i].priceScore).toBeGreaterThanOrEqual(ranked[i + 1].priceScore);
            }
        });
        (0, vitest_1.it)('should rank services by reputation when optimizing for reputation', () => {
            const ranked = discovery.rankServicesByValue(mockServices, 'reputation');
            (0, vitest_1.expect)(ranked[0].service.reputation).toBeGreaterThanOrEqual(ranked[1].service.reputation);
            for (let i = 0; i < ranked.length - 1; i++) {
                (0, vitest_1.expect)(ranked[i].reputationScore).toBeGreaterThanOrEqual(ranked[i + 1].reputationScore);
            }
        });
    });
    (0, vitest_1.describe)('Value Score Calculations', () => {
        (0, vitest_1.it)('should calculate correct value scores', () => {
            const ranked = discovery.rankServicesByValue(mockServices, 'value');
            ranked.forEach(r => {
                const expectedValueScore = (r.service.reputation / 5) / Math.max(r.service.pricePerCall, 0.001);
                (0, vitest_1.expect)(Math.abs(r.valueScore - expectedValueScore)).toBeLessThan(0.01);
            });
        });
        (0, vitest_1.it)('should normalize reputation scores to 0-1 range', () => {
            const ranked = discovery.rankServicesByValue(mockServices);
            ranked.forEach(r => {
                (0, vitest_1.expect)(r.reputationScore).toBeGreaterThanOrEqual(0);
                (0, vitest_1.expect)(r.reputationScore).toBeLessThanOrEqual(1);
                (0, vitest_1.expect)(r.reputationScore).toBe(r.service.reputation / 5);
            });
        });
    });
    (0, vitest_1.describe)('Service Filtering', () => {
        (0, vitest_1.it)('should filter by reputation', async () => {
            const ranked = discovery.rankServicesByValue(mockServices);
            const highRep = ranked.filter(r => r.service.reputation >= 4.0);
            (0, vitest_1.expect)(highRep.length).toBe(3);
            highRep.forEach(r => {
                (0, vitest_1.expect)(r.service.reputation).toBeGreaterThanOrEqual(4.0);
            });
        });
        (0, vitest_1.it)('should filter by price', () => {
            const ranked = discovery.rankServicesByValue(mockServices);
            const affordable = ranked.filter(r => r.service.pricePerCall <= 0.50);
            (0, vitest_1.expect)(affordable.length).toBe(3);
            affordable.forEach(r => {
                (0, vitest_1.expect)(r.service.pricePerCall).toBeLessThanOrEqual(0.50);
            });
        });
        (0, vitest_1.it)('should filter by category', () => {
            const aiServices = mockServices.filter(s => s.category === 'ai-inference');
            (0, vitest_1.expect)(aiServices).toHaveLength(mockServices.length);
        });
    });
    (0, vitest_1.describe)('Edge Cases', () => {
        (0, vitest_1.it)('should handle empty service list', () => {
            const ranked = discovery.rankServicesByValue([]);
            (0, vitest_1.expect)(ranked).toEqual([]);
        });
        (0, vitest_1.it)('should handle single service', () => {
            const ranked = discovery.rankServicesByValue([mockServices[0]]);
            (0, vitest_1.expect)(ranked).toHaveLength(1);
            (0, vitest_1.expect)(ranked[0].service.id).toBe(mockServices[0].id);
        });
        (0, vitest_1.it)('should handle zero price gracefully', () => {
            const freeService = {
                ...mockServices[0],
                pricePerCall: 0,
            };
            const ranked = discovery.rankServicesByValue([freeService]);
            (0, vitest_1.expect)(ranked[0].priceScore).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should handle very low reputation', () => {
            const lowRepService = {
                ...mockServices[0],
                reputation: 0.1,
            };
            const ranked = discovery.rankServicesByValue([lowRepService]);
            (0, vitest_1.expect)(ranked[0].reputationScore).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(ranked[0].valueScore).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('Caching', () => {
        (0, vitest_1.it)('should cache service discovery results', async () => {
            discovery.clearCache();
            let cacheHits = 0;
            discovery.on('discovery:cache_hit', () => cacheHits++);
            await discovery.discoverServices({ category: 'ai-inference' });
            await discovery.discoverServices({ category: 'ai-inference' });
            (0, vitest_1.expect)(cacheHits).toBe(1);
        });
        (0, vitest_1.it)('should clear cache on demand', () => {
            discovery.clearCache();
            let cacheCleared = false;
            discovery.once('cache:cleared', () => {
                cacheCleared = true;
            });
            discovery.clearCache();
            (0, vitest_1.expect)(cacheCleared).toBe(true);
        });
    });
    (0, vitest_1.describe)('Event Emissions', () => {
        (0, vitest_1.it)('should emit discovery:success on successful discovery', (done) => {
            discovery.once('discovery:success', (data) => {
                (0, vitest_1.expect)(data).toHaveProperty('count');
                done();
            });
            discovery.discoverServices({ limit: 5 }).catch(() => done());
        });
    });
});
//# sourceMappingURL=service-discovery.test.js.map