import { X402RegistryClient, X402ServiceInfo } from './x402-registry-client.js';

export interface X402Service {
  serviceId: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST';
  costCash: number;
  paymentAddress: string;
  parameters: Record<string, ServiceParameter>;
  category: string[];
}

export interface ServiceParameter {
  type: 'string' | 'number' | 'boolean' | 'object';
  description: string;
  required: boolean;
  default?: any;
}

export class ServiceRegistry {
  private services: Map<string, X402Service>;
  private registryClient: X402RegistryClient | null = null;
  private useRemoteRegistry: boolean;

  constructor(registryUrl?: string) {
    this.services = new Map();
    this.useRemoteRegistry = !!registryUrl;
    if (registryUrl) {
      this.registryClient = new X402RegistryClient(registryUrl);
    }
  }

  private convertRemoteToLocal(remote: X402ServiceInfo): X402Service {
    return {
      serviceId: remote.id,
      name: remote.name,
      description: remote.description,
      endpoint: remote.url,
      method: 'POST',
      costCash: remote.pricePerCall,
      paymentAddress: remote.ownerWalletAddress,
      parameters: {},
      category: [remote.category]
    };
  }

  registerService(service: X402Service): void {
    this.services.set(service.serviceId, service);
  }

  async getService(serviceId: string): Promise<X402Service | undefined> {
    if (this.useRemoteRegistry && this.registryClient) {
      try {
        const remote = await this.registryClient.getServiceById(serviceId);
        return this.convertRemoteToLocal(remote);
      } catch {
        return undefined;
      }
    }
    return this.services.get(serviceId);
  }

  async listServices(): Promise<X402Service[]> {
    if (this.useRemoteRegistry && this.registryClient) {
      try {
        const remote = await this.registryClient.discoverServices({});
        return remote.map(s => this.convertRemoteToLocal(s));
      } catch {
        return Array.from(this.services.values());
      }
    }
    return Array.from(this.services.values());
  }

  async findServicesByCategory(category: string): Promise<X402Service[]> {
    if (this.useRemoteRegistry && this.registryClient) {
      try {
        const remote = await this.registryClient.getServicesByCategory(category);
        return remote.map(s => this.convertRemoteToLocal(s));
      } catch {
        return (await this.listServices()).filter(service =>
          service.category.some(cat =>
            cat.toLowerCase().includes(category.toLowerCase())
          )
        );
      }
    }
    return (await this.listServices()).filter(service =>
      service.category.some(cat =>
        cat.toLowerCase().includes(category.toLowerCase())
      )
    );
  }

  async searchServices(query: string): Promise<X402Service[]> {
    if (this.useRemoteRegistry && this.registryClient) {
      try {
        const remote = await this.registryClient.searchServices(query);
        return remote.map(s => this.convertRemoteToLocal(s));
      } catch {
        const lowerQuery = query.toLowerCase();
        return (await this.listServices()).filter(
          service =>
            service.name.toLowerCase().includes(lowerQuery) ||
            service.description.toLowerCase().includes(lowerQuery) ||
            service.category.some(cat => cat.toLowerCase().includes(lowerQuery))
        );
      }
    }
    const lowerQuery = query.toLowerCase();
    return (await this.listServices()).filter(
      service =>
        service.name.toLowerCase().includes(lowerQuery) ||
        service.description.toLowerCase().includes(lowerQuery) ||
        service.category.some(cat => cat.toLowerCase().includes(lowerQuery))
    );
  }

  async calculateTotalCost(serviceIds: string[]): Promise<number> {
    let total = 0;
    for (const id of serviceIds) {
      const service = await this.getService(id);
      total += service?.costCash || 0;
    }
    return total;
  }

  async getCheapestService(category: string): Promise<X402Service | null> {
    if (this.useRemoteRegistry && this.registryClient) {
      try {
        const remote = await this.registryClient.getCheapestService(category);
        return remote ? this.convertRemoteToLocal(remote) : null;
      } catch {
        const services = await this.findServicesByCategory(category);
        if (services.length === 0) return null;
        return services.reduce((cheapest, current) =>
          current.costCash < cheapest.costCash ? current : cheapest
        );
      }
    }
    const services = await this.findServicesByCategory(category);
    if (services.length === 0) return null;
    return services.reduce((cheapest, current) =>
      current.costCash < cheapest.costCash ? current : cheapest
    );
  }

  async getServicesByMaxCost(maxCost: number): Promise<X402Service[]> {
    if (this.useRemoteRegistry && this.registryClient) {
      try {
        const remote = await this.registryClient.getServicesByMaxPrice(maxCost);
        return remote.map(s => this.convertRemoteToLocal(s));
      } catch {
        return (await this.listServices()).filter(service => service.costCash <= maxCost);
      }
    }
    return (await this.listServices()).filter(service => service.costCash <= maxCost);
  }
}
