import axios from 'axios';
import pino from 'pino';
const logger = pino({ name: 'registry-client' });
export class RegistryClient {
    registryUrl;
    serviceId;
    constructor(registryUrl) {
        this.registryUrl = registryUrl;
    }
    async registerService(registration) {
        try {
            const response = await axios.post(`${this.registryUrl}/services/register`, registration);
            this.serviceId = response.data.serviceId;
            logger.info({ serviceId: this.serviceId, name: registration.name }, 'Service registered with x402 registry');
            return response.data.service;
        }
        catch (error) {
            logger.error({ error }, 'Failed to register service');
            throw error;
        }
    }
    async updateServiceStatus(status) {
        if (!this.serviceId) {
            logger.warn('Service not registered, skipping status update');
            return;
        }
        try {
            await axios.patch(`${this.registryUrl}/services/${this.serviceId}`, {
                status,
            });
            logger.info({ serviceId: this.serviceId, status }, 'Service status updated');
        }
        catch (error) {
            logger.error({ error }, 'Failed to update service status');
        }
    }
    async reportMetrics(metrics) {
        if (!this.serviceId) {
            return;
        }
        try {
            await axios.post(`${this.registryUrl}/services/${this.serviceId}/metrics`, metrics);
        }
        catch (error) {
            logger.error({ error }, 'Failed to report metrics');
        }
    }
    async discover(filters) {
        try {
            const response = await axios.get(`${this.registryUrl}/services/discover`, {
                params: filters,
            });
            return response.data.services;
        }
        catch (error) {
            logger.error({ error }, 'Failed to discover services');
            return [];
        }
    }
    getServiceId() {
        return this.serviceId;
    }
}
//# sourceMappingURL=registry-client.js.map