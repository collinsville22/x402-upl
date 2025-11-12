"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscoverServicesSchema = exports.UpdateServiceSchema = exports.RegisterServiceSchema = void 0;
const zod_1 = require("zod");
exports.RegisterServiceSchema = zod_1.z.object({
    url: zod_1.z.string().url(),
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().min(1).max(1000),
    category: zod_1.z.string().min(1).max(50),
    ownerWalletAddress: zod_1.z.string().length(44),
    pricePerCall: zod_1.z.number().positive(),
    pricingModel: zod_1.z.enum(['FLAT', 'TIERED', 'DYNAMIC']).default('FLAT'),
    acceptedTokens: zod_1.z.array(zod_1.z.string()).min(1),
    openapiSchemaUri: zod_1.z.string().url().optional(),
    inputSchema: zod_1.z.string().optional(),
    outputSchema: zod_1.z.string().optional(),
    capabilities: zod_1.z.array(zod_1.z.string()).default([]),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.UpdateServiceSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    description: zod_1.z.string().min(1).max(1000).optional(),
    pricePerCall: zod_1.z.number().positive().optional(),
    acceptedTokens: zod_1.z.array(zod_1.z.string()).min(1).optional(),
    capabilities: zod_1.z.array(zod_1.z.string()).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    status: zod_1.z.enum(['ACTIVE', 'PAUSED', 'DEPRECATED']).optional(),
});
exports.DiscoverServicesSchema = zod_1.z.object({
    query: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    maxPrice: zod_1.z.number().positive().optional(),
    minReputation: zod_1.z.number().min(0).max(10000).optional(),
    minUptime: zod_1.z.number().min(0).max(100).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    sortBy: zod_1.z.enum(['price', 'reputation', 'value', 'recent']).default('value'),
    limit: zod_1.z.number().min(1).max(100).default(20),
    offset: zod_1.z.number().min(0).default(0),
});
//# sourceMappingURL=service.js.map