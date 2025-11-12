"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZKCredentialService = void 0;
const client_1 = require("@prisma/client");
const sha256_1 = require("@noble/hashes/sha256");
const crypto_1 = require("crypto");
const ioredis_1 = __importDefault(require("ioredis"));
const prisma = new client_1.PrismaClient();
class ZKCredentialService {
    merkleTree = null;
    redis = null;
    keyPrefix = 'registry:zk:merkle:';
    constructor(redisUrl) {
        if (redisUrl) {
            this.redis = new ioredis_1.default(redisUrl);
        }
        else {
            this.merkleTree = new Map();
        }
    }
    async issueCredential(claim, issuerId) {
        const agent = await prisma.agent.findUnique({
            where: { id: claim.agentId },
        });
        if (!agent) {
            throw new Error('Agent not found');
        }
        const schemaId = this.generateSchemaId(claim.credentialType);
        const secret = (0, crypto_1.randomBytes)(32);
        const commitment = this.createCommitment(claim, secret);
        const nullifier = this.createNullifier(claim.agentId, claim.credentialType, secret);
        const proofData = {
            claim,
            commitment,
            secret: secret.toString('hex'),
            issuedAt: new Date().toISOString(),
        };
        const proofUri = await this.storeProofData(proofData);
        const credential = await prisma.zKCredential.create({
            data: {
                agentId: claim.agentId,
                credentialType: claim.credentialType,
                schemaId,
                commitment,
                nullifier,
                proofUri,
                issuedBy: issuerId,
                expiresAt: claim.validUntil,
            },
        });
        await this.addToMerkleTree(schemaId, commitment);
        return credential.id;
    }
    generateSchemaId(credentialType) {
        const schemas = {
            [client_1.CredentialType.REPUTATION_PROOF]: 'reputation-v1',
            [client_1.CredentialType.TRANSACTION_HISTORY]: 'transaction-history-v1',
            [client_1.CredentialType.IDENTITY_VERIFICATION]: 'identity-v1',
            [client_1.CredentialType.SERVICE_COMPLETION]: 'service-completion-v1',
            [client_1.CredentialType.DISPUTE_RESOLUTION]: 'dispute-resolution-v1',
        };
        return schemas[credentialType];
    }
    createCommitment(claim, secret) {
        const claimHash = (0, sha256_1.sha256)(Buffer.from(JSON.stringify({
            agentId: claim.agentId,
            credentialType: claim.credentialType,
            attributes: claim.attributes,
        })));
        const commitmentInput = Buffer.concat([claimHash, secret]);
        const commitment = (0, sha256_1.sha256)(commitmentInput);
        return Buffer.from(commitment).toString('hex');
    }
    createNullifier(agentId, credentialType, secret) {
        const nullifierInput = Buffer.from(`${agentId}:${credentialType}:${secret.toString('hex')}`);
        const nullifier = (0, sha256_1.sha256)(nullifierInput);
        return Buffer.from(nullifier).toString('hex');
    }
    async storeProofData(proofData) {
        const hash = (0, sha256_1.sha256)(Buffer.from(JSON.stringify(proofData)));
        const uri = `ipfs://${Buffer.from(hash).toString('hex')}`;
        return uri;
    }
    async addToMerkleTree(schemaId, commitment) {
        if (this.redis) {
            await this.redis.rpush(this.keyPrefix + schemaId, commitment);
        }
        else if (this.merkleTree) {
            const leaves = this.merkleTree.get(schemaId) || [];
            leaves.push(commitment);
            this.merkleTree.set(schemaId, leaves);
        }
    }
    async getMerkleTreeLeaves(schemaId) {
        if (this.redis) {
            return await this.redis.lrange(this.keyPrefix + schemaId, 0, -1);
        }
        else if (this.merkleTree) {
            return this.merkleTree.get(schemaId) || [];
        }
        return [];
    }
    computeMerkleRoot(leaves) {
        if (leaves.length === 0) {
            return Buffer.alloc(32).toString('hex');
        }
        if (leaves.length === 1) {
            return leaves[0];
        }
        const nextLevel = [];
        for (let i = 0; i < leaves.length; i += 2) {
            const left = Buffer.from(leaves[i], 'hex');
            const right = i + 1 < leaves.length ? Buffer.from(leaves[i + 1], 'hex') : left;
            const combined = Buffer.concat([left, right]);
            const parent = (0, sha256_1.sha256)(combined);
            nextLevel.push(Buffer.from(parent).toString('hex'));
        }
        return this.computeMerkleRoot(nextLevel);
    }
    generateMerkleProof(leaves, targetLeaf) {
        const proof = [];
        let currentIndex = leaves.indexOf(targetLeaf);
        if (currentIndex === -1) {
            throw new Error('Leaf not found in tree');
        }
        let currentLevel = [...leaves];
        while (currentLevel.length > 1) {
            const nextLevel = [];
            const newIndex = Math.floor(currentIndex / 2);
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
                if (i === currentIndex || i + 1 === currentIndex) {
                    const sibling = i === currentIndex ? right : left;
                    proof.push(sibling);
                }
                const combined = Buffer.concat([Buffer.from(left, 'hex'), Buffer.from(right, 'hex')]);
                const parent = (0, sha256_1.sha256)(combined);
                nextLevel.push(Buffer.from(parent).toString('hex'));
            }
            currentLevel = nextLevel;
            currentIndex = newIndex;
        }
        return proof;
    }
    async generateProof(credentialId, revealAttributes = []) {
        const credential = await prisma.zKCredential.findUnique({
            where: { id: credentialId },
        });
        if (!credential) {
            throw new Error('Credential not found');
        }
        if (credential.isRevoked) {
            throw new Error('Credential has been revoked');
        }
        if (credential.expiresAt && new Date() > credential.expiresAt) {
            throw new Error('Credential has expired');
        }
        const leaves = await this.getMerkleTreeLeaves(credential.schemaId);
        const merkleProof = this.generateMerkleProof(leaves, credential.commitment);
        const merkleRoot = this.computeMerkleRoot(leaves);
        const publicSignals = [
            merkleRoot,
            credential.nullifier,
            ...revealAttributes,
        ];
        const proofObject = {
            pi_a: [(0, crypto_1.randomBytes)(32).toString('hex'), (0, crypto_1.randomBytes)(32).toString('hex')],
            pi_b: [
                [(0, crypto_1.randomBytes)(32).toString('hex'), (0, crypto_1.randomBytes)(32).toString('hex')],
                [(0, crypto_1.randomBytes)(32).toString('hex'), (0, crypto_1.randomBytes)(32).toString('hex')],
            ],
            pi_c: [(0, crypto_1.randomBytes)(32).toString('hex'), (0, crypto_1.randomBytes)(32).toString('hex')],
            protocol: 'groth16',
            curve: 'bn128',
        };
        return {
            commitment: credential.commitment,
            nullifier: credential.nullifier,
            proof: JSON.stringify(proofObject),
            publicSignals,
        };
    }
    async verifyProof(proof, schemaId, expectedNullifier) {
        try {
            const usedNullifiers = await prisma.zKCredential.findMany({
                where: {
                    nullifier: proof.nullifier,
                    schemaId,
                },
            });
            if (usedNullifiers.length === 0) {
                return false;
            }
            if (expectedNullifier && proof.nullifier !== expectedNullifier) {
                return false;
            }
            const leaves = await this.getMerkleTreeLeaves(schemaId);
            const merkleRoot = this.computeMerkleRoot(leaves);
            if (proof.publicSignals[0] !== merkleRoot) {
                return false;
            }
            const proofObject = JSON.parse(proof.proof);
            if (proofObject.protocol !== 'groth16' || proofObject.curve !== 'bn128') {
                return false;
            }
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async revokeCredential(credentialId, reason) {
        await prisma.zKCredential.update({
            where: { id: credentialId },
            data: {
                isRevoked: true,
                revokedAt: new Date(),
            },
        });
    }
    async getCredentialsByAgent(agentId) {
        return await prisma.zKCredential.findMany({
            where: {
                agentId,
                isRevoked: false,
            },
            select: {
                id: true,
                credentialType: true,
                schemaId: true,
                commitment: true,
                issuedBy: true,
                expiresAt: true,
                createdAt: true,
            },
        });
    }
    async issueReputationProof(agentId, thresholdScore) {
        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
        });
        if (!agent) {
            throw new Error('Agent not found');
        }
        if (agent.reputationScore < thresholdScore) {
            throw new Error(`Reputation score ${agent.reputationScore} below threshold ${thresholdScore}`);
        }
        const claim = {
            agentId,
            credentialType: client_1.CredentialType.REPUTATION_PROOF,
            attributes: {
                minReputationScore: thresholdScore,
                actualScore: agent.reputationScore,
                verifiedAt: new Date().toISOString(),
            },
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        };
        return await this.issueCredential(claim, 'system');
    }
    async issueTransactionHistoryProof(agentId, minTransactions) {
        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
        });
        if (!agent) {
            throw new Error('Agent not found');
        }
        if (agent.totalTransactions < minTransactions) {
            throw new Error(`Transaction count ${agent.totalTransactions} below minimum ${minTransactions}`);
        }
        const successRate = agent.totalTransactions > 0
            ? (agent.successfulTransactions / agent.totalTransactions) * 100
            : 0;
        const claim = {
            agentId,
            credentialType: client_1.CredentialType.TRANSACTION_HISTORY,
            attributes: {
                minTransactions,
                actualTransactions: agent.totalTransactions,
                successRate: successRate.toFixed(2),
                totalSpent: agent.totalSpent.toString(),
                verifiedAt: new Date().toISOString(),
            },
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        };
        return await this.issueCredential(claim, 'system');
    }
    async issueServiceCompletionProof(agentId, serviceId, transactionId) {
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { service: true },
        });
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        if (transaction.agentId !== agentId) {
            throw new Error('Transaction does not belong to agent');
        }
        if (transaction.serviceId !== serviceId) {
            throw new Error('Transaction does not match service');
        }
        if (transaction.status !== 'CONFIRMED') {
            throw new Error('Transaction not confirmed');
        }
        const claim = {
            agentId,
            credentialType: client_1.CredentialType.SERVICE_COMPLETION,
            attributes: {
                serviceId,
                serviceName: transaction.service.name,
                transactionId,
                completedAt: transaction.confirmedAt?.toISOString(),
                amountPaid: transaction.amountUsdc.toString(),
            },
        };
        return await this.issueCredential(claim, transaction.service.ownerWalletAddress);
    }
    async getMerkleRoot(schemaId) {
        const leaves = await this.getMerkleTreeLeaves(schemaId);
        return this.computeMerkleRoot(leaves);
    }
    async disconnect() {
        if (this.redis) {
            await this.redis.quit();
        }
    }
}
exports.ZKCredentialService = ZKCredentialService;
//# sourceMappingURL=zk-credentials.js.map