import axios from 'axios';

export interface X402Service {
  id?: string;
  name: string;
  description: string;
  url: string;
  resource: string;
  category?: string;
  pricePerCall?: number;
  pricing?: {
    amount: string;
    asset: string;
    network: string;
  };
  reputationScore?: number;
  uptimePercentage?: number;
  averageRating?: number;
  method?: string;
  accepts?: Array<{
    scheme: string;
    network: string;
    asset: string;
    maxAmountRequired: string;
  }>;
}

export interface DiscoverOptions {
  query?: string;
  category?: string;
  maxPrice?: number;
  minReputation?: number;
  minUptime?: number;
  tags?: string[];
  sortBy?: 'price' | 'reputation' | 'value' | 'recent';
  limit?: number;
}

export class ServiceDiscovery {
  private registryUrl: string;

  constructor(registryUrl?: string) {
    this.registryUrl = registryUrl || 'http://localhost:3001';
  }

  async discover(options: DiscoverOptions = {}): Promise<X402Service[]> {
    const queryParams = new URLSearchParams();

    if (options.query) queryParams.append('query', options.query);
    if (options.category) queryParams.append('category', options.category);
    if (options.maxPrice !== undefined)
      queryParams.append('maxPrice', options.maxPrice.toString());
    if (options.minReputation !== undefined)
      queryParams.append('minReputation', options.minReputation.toString());
    if (options.minUptime !== undefined)
      queryParams.append('minUptime', options.minUptime.toString());
    if (options.sortBy) queryParams.append('sortBy', options.sortBy);
    if (options.limit !== undefined)
      queryParams.append('limit', options.limit.toString());

    const url = `${this.registryUrl}/services/discover?${queryParams.toString()}`;

    const response = await axios.get(url);
    return response.data;
  }

  async getService(serviceId: string): Promise<X402Service> {
    const url = `${this.registryUrl}/services/${serviceId}`;
    const response = await axios.get(url);
    return response.data;
  }

  async searchServices(query: string): Promise<X402Service[]> {
    return this.discover({ query });
  }

  async findCheapestService(category: string): Promise<X402Service | null> {
    const services = await this.discover({ category, sortBy: 'price', limit: 1 });
    return services.length > 0 ? services[0] : null;
  }

  async getCategories(): Promise<string[]> {
    const url = `${this.registryUrl}/categories`;
    const response = await axios.get(url);
    return response.data;
  }

  async registerService(service: ServiceRegistration): Promise<X402Service> {
    const response = await axios.post(`${this.registryUrl}/services/register`, service);
    return response.data;
  }
}

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
