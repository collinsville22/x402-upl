import axios from 'axios';
export class X402RegistryClient {
    httpClient;
    registryUrl;
    constructor(registryUrl = 'http://localhost:3001') {
        this.registryUrl = registryUrl;
        this.httpClient = axios.create({
            baseURL: registryUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
    async discoverServices(query = {}) {
        try {
            const response = await this.httpClient.get('/services/discover', {
                params: query,
            });
            return response.data;
        }
        catch (error) {
            return [];
        }
    }
    async registerService(service) {
        const response = await this.httpClient.post('/services/register', service);
        return response.data;
    }
    async getServiceById(serviceId) {
        try {
            const response = await this.httpClient.get(`/services/${serviceId}`);
            return response.data;
        }
        catch (error) {
            return null;
        }
    }
    async getServicesByCategory(category) {
        return this.discoverServices({ category });
    }
    async searchServices(query) {
        try {
            const response = await this.httpClient.get('/services/search', {
                params: { q: query },
            });
            return response.data;
        }
        catch (error) {
            return [];
        }
    }
    async getServicesByOwner(ownerWallet) {
        try {
            const response = await this.httpClient.get(`/services/owner/${ownerWallet}`);
            return response.data;
        }
        catch (error) {
            return [];
        }
    }
    async updateService(serviceId, updates) {
        try {
            const response = await this.httpClient.patch(`/services/${serviceId}`, updates);
            return response.data;
        }
        catch (error) {
            return null;
        }
    }
    async rateService(serviceId, rating, agentAddress) {
        await this.httpClient.post(`/services/${serviceId}/rate`, {
            rating,
            agentAddress,
        });
    }
    async getServiceStats(serviceId) {
        try {
            const response = await this.httpClient.get(`/services/${serviceId}/stats`);
            return response.data;
        }
        catch (error) {
            return null;
        }
    }
    async getCategories() {
        try {
            const response = await this.httpClient.get('/categories');
            return response.data;
        }
        catch (error) {
            return [];
        }
    }
    async getCheapestService(category) {
        const services = await this.discoverServices({ category, limit: 100 });
        if (services.length === 0) {
            return null;
        }
        return services.reduce((cheapest, current) => {
            return current.pricePerCall < cheapest.pricePerCall ? current : cheapest;
        });
    }
    async getBestValueService(category) {
        const services = await this.discoverServices({ category, limit: 100 });
        if (services.length === 0) {
            return null;
        }
        return services.reduce((best, current) => {
            const currentValue = current.reputation / current.pricePerCall;
            const bestValue = best.reputation / best.pricePerCall;
            return currentValue > bestValue ? current : best;
        });
    }
}
//# sourceMappingURL=x402-registry-client.js.map