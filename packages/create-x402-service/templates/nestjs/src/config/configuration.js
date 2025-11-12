"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    network: process.env.NETWORK || 'devnet',
    treasuryWallet: process.env.TREASURY_WALLET,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    logLevel: process.env.LOG_LEVEL || 'info',
    enableTAP: process.env.ENABLE_TAP === 'true',
    registryUrl: process.env.REGISTRY_URL || 'https://registry.x402.network',
    autoRegisterService: process.env.AUTO_REGISTER_SERVICE === 'true',
    serviceUrl: process.env.SERVICE_URL,
    serviceName: process.env.SERVICE_NAME,
    serviceDescription: process.env.SERVICE_DESCRIPTION,
    serviceCategory: process.env.SERVICE_CATEGORY,
    servicePrice: parseFloat(process.env.SERVICE_PRICE || '0.01'),
    acceptedTokens: process.env.ACCEPTED_TOKENS?.split(',').map((t) => t.trim()) || ['CASH', 'USDC', 'SOL'],
    serviceCapabilities: process.env.SERVICE_CAPABILITIES?.split(',').map((c) => c.trim()) || [],
    serviceTags: process.env.SERVICE_TAGS?.split(',').map((t) => t.trim()) || [],
});
//# sourceMappingURL=configuration.js.map