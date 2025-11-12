"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateServiceSchema = exports.RecordTransactionSchema = exports.UpdateAgentSchema = exports.RegisterAgentSchema = void 0;
const zod_1 = require("zod");
exports.RegisterAgentSchema = zod_1.z.object({
    walletAddress: zod_1.z.string().length(44),
    did: zod_1.z.string().optional(),
    visaTapCert: zod_1.z.string().optional(),
    stakedSol: zod_1.z.number().nonnegative(),
    metadataUri: zod_1.z.string().url().optional(),
});
exports.UpdateAgentSchema = zod_1.z.object({
    did: zod_1.z.string().optional(),
    visaTapCert: zod_1.z.string().optional(),
    metadataUri: zod_1.z.string().url().optional(),
    status: zod_1.z.enum(['ACTIVE', 'PAUSED']).optional(),
});
exports.RecordTransactionSchema = zod_1.z.object({
    agentId: zod_1.z.string().cuid(),
    serviceId: zod_1.z.string().cuid(),
    amountUsdc: zod_1.z.number().positive(),
    token: zod_1.z.string(),
    signature: zod_1.z.string(),
    responseTimeMs: zod_1.z.number().nonnegative().optional(),
    status: zod_1.z.enum(['PENDING', 'CONFIRMING', 'CONFIRMED', 'FAILED']),
    blockHash: zod_1.z.string().optional(),
    slot: zod_1.z.number().optional(),
    paymentProof: zod_1.z.string().optional(),
});
exports.RateServiceSchema = zod_1.z.object({
    transactionId: zod_1.z.string().cuid(),
    rating: zod_1.z.number().min(1).max(5),
    comment: zod_1.z.string().max(500).optional(),
});
//# sourceMappingURL=agent.js.map