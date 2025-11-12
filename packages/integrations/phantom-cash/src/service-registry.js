import { X402RegistryClient } from './x402-registry-client.js';
export class ServiceRegistry {
    services;
    registryClient = null;
    useRemoteRegistry;
    constructor(registryUrl) {
        this.services = new Map();
        this.useRemoteRegistry = !!registryUrl;
        if (registryUrl) {
            this.registryClient = new X402RegistryClient(registryUrl);
        }
    }
    convertRemoteToLocal(remote) {
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
    registerService(service) {
        this.services.set(service.serviceId, service);
    }
    async getService(serviceId) {
        if (this.useRemoteRegistry && this.registryClient) {
            try {
                const remote = await this.registryClient.getServiceById(serviceId);
                return this.convertRemoteToLocal(remote);
            }
            catch {
                return undefined;
            }
        }
        return this.services.get(serviceId);
    }
    async listServices() {
        if (this.useRemoteRegistry && this.registryClient) {
            try {
                const remote = await this.registryClient.discoverServices({});
                return remote.map(s => this.convertRemoteToLocal(s));
            }
            catch {
                return Array.from(this.services.values());
            }
        }
        return Array.from(this.services.values());
    }
    async findServicesByCategory(category) {
        if (this.useRemoteRegistry && this.registryClient) {
            try {
                const remote = await this.registryClient.getServicesByCategory(category);
                return remote.map(s => this.convertRemoteToLocal(s));
            }
            catch {
                return (await this.listServices()).filter(service => service.category.some(cat => cat.toLowerCase().includes(category.toLowerCase())));
            }
        }
        return (await this.listServices()).filter(service => service.category.some(cat => cat.toLowerCase().includes(category.toLowerCase())));
    }
    async searchServices(query) {
        if (this.useRemoteRegistry && this.registryClient) {
            try {
                const remote = await this.registryClient.searchServices(query);
                return remote.map(s => this.convertRemoteToLocal(s));
            }
            catch {
                const lowerQuery = query.toLowerCase();
                return (await this.listServices()).filter(service => service.name.toLowerCase().includes(lowerQuery) ||
                    service.description.toLowerCase().includes(lowerQuery) ||
                    service.category.some(cat => cat.toLowerCase().includes(lowerQuery)));
            }
        }
        const lowerQuery = query.toLowerCase();
        return (await this.listServices()).filter(service => service.name.toLowerCase().includes(lowerQuery) ||
            service.description.toLowerCase().includes(lowerQuery) ||
            service.category.some(cat => cat.toLowerCase().includes(lowerQuery)));
    }
    async calculateTotalCost(serviceIds) {
        let total = 0;
        for (const id of serviceIds) {
            const service = await this.getService(id);
            total += service?.costCash || 0;
        }
        return total;
    }
    async getCheapestService(category) {
        if (this.useRemoteRegistry && this.registryClient) {
            try {
                const remote = await this.registryClient.getCheapestService(category);
                return remote ? this.convertRemoteToLocal(remote) : null;
            }
            catch {
                const services = await this.findServicesByCategory(category);
                if (services.length === 0)
                    return null;
                return services.reduce((cheapest, current) => current.costCash < cheapest.costCash ? current : cheapest);
            }
        }
        const services = await this.findServicesByCategory(category);
        if (services.length === 0)
            return null;
        return services.reduce((cheapest, current) => current.costCash < cheapest.costCash ? current : cheapest);
    }
    async getServicesByMaxCost(maxCost) {
        if (this.useRemoteRegistry && this.registryClient) {
            try {
                const remote = await this.registryClient.getServicesByMaxPrice(maxCost);
                return remote.map(s => this.convertRemoteToLocal(s));
            }
            catch {
                return (await this.listServices()).filter(service => service.costCash <= maxCost);
            }
        }
        return (await this.listServices()).filter(service => service.costCash <= maxCost);
    }
}
//# sourceMappingURL=service-registry.js.map