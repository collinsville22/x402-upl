"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistryClient = void 0;
const axios_1 = __importDefault(require("axios"));
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'registry-client' });
class RegistryClient {
    registryUrl;
    serviceId;
    constructor(registryUrl) {
        this.registryUrl = registryUrl;
    }
    async registerService(registration) {
        try {
            const response = await axios_1.default.post(`${this.registryUrl}/services/register`, registration);
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
            await axios_1.default.patch(`${this.registryUrl}/services/${this.serviceId}`, {
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
            await axios_1.default.post(`${this.registryUrl}/services/${this.serviceId}/metrics`, metrics);
        }
        catch (error) {
            logger.error({ error }, 'Failed to report metrics');
        }
    }
    async discover(filters) {
        try {
            const response = await axios_1.default.get(`${this.registryUrl}/services/discover`, {
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
exports.RegistryClient = RegistryClient;
//# sourceMappingURL=registry-client.js.map