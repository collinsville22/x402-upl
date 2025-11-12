import axios, { AxiosInstance } from 'axios';

export interface X402ServiceRegistration {
  name: string;
  description: string;
  category: string;
  url: string;
  pricePerCall: number;
  ownerWalletAddress: string;
  acceptedTokens: string[];
  capabilities: string[];
  metadata?: Record<string, any>;
}

export interface X402ServiceInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  url: string;
  pricePerCall: number;
  ownerWalletAddress: string;
  acceptedTokens: string[];
  capabilities: string[];
  reputation: number;
  totalCalls: number;
  averageResponseTime: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface X402DiscoveryQuery {
  category?: string;
  minReputation?: number;
  maxPrice?: number;
  capabilities?: string[];
  limit?: number;
  offset?: number;
}

export class X402RegistryClient {
  private httpClient: AxiosInstance;
  private registryUrl: string;

  constructor(registryUrl: string = 'http://localhost:3001') {
    this.registryUrl = registryUrl;
    this.httpClient = axios.create({
      baseURL: registryUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async discoverServices(query: X402DiscoveryQuery = {}): Promise<X402ServiceInfo[]> {
    try {
      const response = await this.httpClient.get('/services/discover', {
        params: query,
      });
      return response.data;
    } catch (error) {
      console.error('Service discovery failed:', error);
      return [];
    }
  }

  async registerService(service: X402ServiceRegistration): Promise<X402ServiceInfo> {
    const response = await this.httpClient.post('/services/register', service);
    return response.data;
  }

  async getServiceById(serviceId: string): Promise<X402ServiceInfo | null> {
    try {
      const response = await this.httpClient.get(`/services/${serviceId}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getServicesByCategory(category: string): Promise<X402ServiceInfo[]> {
    return this.discoverServices({ category });
  }

  async searchServices(query: string): Promise<X402ServiceInfo[]> {
    try {
      const response = await this.httpClient.get('/services/search', {
        params: { q: query },
      });
      return response.data;
    } catch (error) {
      return [];
    }
  }

  async updateService(
    serviceId: string,
    updates: Partial<X402ServiceRegistration>
  ): Promise<X402ServiceInfo | null> {
    try {
      const response = await this.httpClient.patch(`/services/${serviceId}`, updates);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async rateService(serviceId: string, rating: number, agentAddress: string): Promise<void> {
    await this.httpClient.post(`/services/${serviceId}/rate`, {
      rating,
      agentAddress,
    });
  }

  async getCheapestService(category: string): Promise<X402ServiceInfo | null> {
    const services = await this.discoverServices({ category, limit: 100 });

    if (services.length === 0) {
      return null;
    }

    return services.reduce((cheapest, current) => {
      return current.pricePerCall < cheapest.pricePerCall ? current : cheapest;
    });
  }
}
