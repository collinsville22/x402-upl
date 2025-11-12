"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentService = void 0;
const client_js_1 = require("../db/client.js");
const redis_js_1 = require("../cache/redis.js");
class AgentService {
    static async register(input) {
        const existing = await client_js_1.prisma.agent.findUnique({
            where: { walletAddress: input.walletAddress },
        });
        if (existing) {
            throw new Error('Agent already registered with this wallet address');
        }
        const initialReputation = this.calculateInitialReputation(input.stakedSol);
        const agent = await client_js_1.prisma.agent.create({
            data: {
                walletAddress: input.walletAddress,
                did: input.did,
                visaTapCert: input.visaTapCert,
                stakedSol: input.stakedSol,
                reputationScore: initialReputation,
                metadataUri: input.metadataUri,
            },
        });
        return agent;
    }
    static async getByWalletAddress(walletAddress) {
        return client_js_1.prisma.agent.findUnique({
            where: { walletAddress },
        });
    }
    static async getById(id) {
        return client_js_1.prisma.agent.findUnique({
            where: { id },
        });
    }
    static async update(id, input) {
        const agent = await client_js_1.prisma.agent.update({
            where: { id },
            data: input,
        });
        await (0, redis_js_1.cacheDelete)(`agent:${id}`);
        return agent;
    }
    static async recordTransaction(input) {
        const transaction = await client_js_1.prisma.transaction.create({
            data: {
                agentId: input.agentId,
                serviceId: input.serviceId,
                amountUsdc: input.amountUsdc,
                token: input.token,
                signature: input.signature,
                status: input.status,
                responseTimeMs: input.responseTimeMs,
                blockHash: input.blockHash,
                slot: input.slot ? BigInt(input.slot) : undefined,
                paymentProof: input.paymentProof,
                confirmedAt: input.status === 'CONFIRMED' ? new Date() : undefined,
            },
        });
        if (input.status === 'CONFIRMED') {
            await this.updateReputationAfterTransaction(input.agentId, input.serviceId, true, input.amountUsdc);
        }
        else if (input.status === 'FAILED') {
            await this.updateReputationAfterTransaction(input.agentId, input.serviceId, false, 0);
        }
    }
    static async updateReputationAfterTransaction(agentId, serviceId, success, amount) {
        const agent = await client_js_1.prisma.agent.findUnique({ where: { id: agentId } });
        const service = await client_js_1.prisma.service.findUnique({ where: { id: serviceId } });
        if (!agent || !service)
            return;
        const agentUpdate = {
            totalTransactions: { increment: 1 },
        };
        if (success) {
            agentUpdate.successfulTransactions = { increment: 1 };
            agentUpdate.totalSpent = { increment: amount };
            const newReputation = this.calculateNewReputation(agent.reputationScore, agent.totalTransactions + 1, agent.successfulTransactions + 1);
            agentUpdate.reputationScore = newReputation;
            if (newReputation > 9000) {
                const creditLimit = Number(agent.totalSpent) * 0.1;
                agentUpdate.creditLimit = creditLimit;
            }
        }
        else {
            const penalty = Math.min(100, agent.reputationScore);
            agentUpdate.reputationScore = { decrement: penalty };
        }
        await client_js_1.prisma.agent.update({
            where: { id: agentId },
            data: agentUpdate,
        });
        const serviceUpdate = {
            totalCalls: { increment: 1 },
        };
        if (success) {
            serviceUpdate.successfulCalls = { increment: 1 };
            serviceUpdate.totalRevenue = { increment: amount };
        }
        await client_js_1.prisma.service.update({
            where: { id: serviceId },
            data: serviceUpdate,
        });
        await (0, redis_js_1.cacheDelete)(`agent:${agentId}`);
        await (0, redis_js_1.cacheDelete)(`service:${serviceId}`);
    }
    static async slashForFraud(agentId, fraudAmount, evidenceUri) {
        const agent = await client_js_1.prisma.agent.findUnique({ where: { id: agentId } });
        if (!agent)
            throw new Error('Agent not found');
        const slashAmount = this.calculateSlashAmount(fraudAmount, Number(agent.stakedSol));
        await client_js_1.prisma.agent.update({
            where: { id: agentId },
            data: {
                stakedSol: { decrement: slashAmount },
                slashedAmount: { increment: slashAmount },
                reputationScore: { decrement: 1000 },
            },
        });
        await client_js_1.prisma.dispute.create({
            data: {
                agentId,
                type: 'FRAUD',
                status: 'RESOLVED',
                description: `Fraud detected: ${fraudAmount} USDC`,
                evidenceUri,
                slashAmount,
                resolvedAt: new Date(),
            },
        });
        await (0, redis_js_1.cacheDelete)(`agent:${agentId}`);
    }
    static calculateInitialReputation(stakedSol) {
        if (stakedSol >= 10)
            return 7000;
        if (stakedSol >= 5)
            return 6000;
        if (stakedSol >= 1)
            return 5000;
        return 4000;
    }
    static calculateNewReputation(currentReputation, totalTransactions, successfulTransactions) {
        const successRate = successfulTransactions / totalTransactions;
        const baseReputation = Math.floor(successRate * 10000);
        const weightedReputation = Math.floor((currentReputation * 0.95) + (baseReputation * 0.05));
        return Math.min(10000, Math.max(0, weightedReputation));
    }
    static calculateSlashAmount(fraudAmount, stakedSol) {
        const proportionalSlash = fraudAmount / 100;
        return Math.min(proportionalSlash, stakedSol);
    }
    static async getAgentStatistics(agentId) {
        const agent = await client_js_1.prisma.agent.findUnique({
            where: { id: agentId },
            include: {
                transactions: {
                    where: { status: 'CONFIRMED' },
                    orderBy: { createdAt: 'desc' },
                    take: 100,
                },
                ratings: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                },
            },
        });
        if (!agent)
            return null;
        const successRate = agent.totalTransactions > 0
            ? (agent.successfulTransactions / agent.totalTransactions) * 100
            : 0;
        return {
            ...agent,
            successRate,
            averageTransactionValue: agent.totalTransactions > 0
                ? Number(agent.totalSpent) / agent.totalTransactions
                : 0,
        };
    }
}
exports.AgentService = AgentService;
//# sourceMappingURL=agent.js.map