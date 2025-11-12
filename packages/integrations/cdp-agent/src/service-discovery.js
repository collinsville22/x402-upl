import axios from 'axios';
export class ServiceDiscovery {
    bazaarUrl;
    constructor(bazaarUrl = 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources') {
        this.bazaarUrl = bazaarUrl;
    }
    async listAllServices() {
        const response = await axios.get(this.bazaarUrl);
        return response.data;
    }
    async searchServices(query) {
        const services = await this.listAllServices();
        const lowerQuery = query.toLowerCase();
        return services.filter(service => service.description?.toLowerCase().includes(lowerQuery) ||
            service.resource.toLowerCase().includes(lowerQuery) ||
            service.accepts.some(req => req.description?.toLowerCase().includes(lowerQuery)));
    }
    async findServicesByNetwork(network) {
        const services = await this.listAllServices();
        return services.filter(service => service.accepts.some(req => req.network === network));
    }
    async findCheapestService(category) {
        const services = await this.searchServices(category);
        if (services.length === 0)
            return null;
        return services.reduce((cheapest, current) => {
            const cheapestPrice = parseInt(cheapest.accepts[0].maxAmountRequired);
            const currentPrice = parseInt(current.accepts[0].maxAmountRequired);
            return currentPrice < cheapestPrice ? current : cheapest;
        });
    }
    async getServiceDetails(resourceUrl) {
        const services = await this.listAllServices();
        return services.find(s => s.resource === resourceUrl) || null;
    }
}
//# sourceMappingURL=service-discovery.js.map