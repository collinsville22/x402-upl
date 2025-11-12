import { prisma } from '../db/client.js';
import { cacheGet, cacheSet } from '../cache/redis.js';
import type { DiscoverServicesInput } from '../schemas/service.js';
import type { Service } from '@prisma/client';

interface ServiceWithScore extends Service {
  valueScore: number;
}

export class ServiceDiscovery {
  private static CACHE_TTL = 60;

  static async discover(params: DiscoverServicesInput): Promise<ServiceWithScore[]> {
    const cacheKey = `discovery:${JSON.stringify(params)}`;

    const cached = await cacheGet<ServiceWithScore[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const where: any = {
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

    const services = await prisma.service.findMany({
      where,
      take: params.limit,
      skip: params.offset,
    });

    const servicesWithScores = services.map(service => {
      const valueScore = this.calculateValueScore(service);
      return { ...service, valueScore };
    });

    const sorted = this.sortServices(servicesWithScores, params.sortBy);

    await cacheSet(cacheKey, sorted, this.CACHE_TTL);

    return sorted;
  }

  static async getServiceById(serviceId: string): Promise<Service | null> {
    const cacheKey = `service:${serviceId}`;

    const cached = await cacheGet<Service>(cacheKey);
    if (cached) {
      return cached;
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (service) {
      await cacheSet(cacheKey, service, this.CACHE_TTL);
    }

    return service;
  }

  static async getServiceByUrl(url: string): Promise<Service | null> {
    return prisma.service.findUnique({
      where: { url },
    });
  }

  private static calculateValueScore(service: Service): number {
    const priceNum = Number(service.pricePerCall);
    if (priceNum === 0) return 0;

    const reputationFactor = service.reputationScore / 10000;
    const uptimeFactor = service.uptimePercentage / 100;
    const qualityScore = (reputationFactor + uptimeFactor) / 2;

    return (qualityScore / priceNum) * 1000;
  }

  private static sortServices(
    services: ServiceWithScore[],
    sortBy: 'price' | 'reputation' | 'value' | 'recent'
  ): ServiceWithScore[] {
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

  static async getAllCategories(): Promise<string[]> {
    const cacheKey = 'categories:all';

    const cached = await cacheGet<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const services = await prisma.service.findMany({
      where: { status: 'ACTIVE' },
      select: { category: true },
      distinct: ['category'],
    });

    const categories = services.map(s => s.category);

    await cacheSet(cacheKey, categories, 300);

    return categories;
  }

  static async getServiceMetrics(serviceId: string) {
    return prisma.serviceMetrics.findMany({
      where: { serviceId },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }
}
