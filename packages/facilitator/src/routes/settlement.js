import { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import { prisma } from '../db/client.js';
import { Keypair } from '@solana/web3.js';
export const settlementRoutes = async (fastify) => {
    const connection = new Connection(process.env.RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
    let treasuryKeypair = null;
    try {
        const treasuryKey = process.env.TREASURY_PRIVATE_KEY;
        if (treasuryKey && treasuryKey !== '[]') {
            treasuryKeypair = Keypair.fromSecretKey(Buffer.from(JSON.parse(treasuryKey)));
        }
    }
    catch (error) {
        fastify.log.warn('Treasury keypair not configured - settlement execution will fail');
    }
    fastify.post('/api/settlement/request', {
        preHandler: [fastify.auth],
        schema: {
            body: {
                type: 'object',
                required: ['merchantWallet', 'serviceId', 'settlementType'],
                properties: {
                    merchantWallet: { type: 'string' },
                    serviceId: { type: 'string' },
                    settlementType: {
                        type: 'string',
                        enum: ['automatic', 'scheduled', 'manual']
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { merchantWallet, serviceId, settlementType } = request.body;
        const authReq = request;
        if (authReq.wallet !== merchantWallet) {
            const adminWallets = (process.env.ADMIN_WALLET_ADDRESSES || '').split(',');
            if (!adminWallets.includes(authReq.wallet || '')) {
                return reply.status(403).send({
                    error: 'Access denied',
                    message: 'You can only request settlements for your own wallet'
                });
            }
        }
        try {
            const transactions = await prisma.transaction.findMany({
                where: {
                    serviceId,
                    status: 'confirmed',
                    settledAt: null,
                },
            });
            if (transactions.length === 0) {
                return reply.status(400).send({
                    error: 'No unsettled transactions found',
                });
            }
            const totalAmount = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
            const platformFeeRate = parseFloat(process.env.PLATFORM_FEE_RATE || '0.02');
            const platformFee = totalAmount * platformFeeRate;
            const merchantAmount = totalAmount - platformFee;
            const settlement = await prisma.settlement.create({
                data: {
                    merchantWallet,
                    serviceId,
                    totalAmount: totalAmount.toString(),
                    platformFee: platformFee.toString(),
                    merchantAmount: merchantAmount.toString(),
                    transactionCount: transactions.length,
                    status: 'pending',
                    settlementType,
                    requestedAt: new Date(),
                },
            });
            const merchantPubkey = new PublicKey(merchantWallet);
            const tokenMint = new PublicKey(process.env.TOKEN_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
            const treasuryTokenAccount = await getAssociatedTokenAddress(tokenMint, treasuryKeypair.publicKey);
            const merchantTokenAccount = await getAssociatedTokenAddress(tokenMint, merchantPubkey);
            const amountInTokens = Math.floor(merchantAmount * LAMPORTS_PER_SOL);
            const transaction = new Transaction().add(createTransferInstruction(treasuryTokenAccount, merchantTokenAccount, treasuryKeypair.publicKey, amountInTokens, [], TOKEN_PROGRAM_ID));
            const signature = await connection.sendTransaction(transaction, [treasuryKeypair]);
            await connection.confirmTransaction(signature);
            await prisma.settlement.update({
                where: { id: settlement.id },
                data: {
                    status: 'completed',
                    transactionSignature: signature,
                    completedAt: new Date(),
                },
            });
            await prisma.transaction.updateMany({
                where: {
                    id: { in: transactions.map(tx => tx.id) },
                },
                data: {
                    settledAt: new Date(),
                    settlementId: settlement.id,
                    settlementSignature: signature,
                },
            });
            const response = {
                settlementId: settlement.id,
                amount: merchantAmount,
                transactionSignature: signature,
                status: 'completed',
                timestamp: new Date().toISOString(),
            };
            return reply.send(response);
        }
        catch (error) {
            fastify.log.error('Settlement failed:', error);
            return reply.status(500).send({
                error: 'Settlement processing failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    fastify.get('/api/settlement/pending', {
        preHandler: [fastify.auth],
        schema: {
            querystring: {
                type: 'object',
                required: ['merchantWallet'],
                properties: {
                    merchantWallet: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { merchantWallet } = request.query;
        const authReq = request;
        if (authReq.wallet !== merchantWallet) {
            return reply.status(403).send({
                error: 'Access denied',
                message: 'You can only view your own pending settlements'
            });
        }
        try {
            const transactions = await prisma.transaction.findMany({
                where: {
                    recipientAddress: merchantWallet,
                    status: 'confirmed',
                    settledAt: null,
                },
            });
            const totalAmount = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
            const platformFeeRate = parseFloat(process.env.PLATFORM_FEE_RATE || '0.02');
            const platformFee = totalAmount * platformFeeRate;
            const merchantAmount = totalAmount - platformFee;
            return reply.send({
                transactionCount: transactions.length,
                totalAmount,
                platformFee,
                merchantAmount,
                transactions: transactions.map(tx => ({
                    id: tx.id,
                    signature: tx.signature,
                    amount: tx.amount,
                    timestamp: tx.timestamp,
                })),
            });
        }
        catch (error) {
            fastify.log.error('Failed to fetch pending settlements:', error);
            return reply.status(500).send({
                error: 'Failed to fetch pending settlements',
            });
        }
    });
    fastify.get('/api/settlement/history', {
        preHandler: [fastify.auth],
        schema: {
            querystring: {
                type: 'object',
                required: ['merchantWallet'],
                properties: {
                    merchantWallet: { type: 'string' },
                    limit: { type: 'number', default: 50 },
                },
            },
        },
    }, async (request, reply) => {
        const { merchantWallet, limit = 50 } = request.query;
        const authReq = request;
        if (authReq.wallet !== merchantWallet) {
            return reply.status(403).send({
                error: 'Access denied',
                message: 'You can only view your own settlement history'
            });
        }
        try {
            const settlements = await prisma.settlement.findMany({
                where: {
                    merchantWallet,
                },
                orderBy: {
                    completedAt: 'desc',
                },
                take: limit,
            });
            return reply.send({
                settlements: settlements.map(s => ({
                    id: s.id,
                    totalAmount: s.totalAmount,
                    platformFee: s.platformFee,
                    merchantAmount: s.merchantAmount,
                    transactionCount: s.transactionCount,
                    status: s.status,
                    transactionSignature: s.transactionSignature,
                    requestedAt: s.requestedAt,
                    completedAt: s.completedAt,
                })),
            });
        }
        catch (error) {
            fastify.log.error('Failed to fetch settlement history:', error);
            return reply.status(500).send({
                error: 'Failed to fetch settlement history',
            });
        }
    });
    fastify.post('/api/settlement/cancel', {
        preHandler: [fastify.auth],
        schema: {
            body: {
                type: 'object',
                required: ['settlementId', 'reason'],
                properties: {
                    settlementId: { type: 'string' },
                    reason: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { settlementId, reason } = request.body;
        const authReq = request;
        try {
            const settlement = await prisma.settlement.findUnique({
                where: { id: settlementId },
            });
            if (!settlement) {
                return reply.status(404).send({
                    error: 'Settlement not found',
                });
            }
            if (authReq.wallet !== settlement.merchantWallet) {
                const adminWallets = (process.env.ADMIN_WALLET_ADDRESSES || '').split(',');
                if (!adminWallets.includes(authReq.wallet || '')) {
                    return reply.status(403).send({
                        error: 'Access denied',
                        message: 'You can only cancel your own settlements'
                    });
                }
            }
            if (settlement.status !== 'pending') {
                return reply.status(400).send({
                    error: 'Can only cancel pending settlements',
                });
            }
            await prisma.settlement.update({
                where: { id: settlementId },
                data: {
                    status: 'cancelled',
                    cancelReason: reason,
                    completedAt: new Date(),
                },
            });
            return reply.send({
                message: 'Settlement cancelled successfully',
            });
        }
        catch (error) {
            fastify.log.error('Failed to cancel settlement:', error);
            return reply.status(500).send({
                error: 'Failed to cancel settlement',
            });
        }
    });
};
//# sourceMappingURL=settlement.js.map