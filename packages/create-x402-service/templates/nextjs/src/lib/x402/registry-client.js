import axios from 'axios';
import pino from 'pino';
const logger = pino({ name: 'x402-registry' });
export class RegistryClient {
    client;
    serviceId;
    registryUrl;
    constructor(registryUrl) {
        this.registryUrl = registryUrl;
        this.client = axios.create({
            baseURL: registryUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
    async registerService(registration) {
        const response = await this.client.post('/services/register', registration);
        this.serviceId = response.data.serviceId;
        logger.info({ serviceId: this.serviceId }, 'Service registered with x402 registry');
        return response.data.service;
    }
    async updateService(updates) {
        if (!this.serviceId) {
            throw new Error('Service not registered');
        }
        const response = await this.client.put(`/services/${this.serviceId}`, updates);
        logger.info({ serviceId: this.serviceId }, 'Service updated in registry');
        return response.data.service;
    }
    async setServiceStatus(status) {
        if (!this.serviceId) {
            throw new Error('Service not registered');
        }
        await this.client.patch(`/services/${this.serviceId}/status`, { status });
        logger.info({ serviceId: this.serviceId, status }, 'Service status updated');
    }
    async reportMetrics(metrics) {
        if (!this.serviceId) {
            throw new Error('Service not registered');
        }
        await this.client.post(`/services/${this.serviceId}/metrics`, metrics);
        logger.debug({ serviceId: this.serviceId }, 'Metrics reported to registry');
    }
    async getServiceInfo() {
        if (!this.serviceId) {
            return null;
        }
        const response = await this.client.get(`/services/${this.serviceId}`);
        return response.data.service;
    }
    async heartbeat() {
        if (!this.serviceId) {
            throw new Error('Service not registered');
        }
        await this.client.post(`/services/${this.serviceId}/heartbeat`);
        logger.debug({ serviceId: this.serviceId }, 'Heartbeat sent to registry');
    }
    getServiceId() {
        return this.serviceId;
    }
}
//# sourceMappingURL=registry-client.js.map