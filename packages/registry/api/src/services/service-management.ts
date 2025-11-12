import { prisma } from '../db/client.js';
import { cacheDelete } from '../cache/redis.js';
import type { RegisterServiceInput, UpdateServiceInput } from '../schemas/service.js';
import type { Service } from '@prisma/client';
import { nanoid } from 'nanoid';

export class ServiceManagement {
  static async register(input: RegisterServiceInput): Promise<Service> {
    const existing = await prisma.service.findUnique({
      where: { url: input.url },
    });

    if (existing) {
      throw new Error('Service already registered with this URL');
    }

    const proxyUrl = this.generateProxyUrl();

    const service = await prisma.service.create({
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

    await cacheDelete('categories:all');

    return service;
  }

  static async update(serviceId: string, input: UpdateServiceInput): Promise<Service> {
    const service = await prisma.service.update({
      where: { id: serviceId },
      data: input,
    });

    await cacheDelete(`service:${serviceId}`);

    return service;
  }

  static async updateMetrics(serviceId: string, responseTimeMs: number, success: boolean): Promise<void> {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) return;

    const newAvgResponseTime = Math.floor(
      (service.averageResponseTimeMs + responseTimeMs) / 2
    );

    await prisma.service.update({
      where: { id: serviceId },
      data: {
        averageResponseTimeMs: newAvgResponseTime,
      },
    });

    const now = new Date();
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

    const existingMetrics = await prisma.serviceMetrics.findFirst({
      where: {
        serviceId,
        timestamp: {
          gte: hourStart,
        },
      },
    });

    if (existingMetrics) {
      await prisma.serviceMetrics.update({
        where: { id: existingMetrics.id },
        data: {
          totalCalls: { increment: 1 },
          successfulCalls: success ? { increment: 1 } : undefined,
          failedCalls: !success ? { increment: 1 } : undefined,
          averageResponseTimeMs: Math.floor(
            (existingMetrics.averageResponseTimeMs + responseTimeMs) / 2
          ),
        },
      });
    } else {
      await prisma.serviceMetrics.create({
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

    await cacheDelete(`service:${serviceId}`);
  }

  static async rateService(
    transactionId: string,
    agentId: string,
    serviceId: string,
    rating: number,
    comment?: string
  ): Promise<void> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.agentId !== agentId) {
      throw new Error('Unauthorized to rate this transaction');
    }

    const existingRating = await prisma.rating.findUnique({
      where: { transactionId },
    });

    if (existingRating) {
      throw new Error('Transaction already rated');
    }

    await prisma.rating.create({
      data: {
        transactionId,
        agentId,
        serviceId,
        rating,
        comment,
      },
    });

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        ratings: true,
      },
    });

    if (!service) return;

    const totalRatings = service.totalRatings + 1;
    const currentAverage = Number(service.averageRating);
    const newAverage = ((currentAverage * service.totalRatings) + rating) / totalRatings;

    const reputationScore = Math.floor(newAverage * 2000);

    await prisma.service.update({
      where: { id: serviceId },
      data: {
        totalRatings,
        averageRating: newAverage,
        reputationScore,
      },
    });

    await cacheDelete(`service:${serviceId}`);
  }

  private static generateProxyUrl(): string {
    const subdomain = nanoid(12);
    return `https://${subdomain}.x402-upl.network`;
  }

  static async verifyService(serviceId: string): Promise<Service> {
    const service = await prisma.service.update({
      where: { id: serviceId },
      data: { verified: true },
    });

    await cacheDelete(`service:${serviceId}`);

    return service;
  }

  static async setVisaTapVerified(serviceId: string, verified: boolean): Promise<Service> {
    const service = await prisma.service.update({
      where: { id: serviceId },
      data: { visaTapVerified: verified },
    });

    await cacheDelete(`service:${serviceId}`);

    return service;
  }

  static async getServicesByOwner(ownerWalletAddress: string): Promise<Service[]> {
    return prisma.service.findMany({
      where: { ownerWalletAddress },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getServiceStats(serviceId: string) {
    const service = await prisma.service.findUnique({
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

    if (!service) return null;

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

  static async rateService(
    serviceId: string,
    agentAddress: string,
    rating: number
  ): Promise<{ success: boolean; newAverageRating: number }> {
    const existingRating = await prisma.rating.findFirst({
      where: {
        serviceId,
        fromAgentAddress: agentAddress,
      },
    });

    if (existingRating) {
      await prisma.rating.update({
        where: { id: existingRating.id },
        data: { rating },
      });
    } else {
      await prisma.rating.create({
        data: {
          serviceId,
          fromAgentAddress: agentAddress,
          rating,
        },
      });
    }

    const allRatings = await prisma.rating.findMany({
      where: { serviceId },
      select: { rating: true },
    });

    const averageRating = allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
      : 0;

    await prisma.service.update({
      where: { id: serviceId },
      data: { averageRating },
    });

    await cacheDelete(`service:${serviceId}`);
    await cacheDelete('discovery:*');

    return {
      success: true,
      newAverageRating: averageRating,
    };
  }
}
