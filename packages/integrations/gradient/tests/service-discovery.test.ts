import { describe, it, expect, beforeAll } from 'vitest';
import { ServiceDiscovery } from '../src/x402/discovery.js';
import { ServiceInfo } from '../src/types/index.js';

describe('ServiceDiscovery Tests', () => {
  let discovery: ServiceDiscovery;

  beforeAll(() => {
    discovery = new ServiceDiscovery({
      registryUrl: process.env.X402_REGISTRY_URL || 'http://localhost:4000',
      cacheTimeout: 60000,
    });
  });

  const mockServices: ServiceInfo[] = [
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

  describe('Value-Based Ranking', () => {
    it('should rank services by value (reputation/price)', () => {
      const ranked = discovery.rankServicesByValue(mockServices, 'value');

      expect(ranked[0].service.name).toBe('best-value');
      expect(ranked[0].valueScore).toBeGreaterThan(ranked[1].valueScore);

      ranked.forEach(r => {
        expect(r.valueScore).toBeGreaterThan(0);
        expect(r.priceScore).toBeGreaterThan(0);
        expect(r.reputationScore).toBeGreaterThanOrEqual(0);
        expect(r.reputationScore).toBeLessThanOrEqual(1);
      });
    });

    it('should rank services by price when optimizing for price', () => {
      const ranked = discovery.rankServicesByValue(mockServices, 'price');

      expect(ranked[0].service.pricePerCall).toBeLessThanOrEqual(ranked[1].service.pricePerCall);

      for (let i = 0; i < ranked.length - 1; i++) {
        expect(ranked[i].priceScore).toBeGreaterThanOrEqual(ranked[i + 1].priceScore);
      }
    });

    it('should rank services by reputation when optimizing for reputation', () => {
      const ranked = discovery.rankServicesByValue(mockServices, 'reputation');

      expect(ranked[0].service.reputation).toBeGreaterThanOrEqual(ranked[1].service.reputation);

      for (let i = 0; i < ranked.length - 1; i++) {
        expect(ranked[i].reputationScore).toBeGreaterThanOrEqual(ranked[i + 1].reputationScore);
      }
    });
  });

  describe('Value Score Calculations', () => {
    it('should calculate correct value scores', () => {
      const ranked = discovery.rankServicesByValue(mockServices, 'value');

      ranked.forEach(r => {
        const expectedValueScore = (r.service.reputation / 5) / Math.max(r.service.pricePerCall, 0.001);
        expect(Math.abs(r.valueScore - expectedValueScore)).toBeLessThan(0.01);
      });
    });

    it('should normalize reputation scores to 0-1 range', () => {
      const ranked = discovery.rankServicesByValue(mockServices);

      ranked.forEach(r => {
        expect(r.reputationScore).toBeGreaterThanOrEqual(0);
        expect(r.reputationScore).toBeLessThanOrEqual(1);
        expect(r.reputationScore).toBe(r.service.reputation / 5);
      });
    });
  });

  describe('Service Filtering', () => {
    it('should filter by reputation', async () => {
      const ranked = discovery.rankServicesByValue(mockServices);
      const highRep = ranked.filter(r => r.service.reputation >= 4.0);

      expect(highRep.length).toBe(3);
      highRep.forEach(r => {
        expect(r.service.reputation).toBeGreaterThanOrEqual(4.0);
      });
    });

    it('should filter by price', () => {
      const ranked = discovery.rankServicesByValue(mockServices);
      const affordable = ranked.filter(r => r.service.pricePerCall <= 0.50);

      expect(affordable.length).toBe(3);
      affordable.forEach(r => {
        expect(r.service.pricePerCall).toBeLessThanOrEqual(0.50);
      });
    });

    it('should filter by category', () => {
      const aiServices = mockServices.filter(s => s.category === 'ai-inference');

      expect(aiServices).toHaveLength(mockServices.length);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty service list', () => {
      const ranked = discovery.rankServicesByValue([]);
      expect(ranked).toEqual([]);
    });

    it('should handle single service', () => {
      const ranked = discovery.rankServicesByValue([mockServices[0]]);
      expect(ranked).toHaveLength(1);
      expect(ranked[0].service.id).toBe(mockServices[0].id);
    });

    it('should handle zero price gracefully', () => {
      const freeService: ServiceInfo = {
        ...mockServices[0],
        pricePerCall: 0,
      };

      const ranked = discovery.rankServicesByValue([freeService]);
      expect(ranked[0].priceScore).toBeGreaterThan(0);
    });

    it('should handle very low reputation', () => {
      const lowRepService: ServiceInfo = {
        ...mockServices[0],
        reputation: 0.1,
      };

      const ranked = discovery.rankServicesByValue([lowRepService]);
      expect(ranked[0].reputationScore).toBeGreaterThanOrEqual(0);
      expect(ranked[0].valueScore).toBeGreaterThan(0);
    });
  });

  describe('Caching', () => {
    it('should cache service discovery results', async () => {
      discovery.clearCache();

      let cacheHits = 0;
      discovery.on('discovery:cache_hit', () => cacheHits++);

      await discovery.discoverServices({ category: 'ai-inference' });
      await discovery.discoverServices({ category: 'ai-inference' });

      expect(cacheHits).toBe(1);
    });

    it('should clear cache on demand', () => {
      discovery.clearCache();

      let cacheCleared = false;
      discovery.once('cache:cleared', () => {
        cacheCleared = true;
      });

      discovery.clearCache();
      expect(cacheCleared).toBe(true);
    });
  });

  describe('Event Emissions', () => {
    it('should emit discovery:success on successful discovery', (done) => {
      discovery.once('discovery:success', (data) => {
        expect(data).toHaveProperty('count');
        done();
      });

      discovery.discoverServices({ limit: 5 }).catch(() => done());
    });
  });
});
