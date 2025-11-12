import axios, { AxiosInstance } from 'axios';
import Redis from 'ioredis';
import { ExecutionStep } from '../types/workflow.js';

export interface X402Service {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  pricePerCall: number;
  currency: string;
  capabilities: string[];
  reputationScore: number;
  uptimePercentage: number;
  averageResponseTime: number;
  totalCalls: number;
  owner: string;
  verified: boolean;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface ServiceMatchResult {
  service: X402Service;
  score: number;
  reasoning: string;
}

export interface ServiceDiscoveryConfig {
  registryUrl: string;
  redisUrl?: string;
  cacheTTL?: number;
}

export class ServiceDiscoveryEngine {
  private httpClient: AxiosInstance;
  private redis?: Redis;
  private cacheTTL: number;
  private registryUrl: string;

  constructor(config: ServiceDiscoveryConfig) {
    this.registryUrl = config.registryUrl;
    this.httpClient = axios.create({
      baseURL: config.registryUrl,
      timeout: 10000,
    });

    this.cacheTTL = config.cacheTTL || 300;

    if (config.redisUrl) {
      this.redis = new Redis(config.redisUrl);
    }
  }

  async discoverServices(category?: string): Promise<X402Service[]> {
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

      const services: X402Service[] = response.data.services || response.data;

      if (this.redis) {
        await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(services));
      }

      return services;
    } catch (error) {
      console.error('Failed to discover services:', error);
      return [];
    }
  }

  async matchServiceToStep(step: ExecutionStep): Promise<ServiceMatchResult | null> {
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

  async matchAllSteps(steps: ExecutionStep[]): Promise<Map<string, ServiceMatchResult>> {
    const matches = new Map<string, ServiceMatchResult>();

    for (const step of steps) {
      const match = await this.matchServiceToStep(step);
      if (match) {
        matches.set(step.id, match);
      }
    }

    return matches;
  }

  private calculateMatchScore(step: ExecutionStep, service: X402Service): number {
    let score = 0;

    const semanticSimilarity = this.calculateSemanticSimilarity(
      step.action,
      service.description
    );
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

  private calculateSemanticSimilarity(text1: string, text2: string): number {
    const words1 = new Set(
      text1
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );
    const words2 = new Set(
      text2
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;

    return intersection.size / union.size;
  }

  private explainMatch(step: ExecutionStep, service: X402Service): string {
    const reasons: string[] = [];

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

  async getServiceById(serviceId: string): Promise<X402Service | null> {
    const cacheKey = `service:${serviceId}`;

    if (this.redis) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    try {
      const response = await this.httpClient.get(`/services/${serviceId}`);
      const service: X402Service = response.data.service || response.data;

      if (this.redis) {
        await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(service));
      }

      return service;
    } catch (error) {
      console.error(`Failed to get service ${serviceId}:`, error);
      return null;
    }
  }

  async rateService(serviceId: string, agentAddress: string, rating: number): Promise<void> {
    try {
      await this.httpClient.post(`/services/${serviceId}/rate`, {
        agentAddress,
        rating,
      });

      if (this.redis) {
        await this.redis.del(`service:${serviceId}`);
        await this.redis.del('services:all');
      }
    } catch (error) {
      console.error(`Failed to rate service ${serviceId}:`, error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
