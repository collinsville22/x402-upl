import axios from 'axios';
import pino from 'pino';

const logger = pino({ name: 'registry-client' });

export interface ServiceRegistration {
  url: string;
  name: string;
  description: string;
  category: string;
  ownerWalletAddress: string;
  pricePerCall: number;
  acceptedTokens: string[];
  capabilities?: string[];
  tags?: string[];
}

export interface Service {
  id: string;
  url: string;
  name: string;
  description: string;
  category: string;
  pricePerCall: number;
  acceptedTokens: string[];
  reputationScore: number;
  verified: boolean;
  uptime: number;
}

export class RegistryClient {
  private registryUrl: string;
  private serviceId?: string;

  constructor(registryUrl: string) {
    this.registryUrl = registryUrl;
  }

  async registerService(registration: ServiceRegistration): Promise<Service> {
    try {
      const response = await axios.post(
        `${this.registryUrl}/services/register`,
        registration
      );

      this.serviceId = response.data.serviceId;

      logger.info(
        { serviceId: this.serviceId, name: registration.name },
        'Service registered with x402 registry'
      );

      return response.data.service;
    } catch (error) {
      logger.error({ error }, 'Failed to register service');
      throw error;
    }
  }

  async updateServiceStatus(status: 'ACTIVE' | 'PAUSED' | 'DEPRECATED'): Promise<void> {
    if (!this.serviceId) {
      logger.warn('Service not registered, skipping status update');
      return;
    }

    try {
      await axios.patch(`${this.registryUrl}/services/${this.serviceId}`, {
        status,
      });

      logger.info({ serviceId: this.serviceId, status }, 'Service status updated');
    } catch (error) {
      logger.error({ error }, 'Failed to update service status');
    }
  }

  async reportMetrics(metrics: {
    responseTime: number;
    successRate: number;
  }): Promise<void> {
    if (!this.serviceId) {
      return;
    }

    try {
      await axios.post(`${this.registryUrl}/services/${this.serviceId}/metrics`, metrics);
    } catch (error) {
      logger.error({ error }, 'Failed to report metrics');
    }
  }

  async discover(filters?: {
    category?: string;
    maxPrice?: number;
    minReputation?: number;
  }): Promise<Service[]> {
    try {
      const response = await axios.get(`${this.registryUrl}/services/discover`, {
        params: filters,
      });

      return response.data.services;
    } catch (error) {
      logger.error({ error }, 'Failed to discover services');
      return [];
    }
  }

  getServiceId(): string | undefined {
    return this.serviceId;
  }
}
