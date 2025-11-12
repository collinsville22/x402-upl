import { CredentialType } from '@prisma/client';
export interface CredentialClaim {
    agentId: string;
    credentialType: CredentialType;
    attributes: Record<string, any>;
    validUntil?: Date;
}
export interface ZKProof {
    commitment: string;
    nullifier: string;
    proof: string;
    publicSignals: string[];
}
export interface VerificationKey {
    protocol: string;
    curve: string;
    nPublic: number;
    vk_alpha_1: string[];
    vk_beta_2: string[][];
    vk_gamma_2: string[][];
    vk_delta_2: string[][];
    IC: string[][];
}
export declare class ZKCredentialService {
    private merkleTree;
    private redis;
    private keyPrefix;
    constructor(redisUrl?: string);
    issueCredential(claim: CredentialClaim, issuerId: string): Promise<string>;
    private generateSchemaId;
    private createCommitment;
    private createNullifier;
    private storeProofData;
    private addToMerkleTree;
    private getMerkleTreeLeaves;
    private computeMerkleRoot;
    private generateMerkleProof;
    generateProof(credentialId: string, revealAttributes?: string[]): Promise<ZKProof>;
    verifyProof(proof: ZKProof, schemaId: string, expectedNullifier?: string): Promise<boolean>;
    revokeCredential(credentialId: string, reason: string): Promise<void>;
    getCredentialsByAgent(agentId: string): Promise<any[]>;
    issueReputationProof(agentId: string, thresholdScore: number): Promise<string>;
    issueTransactionHistoryProof(agentId: string, minTransactions: number): Promise<string>;
    issueServiceCompletionProof(agentId: string, serviceId: string, transactionId: string): Promise<string>;
    getMerkleRoot(schemaId: string): Promise<string>;
    disconnect(): Promise<void>;
}
//# sourceMappingURL=zk-credentials.d.ts.map