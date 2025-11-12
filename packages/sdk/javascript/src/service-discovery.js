"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceDiscovery = void 0;
const axios_1 = __importDefault(require("axios"));
class ServiceDiscovery {
    registryUrl;
    constructor(registryUrl) {
        this.registryUrl = registryUrl || 'http://localhost:3001';
    }
    async discover(options = {}) {
        const queryParams = new URLSearchParams();
        if (options.query)
            queryParams.append('query', options.query);
        if (options.category)
            queryParams.append('category', options.category);
        if (options.maxPrice !== undefined)
            queryParams.append('maxPrice', options.maxPrice.toString());
        if (options.minReputation !== undefined)
            queryParams.append('minReputation', options.minReputation.toString());
        if (options.minUptime !== undefined)
            queryParams.append('minUptime', options.minUptime.toString());
        if (options.sortBy)
            queryParams.append('sortBy', options.sortBy);
        if (options.limit !== undefined)
            queryParams.append('limit', options.limit.toString());
        const url = `${this.registryUrl}/services/discover?${queryParams.toString()}`;
        const response = await axios_1.default.get(url);
        return response.data;
    }
    async getService(serviceId) {
        const url = `${this.registryUrl}/services/${serviceId}`;
        const response = await axios_1.default.get(url);
        return response.data;
    }
    async searchServices(query) {
        return this.discover({ query });
    }
    async findCheapestService(category) {
        const services = await this.discover({ category, sortBy: 'price', limit: 1 });
        return services.length > 0 ? services[0] : null;
    }
    async getCategories() {
        const url = `${this.registryUrl}/categories`;
        const response = await axios_1.default.get(url);
        return response.data;
    }
    async registerService(service) {
        const response = await axios_1.default.post(`${this.registryUrl}/services/register`, service);
        return response.data;
    }
}
exports.ServiceDiscovery = ServiceDiscovery;
//# sourceMappingURL=service-discovery.js.map