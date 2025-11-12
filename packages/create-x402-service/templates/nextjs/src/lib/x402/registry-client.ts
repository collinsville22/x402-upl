import axios, { AxiosInstance } from 'axios';
import pino from 'pino';

const logger = pino({ name: 'x402-registry' });

export interface ServiceRegistration {
  name: string;
  description: string;
  url: string;
  category: string;
  pricing: {
    amount: number;
    currency: string;
  };
  walletAddress: string;
  network: string;
  acceptedTokens: string[];
  capabilities?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface Service extends ServiceRegistration {
  serviceId: string;
  status: 'ACTIVE' | 'PAUSED' | 'DEPRECATED';
  reputation?: number;
  totalCalls?: number;
  uptime?: number;
  registeredAt: string;
  lastUpdated: string;
}

export interface ServiceMetrics {
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  totalRevenue: number;
  period: string;
}

export class RegistryClient {
  private client: AxiosInstance;
  private serviceId?: string;
  private registryUrl: string;

  constructor(registryUrl: string) {
    this.registryUrl = registryUrl;
    this.client = axios.create({
      baseURL: registryUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async registerService(registration: ServiceRegistration): Promise<Service> {
    const response = await this.client.post<{ service: Service; serviceId: string }>(
      '/services/register',
      registration
    );

    this.serviceId = response.data.serviceId;
    logger.info({ serviceId: this.serviceId }, 'Service registered with x402 registry');

    return response.data.service;
  }

  async updateService(updates: Partial<ServiceRegistration>): Promise<Service> {
    if (!this.serviceId) {
      throw new Error('Service not registered');
    }

    const response = await this.client.put<{ service: Service }>(
      `/services/${this.serviceId}`,
      updates
    );

    logger.info({ serviceId: this.serviceId }, 'Service updated in registry');
    return response.data.service;
  }

  async setServiceStatus(status: 'ACTIVE' | 'PAUSED' | 'DEPRECATED'): Promise<void> {
    if (!this.serviceId) {
      throw new Error('Service not registered');
    }

    await this.client.patch(`/services/${this.serviceId}/status`, { status });
    logger.info({ serviceId: this.serviceId, status }, 'Service status updated');
  }

  async reportMetrics(metrics: ServiceMetrics): Promise<void> {
    if (!this.serviceId) {
      throw new Error('Service not registered');
    }

    await this.client.post(`/services/${this.serviceId}/metrics`, metrics);
    logger.debug({ serviceId: this.serviceId }, 'Metrics reported to registry');
  }

  async getServiceInfo(): Promise<Service | null> {
    if (!this.serviceId) {
      return null;
    }

    const response = await this.client.get<{ service: Service }>(`/services/${this.serviceId}`);
    return response.data.service;
  }

  async heartbeat(): Promise<void> {
    if (!this.serviceId) {
      throw new Error('Service not registered');
    }

    await this.client.post(`/services/${this.serviceId}/heartbeat`);
    logger.debug({ serviceId: this.serviceId }, 'Heartbeat sent to registry');
  }

  getServiceId(): string | undefined {
    return this.serviceId;
  }
}
