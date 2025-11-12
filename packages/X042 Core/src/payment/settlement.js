"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettlementCoordinator = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
class SettlementCoordinator {
    connection;
    config;
    facilitatorKeypair;
    constructor(config) {
        this.config = config;
        this.connection = new web3_js_1.Connection(config.rpcUrl, 'confirmed');
        if (config.facilitatorPrivateKey) {
            this.facilitatorKeypair = web3_js_1.Keypair.fromSecretKey(config.facilitatorPrivateKey);
        }
    }
    async executeSettlement(fromPubkey, toPubkey, amount, tokenMint, fromKeypair) {
        try {
            const fromTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(tokenMint, fromPubkey);
            const toTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(tokenMint, toPubkey);
            const transaction = new web3_js_1.Transaction();
            const transferInstruction = (0, spl_token_1.createTransferInstruction)(fromTokenAccount, toTokenAccount, fromPubkey, amount, [], spl_token_1.TOKEN_PROGRAM_ID);
            transaction.add(transferInstruction);
            const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [fromKeypair], {
                commitment: 'confirmed',
            });
            const confirmedTx = await this.connection.getTransaction(signature, {
                maxSupportedTransactionVersion: 0,
            });
            if (!confirmedTx) {
                throw new Error('Transaction confirmation failed');
            }
            const receipt = {
                transactionId: signature,
                from: fromPubkey.toBase58(),
                to: toPubkey.toBase58(),
                amount: amount.toString(),
                asset: tokenMint.toBase58(),
                timestamp: Date.now(),
                blockHash: confirmedTx.transaction.message.recentBlockhash || '',
                slot: confirmedTx.slot,
                signature,
                verifiable: true,
            };
            return receipt;
        }
        catch (error) {
            throw new Error(`Settlement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async executeFacilitatedSettlement(fromPubkey, toPubkey, amount, tokenMint) {
        if (!this.facilitatorKeypair) {
            throw new Error('Facilitator private key not configured');
        }
        return this.executeSettlement(fromPubkey, toPubkey, amount, tokenMint, this.facilitatorKeypair);
    }
    async getTransactionStatus(signature) {
        try {
            const status = await this.connection.getSignatureStatus(signature);
            if (!status || !status.value) {
                return 'pending';
            }
            if (status.value.err) {
                return 'failed';
            }
            if (status.value.confirmationStatus === 'confirmed' || status.value.confirmationStatus === 'finalized') {
                return 'confirmed';
            }
            return 'pending';
        }
        catch {
            return 'pending';
        }
    }
    async waitForConfirmation(signature, timeout = 60000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const status = await this.getTransactionStatus(signature);
            if (status === 'confirmed') {
                return true;
            }
            if (status === 'failed') {
                return false;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return false;
    }
}
exports.SettlementCoordinator = SettlementCoordinator;
//# sourceMappingURL=settlement.js.map