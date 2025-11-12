import axios from 'axios';

export interface X402Service {
  resource: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  accepts: PaymentRequirement[];
  description?: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
}

export interface PaymentRequirement {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  asset: string;
  payTo: string;
  resource: string;
  description?: string;
  mimeType?: string;
  outputSchema?: Record<string, any>;
  maxTimeoutSeconds?: number;
}

export class ServiceDiscovery {
  private bazaarUrl: string;

  constructor(bazaarUrl: string = 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources') {
    this.bazaarUrl = bazaarUrl;
  }

  async listAllServices(): Promise<X402Service[]> {
    const response = await axios.get(this.bazaarUrl);
    return response.data;
  }

  async searchServices(query: string): Promise<X402Service[]> {
    const services = await this.listAllServices();

    const lowerQuery = query.toLowerCase();
    return services.filter(service =>
      service.description?.toLowerCase().includes(lowerQuery) ||
      service.resource.toLowerCase().includes(lowerQuery) ||
      service.accepts.some(req => req.description?.toLowerCase().includes(lowerQuery))
    );
  }

  async findServicesByNetwork(network: string): Promise<X402Service[]> {
    const services = await this.listAllServices();
    return services.filter(service =>
      service.accepts.some(req => req.network === network)
    );
  }

  async findCheapestService(category: string): Promise<X402Service | null> {
    const services = await this.searchServices(category);

    if (services.length === 0) return null;

    return services.reduce((cheapest, current) => {
      const cheapestPrice = parseInt(cheapest.accepts[0].maxAmountRequired);
      const currentPrice = parseInt(current.accepts[0].maxAmountRequired);
      return currentPrice < cheapestPrice ? current : cheapest;
    });
  }

  async getServiceDetails(resourceUrl: string): Promise<X402Service | null> {
    const services = await this.listAllServices();
    return services.find(s => s.resource === resourceUrl) || null;
  }
}
