import type { RegisterAgentInput, UpdateAgentInput, RecordTransactionInput } from '../schemas/agent.js';
import type { Agent } from '@prisma/client';
export declare class AgentService {
    static register(input: RegisterAgentInput): Promise<Agent>;
    static getByWalletAddress(walletAddress: string): Promise<Agent | null>;
    static getById(id: string): Promise<Agent | null>;
    static update(id: string, input: UpdateAgentInput): Promise<Agent>;
    static recordTransaction(input: RecordTransactionInput): Promise<void>;
    private static updateReputationAfterTransaction;
    static slashForFraud(agentId: string, fraudAmount: number, evidenceUri: string): Promise<void>;
    private static calculateInitialReputation;
    private static calculateNewReputation;
    private static calculateSlashAmount;
    static getAgentStatistics(agentId: string): Promise<any>;
}
//# sourceMappingURL=agent.d.ts.map