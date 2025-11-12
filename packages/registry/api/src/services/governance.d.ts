import { ProposalType, VoteType } from '@prisma/client';
export interface CreateProposalInput {
    proposerId: string;
    type: ProposalType;
    title: string;
    description: string;
    disputeId?: string;
    targetAgentId?: string;
    targetServiceId?: string;
    proposedAction: string;
    votingDurationHours: number;
}
export interface CastVoteInput {
    proposalId: string;
    voterId: string;
    voteType: VoteType;
    votingPower: number;
    reason?: string;
    signature: string;
}
export interface ArbitrationInput {
    disputeId: string;
    arbitratorId: string;
}
export declare class GovernanceService {
    private connection;
    constructor(rpcUrl: string);
    createProposal(input: CreateProposalInput): Promise<any>;
    castVote(input: CastVoteInput): Promise<any>;
    private updateProposalVotes;
    closeProposal(proposalId: string): Promise<void>;
    private executeProposal;
    private executeDisputeResolution;
    private calculateQuorum;
    getVotingPower(agentId: string): Promise<number>;
    assignArbitrator(input: ArbitrationInput): Promise<any>;
    completeArbitration(arbitrationId: string, ruling: string, compensation: number, slashRecommendation: number): Promise<void>;
    scheduleProposalClosures(): Promise<void>;
    getActiveProposals(): Promise<any>;
    getProposalDetails(proposalId: string): Promise<any>;
}
//# sourceMappingURL=governance.d.ts.map