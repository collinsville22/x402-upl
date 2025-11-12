import axios, { AxiosInstance } from 'axios';

export interface X402ServiceRegistration {
  url: string;
  name: string;
  description: string;
  category: string;
  ownerWalletAddress: string;
  pricePerCall: number;
  pricingModel?: 'FLAT' | 'TIERED' | 'DYNAMIC';
  acceptedTokens: string[];
  openapiSchemaUri?: string;
  inputSchema?: string;
  outputSchema?: string;
  capabilities?: string[];
  tags?: string[];
}

export interface X402ServiceInfo {
  id: string;
  url: string;
  name: string;
  description: string;
  category: string;
  ownerWalletAddress: string;
  pricePerCall: number;
  pricingModel: string;
  acceptedTokens: string[];
  reputation: number;
  totalCalls: number;
  uptime: number;
  averageLatency: number;
  status: 'ACTIVE' | 'PAUSED' | 'DEPRECATED';
  createdAt: string;
  updatedAt: string;
}

export interface X402DiscoveryQuery {
  query?: string;
  category?: string;
  maxPrice?: number;
  minReputation?: number;
  minUptime?: number;
  tags?: string[];
  sortBy?: 'price' | 'reputation' | 'value' | 'recent';
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
    });
  }

  async registerService(service: X402ServiceRegistration): Promise<X402ServiceInfo> {
    const response = await this.httpClient.post('/services/register', service);
    return response.data;
  }

  async discoverServices(query: X402DiscoveryQuery): Promise<X402ServiceInfo[]> {
    const response = await this.httpClient.get('/services/discover', { params: query });
    return response.data;
  }

  async getServiceById(serviceId: string): Promise<X402ServiceInfo> {
    const response = await this.httpClient.get(`/services/${serviceId}`);
    return response.data;
  }

  async getServicesByCategory(category: string): Promise<X402ServiceInfo[]> {
    return this.discoverServices({ category });
  }

  async searchServices(query: string): Promise<X402ServiceInfo[]> {
    return this.discoverServices({ query });
  }

  async getServicesByMaxPrice(maxPrice: number): Promise<X402ServiceInfo[]> {
    return this.discoverServices({ maxPrice, sortBy: 'price' });
  }

  async getCheapestService(category: string): Promise<X402ServiceInfo | null> {
    const services = await this.discoverServices({
      category,
      sortBy: 'price',
      limit: 1
    });
    return services[0] || null;
  }

  async getAllCategories(): Promise<string[]> {
    const response = await this.httpClient.get('/categories');
    return response.data;
  }

  async updateService(serviceId: string, updates: Partial<X402ServiceRegistration>): Promise<X402ServiceInfo> {
    const response = await this.httpClient.patch(`/services/${serviceId}`, updates);
    return response.data;
  }

  async rateService(serviceId: string, agentAddress: string, rating: number): Promise<void> {
    await this.httpClient.post(`/services/${serviceId}/rate`, {
      rating,
      agentAddress
    });
  }

  async getServiceStats(serviceId: string): Promise<any> {
    const response = await this.httpClient.get(`/services/${serviceId}/stats`);
    return response.data;
  }

  async getServiceMetrics(serviceId: string): Promise<any> {
    const response = await this.httpClient.get(`/services/${serviceId}/metrics`);
    return response.data;
  }

  async getServicesByOwner(walletAddress: string): Promise<X402ServiceInfo[]> {
    const response = await this.httpClient.get(`/services/owner/${walletAddress}`);
    return response.data;
  }
}
