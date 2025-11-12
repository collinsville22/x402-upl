"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.X402RegistryClient = void 0;
const axios_1 = __importDefault(require("axios"));
class X402RegistryClient {
    httpClient;
    registryUrl;
    constructor(registryUrl = 'http://localhost:3001') {
        this.registryUrl = registryUrl;
        this.httpClient = axios_1.default.create({
            baseURL: registryUrl,
            timeout: 10000,
        });
    }
    async registerService(service) {
        const response = await this.httpClient.post('/services/register', service);
        return response.data;
    }
    async discoverServices(query) {
        const response = await this.httpClient.get('/services/discover', { params: query });
        return response.data;
    }
    async getServiceById(serviceId) {
        const response = await this.httpClient.get(`/services/${serviceId}`);
        return response.data;
    }
    async getServicesByCategory(category) {
        return this.discoverServices({ category });
    }
    async searchServices(query) {
        return this.discoverServices({ query });
    }
    async getServicesByMaxPrice(maxPrice) {
        return this.discoverServices({ maxPrice, sortBy: 'price' });
    }
    async getCheapestService(category) {
        const services = await this.discoverServices({
            category,
            sortBy: 'price',
            limit: 1
        });
        return services[0] || null;
    }
    async getAllCategories() {
        const response = await this.httpClient.get('/categories');
        return response.data;
    }
    async updateService(serviceId, updates) {
        const response = await this.httpClient.patch(`/services/${serviceId}`, updates);
        return response.data;
    }
    async rateService(serviceId, agentAddress, rating) {
        await this.httpClient.post(`/services/${serviceId}/rate`, {
            rating,
            agentAddress
        });
    }
    async getServiceStats(serviceId) {
        const response = await this.httpClient.get(`/services/${serviceId}/stats`);
        return response.data;
    }
    async getServiceMetrics(serviceId) {
        const response = await this.httpClient.get(`/services/${serviceId}/metrics`);
        return response.data;
    }
    async getServicesByOwner(walletAddress) {
        const response = await this.httpClient.get(`/services/owner/${walletAddress}`);
        return response.data;
    }
}
exports.X402RegistryClient = X402RegistryClient;
//# sourceMappingURL=x402-registry-client.js.map