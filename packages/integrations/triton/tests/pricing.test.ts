import { describe, it, expect, beforeEach } from 'vitest';
import { PricingEngine } from '../src/pricing.js';
import { RPCRequest } from '../src/types.js';

describe('PricingEngine', () => {
  let pricing: PricingEngine;

  beforeEach(() => {
    pricing = new PricingEngine();
    pricing.updateCurrentSlot(1000000);
  });

  describe('calculateCost', () => {
    it('should calculate base cost for getBlock', () => {
      const request: RPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBlock',
        params: [999000],
      };

      const cost = pricing.calculateCost(request, 1000);

      expect(cost.baseCost).toBe(0.0001);
      expect(cost.volumeCost).toBe(0.01);
      expect(cost.totalCost).toBeGreaterThan(0);
    });

    it('should apply age multiplier for old data', () => {
      const oldSlot = 1000000 - 216000 * 31;

      const request: RPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBlock',
        params: [oldSlot],
      };

      const cost = pricing.calculateCost(request, 1000);

      expect(cost.ageMultiplier).toBe(2.0);
      expect(cost.totalCost).toBeGreaterThan(cost.baseCost + cost.volumeCost);
    });

    it('should apply archive multiplier for very old data', () => {
      const archiveSlot = 1000000 - 216000 * 181;

      const request: RPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBlock',
        params: [archiveSlot],
      };

      const cost = pricing.calculateCost(request, 1000);

      expect(cost.ageMultiplier).toBe(5.0);
    });

    it('should calculate cost for getTransaction', () => {
      const request: RPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: ['signature123'],
      };

      const cost = pricing.calculateCost(request, 1);

      expect(cost.baseCost).toBe(0.00005);
      expect(cost.volumeCost).toBe(0);
    });

    it('should calculate cost for getSignaturesForAddress', () => {
      const request: RPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: ['address123', { limit: 100 }],
      };

      const cost = pricing.calculateCost(request, 100);

      expect(cost.baseCost).toBe(0.0001);
      expect(cost.volumeCost).toBe(0.0001);
    });

    it('should return default cost for unknown methods', () => {
      const request: RPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'unknownMethod',
      };

      const cost = pricing.calculateCost(request);

      expect(cost.totalCost).toBe(0.0001);
    });
  });

  describe('estimateDataVolume', () => {
    it('should estimate volume for getBlock', () => {
      const volume = pricing.estimateDataVolume('getBlock');

      expect(volume).toBe(1000);
    });

    it('should estimate volume for getSignaturesForAddress with limit', () => {
      const volume = pricing.estimateDataVolume('getSignaturesForAddress', ['address', { limit: 500 }]);

      expect(volume).toBe(500);
    });

    it('should use default limit for getSignaturesForAddress', () => {
      const volume = pricing.estimateDataVolume('getSignaturesForAddress', ['address']);

      expect(volume).toBe(1000);
    });
  });

  describe('getMethodPricing', () => {
    it('should return pricing tier for known method', () => {
      const tier = pricing.getMethodPricing('getBlock');

      expect(tier).toBeDefined();
      expect(tier?.method).toBe('getBlock');
      expect(tier?.basePrice).toBe(0.0001);
    });

    it('should return undefined for unknown method', () => {
      const tier = pricing.getMethodPricing('unknownMethod');

      expect(tier).toBeUndefined();
    });
  });

  describe('getAllPricingTiers', () => {
    it('should return all pricing tiers', () => {
      const tiers = pricing.getAllPricingTiers();

      expect(tiers.length).toBeGreaterThan(0);
      expect(tiers.some(t => t.method === 'getBlock')).toBe(true);
      expect(tiers.some(t => t.method === 'getTransaction')).toBe(true);
    });
  });
});
