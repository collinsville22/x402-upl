"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceService = void 0;
const client_1 = require("@prisma/client");
const web3_js_1 = require("@solana/web3.js");
const prisma = new client_1.PrismaClient();
class GovernanceService {
    connection;
    constructor(rpcUrl) {
        this.connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
    }
    async createProposal(input) {
        const proposer = await prisma.agent.findUnique({
            where: { id: input.proposerId },
        });
        if (!proposer) {
            throw new Error('Proposer not found');
        }
        if (proposer.reputationScore < 7000) {
            throw new Error('Insufficient reputation to create proposal');
        }
        const votingStartAt = new Date();
        const votingEndAt = new Date(Date.now() + input.votingDurationHours * 3600000);
        const quorumRequired = await this.calculateQuorum(input.type);
        const proposal = await prisma.governanceProposal.create({
            data: {
                proposerId: input.proposerId,
                type: input.type,
                title: input.title,
                description: input.description,
                disputeId: input.disputeId,
                targetAgentId: input.targetAgentId,
                targetServiceId: input.targetServiceId,
                proposedAction: input.proposedAction,
                votingStartAt,
                votingEndAt,
                quorumRequired,
            },
        });
        return proposal;
    }
    async castVote(input) {
        const proposal = await prisma.governanceProposal.findUnique({
            where: { id: input.proposalId },
        });
        if (!proposal) {
            throw new Error('Proposal not found');
        }
        if (proposal.status !== client_1.ProposalStatus.ACTIVE) {
            throw new Error('Proposal is not active');
        }
        if (new Date() > proposal.votingEndAt) {
            await this.closeProposal(input.proposalId);
            throw new Error('Voting period has ended');
        }
        const voter = await prisma.agent.findUnique({
            where: { id: input.voterId },
        });
        if (!voter) {
            throw new Error('Voter not found');
        }
        const existingVote = await prisma.vote.findUnique({
            where: {
                proposalId_voterId: {
                    proposalId: input.proposalId,
                    voterId: input.voterId,
                },
            },
        });
        if (existingVote) {
            throw new Error('Already voted on this proposal');
        }
        const vote = await prisma.vote.create({
            data: {
                proposalId: input.proposalId,
                voterId: input.voterId,
                voteType: input.voteType,
                votingPower: input.votingPower,
                reason: input.reason,
                signature: input.signature,
            },
        });
        await this.updateProposalVotes(input.proposalId);
        return vote;
    }
    async updateProposalVotes(proposalId) {
        const votes = await prisma.vote.findMany({
            where: { proposalId },
        });
        const totalVotes = votes.reduce((sum, v) => sum + v.votingPower, 0);
        const votesFor = votes.filter(v => v.voteType === client_1.VoteType.FOR).reduce((sum, v) => sum + v.votingPower, 0);
        const votesAgainst = votes.filter(v => v.voteType === client_1.VoteType.AGAINST).reduce((sum, v) => sum + v.votingPower, 0);
        const votesAbstain = votes.filter(v => v.voteType === client_1.VoteType.ABSTAIN).reduce((sum, v) => sum + v.votingPower, 0);
        await prisma.governanceProposal.update({
            where: { id: proposalId },
            data: {
                totalVotes,
                votesFor,
                votesAgainst,
                votesAbstain,
            },
        });
    }
    async closeProposal(proposalId) {
        const proposal = await prisma.governanceProposal.findUnique({
            where: { id: proposalId },
        });
        if (!proposal || proposal.status !== client_1.ProposalStatus.ACTIVE) {
            return;
        }
        const passed = proposal.totalVotes >= proposal.quorumRequired &&
            proposal.votesFor > proposal.votesAgainst;
        await prisma.governanceProposal.update({
            where: { id: proposalId },
            data: {
                status: passed ? client_1.ProposalStatus.PASSED : client_1.ProposalStatus.REJECTED,
            },
        });
        if (passed) {
            await this.executeProposal(proposalId);
        }
    }
    async executeProposal(proposalId) {
        const proposal = await prisma.governanceProposal.findUnique({
            where: { id: proposalId },
        });
        if (!proposal || proposal.status !== client_1.ProposalStatus.PASSED) {
            return;
        }
        try {
            switch (proposal.type) {
                case client_1.ProposalType.DISPUTE_RESOLUTION:
                    if (proposal.disputeId) {
                        await this.executeDisputeResolution(proposal.disputeId, proposal.proposedAction);
                    }
                    break;
                case client_1.ProposalType.AGENT_SUSPENSION:
                    if (proposal.targetAgentId) {
                        await prisma.agent.update({
                            where: { id: proposal.targetAgentId },
                            data: { status: 'SUSPENDED' },
                        });
                    }
                    break;
                case client_1.ProposalType.SERVICE_SUSPENSION:
                    if (proposal.targetServiceId) {
                        await prisma.service.update({
                            where: { id: proposal.targetServiceId },
                            data: { status: 'SUSPENDED' },
                        });
                    }
                    break;
                default:
                    break;
            }
            await prisma.governanceProposal.update({
                where: { id: proposalId },
                data: {
                    status: client_1.ProposalStatus.EXECUTED,
                    executedAt: new Date(),
                },
            });
        }
        catch (error) {
            console.error('Failed to execute proposal:', error);
        }
    }
    async executeDisputeResolution(disputeId, action) {
        const actionData = JSON.parse(action);
        await prisma.dispute.update({
            where: { id: disputeId },
            data: {
                status: 'RESOLVED',
                resolution: actionData.resolution,
                slashAmount: actionData.slashAmount,
                resolvedAt: new Date(),
            },
        });
        if (actionData.slashAmount > 0) {
            const dispute = await prisma.dispute.findUnique({
                where: { id: disputeId },
            });
            if (dispute) {
                await prisma.agent.update({
                    where: { id: dispute.agentId },
                    data: {
                        stakedSol: { decrement: actionData.slashAmount },
                        slashedAmount: { increment: actionData.slashAmount },
                        reputationScore: { decrement: 1000 },
                        disputesLost: { increment: 1 },
                    },
                });
            }
        }
    }
    async calculateQuorum(type) {
        const totalStaked = await prisma.agent.aggregate({
            _sum: { stakedSol: true },
        });
        const totalStakedNum = Number(totalStaked._sum.stakedSol || 0);
        switch (type) {
            case client_1.ProposalType.DISPUTE_RESOLUTION:
                return Math.floor(totalStakedNum * 0.1);
            case client_1.ProposalType.AGENT_SUSPENSION:
            case client_1.ProposalType.SERVICE_SUSPENSION:
                return Math.floor(totalStakedNum * 0.2);
            case client_1.ProposalType.PARAMETER_CHANGE:
                return Math.floor(totalStakedNum * 0.3);
            case client_1.ProposalType.TREASURY_ALLOCATION:
                return Math.floor(totalStakedNum * 0.4);
            default:
                return Math.floor(totalStakedNum * 0.15);
        }
    }
    async getVotingPower(agentId) {
        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
        });
        if (!agent) {
            return 0;
        }
        const stakedWeight = Number(agent.stakedSol) * 100;
        const reputationWeight = agent.reputationScore / 100;
        return Math.floor(stakedWeight + reputationWeight);
    }
    async assignArbitrator(input) {
        const dispute = await prisma.dispute.findUnique({
            where: { id: input.disputeId },
        });
        if (!dispute) {
            throw new Error('Dispute not found');
        }
        if (dispute.status !== 'OPEN') {
            throw new Error('Dispute is not open');
        }
        const arbitrator = await prisma.agent.findUnique({
            where: { id: input.arbitratorId },
        });
        if (!arbitrator) {
            throw new Error('Arbitrator not found');
        }
        if (arbitrator.reputationScore < 8000) {
            throw new Error('Arbitrator reputation too low');
        }
        const arbitration = await prisma.arbitration.create({
            data: {
                disputeId: input.disputeId,
                arbitratorId: input.arbitratorId,
            },
        });
        await prisma.dispute.update({
            where: { id: input.disputeId },
            data: { status: 'INVESTIGATING' },
        });
        return arbitration;
    }
    async completeArbitration(arbitrationId, ruling, compensation, slashRecommendation) {
        const arbitration = await prisma.arbitration.findUnique({
            where: { id: arbitrationId },
            include: { dispute: true },
        });
        if (!arbitration) {
            throw new Error('Arbitration not found');
        }
        await prisma.arbitration.update({
            where: { id: arbitrationId },
            data: {
                status: client_1.ArbitrationStatus.COMPLETED,
                ruling,
                compensation,
                slashRecommendation,
                completedAt: new Date(),
            },
        });
        const proposedAction = JSON.stringify({
            resolution: ruling,
            slashAmount: slashRecommendation,
            compensation,
        });
        await this.createProposal({
            proposerId: arbitration.arbitratorId,
            type: client_1.ProposalType.DISPUTE_RESOLUTION,
            title: `Resolution for Dispute ${arbitration.disputeId}`,
            description: ruling,
            disputeId: arbitration.disputeId,
            proposedAction,
            votingDurationHours: 72,
        });
    }
    async scheduleProposalClosures() {
        const expiredProposals = await prisma.governanceProposal.findMany({
            where: {
                status: client_1.ProposalStatus.ACTIVE,
                votingEndAt: { lte: new Date() },
            },
        });
        for (const proposal of expiredProposals) {
            await this.closeProposal(proposal.id);
        }
    }
    async getActiveProposals() {
        return await prisma.governanceProposal.findMany({
            where: {
                status: client_1.ProposalStatus.ACTIVE,
                votingEndAt: { gt: new Date() },
            },
            include: {
                votes: {
                    select: {
                        voterId: true,
                        voteType: true,
                        votingPower: true,
                    },
                },
            },
            orderBy: { votingEndAt: 'asc' },
        });
    }
    async getProposalDetails(proposalId) {
        return await prisma.governanceProposal.findUnique({
            where: { id: proposalId },
            include: {
                votes: {
                    include: {
                        voter: {
                            select: {
                                walletAddress: true,
                                reputationScore: true,
                            },
                        },
                    },
                },
            },
        });
    }
}
exports.GovernanceService = GovernanceService;
//# sourceMappingURL=governance.js.map