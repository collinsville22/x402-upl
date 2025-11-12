"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrowWalletManager = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
class EscrowWalletManager {
    connection;
    escrowKeypair;
    redis;
    constructor(config) {
        this.connection = config.connection;
        this.escrowKeypair = config.escrowKeypair;
        this.redis = config.redis;
    }
    async createUserEscrow(userId, userWallet) {
        const escrow = {
            userId,
            userWallet,
            balance: 0,
            spent: 0,
            createdAt: Date.now(),
            lastTopUpAt: Date.now(),
        };
        await this.redis.set(`escrow:${userId}`, JSON.stringify(escrow));
        return escrow;
    }
    async depositFunds(userId, amount, signature) {
        const escrowData = await this.redis.get(`escrow:${userId}`);
        if (!escrowData) {
            throw new Error('Escrow account not found');
        }
        const escrow = JSON.parse(escrowData);
        const txInfo = await this.connection.getTransaction(signature, {
            maxSupportedTransactionVersion: 0,
        });
        if (!txInfo) {
            throw new Error('Transaction not found');
        }
        const recipientPubkey = this.escrowKeypair.publicKey.toBase58();
        const accountKeys = txInfo.transaction.message.getAccountKeys();
        let verified = false;
        const postBalances = txInfo.meta?.postBalances || [];
        const preBalances = txInfo.meta?.preBalances || [];
        for (let i = 0; i < accountKeys.length; i++) {
            if (accountKeys.get(i)?.toBase58() === recipientPubkey) {
                const received = (postBalances[i] - preBalances[i]) / 1_000_000_000;
                if (Math.abs(received - amount) < 0.000001) {
                    verified = true;
                    break;
                }
            }
        }
        if (!verified) {
            throw new Error('Payment verification failed');
        }
        escrow.balance += amount;
        escrow.lastTopUpAt = Date.now();
        await this.redis.set(`escrow:${userId}`, JSON.stringify(escrow));
        return escrow;
    }
    async getBalance(userId) {
        const escrowData = await this.redis.get(`escrow:${userId}`);
        if (!escrowData) {
            return 0;
        }
        const escrow = JSON.parse(escrowData);
        return escrow.balance;
    }
    async deductFunds(userId, amount) {
        const escrowData = await this.redis.get(`escrow:${userId}`);
        if (!escrowData) {
            throw new Error('Escrow account not found');
        }
        const escrow = JSON.parse(escrowData);
        if (escrow.balance < amount) {
            throw new Error(`Insufficient balance. Available: ${escrow.balance}, Required: ${amount}`);
        }
        escrow.balance -= amount;
        escrow.spent += amount;
        await this.redis.set(`escrow:${userId}`, JSON.stringify(escrow));
        return true;
    }
    async executePayment(userId, recipient, amount, mint) {
        await this.deductFunds(userId, amount);
        try {
            let signature;
            if (!mint) {
                signature = await this.sendSOLPayment(recipient, amount);
            }
            else {
                signature = await this.sendTokenPayment(recipient, mint, amount);
            }
            await this.redis.lpush(`escrow:${userId}:payments`, JSON.stringify({
                signature,
                amount,
                recipient: recipient.toBase58(),
                asset: mint ? mint.toBase58() : 'SOL',
                timestamp: Date.now(),
            }));
            return signature;
        }
        catch (error) {
            await this.refundFunds(userId, amount);
            throw error;
        }
    }
    async sendSOLPayment(recipient, amount) {
        const lamports = Math.floor(amount * 1_000_000_000);
        const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
            fromPubkey: this.escrowKeypair.publicKey,
            toPubkey: recipient,
            lamports,
        }));
        const signature = await this.connection.sendTransaction(transaction, [this.escrowKeypair]);
        await this.connection.confirmTransaction(signature, 'confirmed');
        return signature;
    }
    async sendTokenPayment(recipient, mint, amount) {
        const fromTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(mint, this.escrowKeypair.publicKey, false, spl_token_1.TOKEN_PROGRAM_ID);
        const toTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(mint, recipient, false, spl_token_1.TOKEN_PROGRAM_ID);
        const mintInfo = await this.connection.getParsedAccountInfo(mint);
        const decimals = mintInfo.value?.data?.parsed?.info?.decimals || 6;
        const adjustedAmount = Math.floor(amount * Math.pow(10, decimals));
        const transaction = new web3_js_1.Transaction().add((0, spl_token_1.createTransferInstruction)(fromTokenAccount, toTokenAccount, this.escrowKeypair.publicKey, adjustedAmount, [], spl_token_1.TOKEN_PROGRAM_ID));
        const signature = await this.connection.sendTransaction(transaction, [this.escrowKeypair]);
        await this.connection.confirmTransaction(signature, 'confirmed');
        return signature;
    }
    async refundFunds(userId, amount) {
        const escrowData = await this.redis.get(`escrow:${userId}`);
        if (!escrowData) {
            return;
        }
        const escrow = JSON.parse(escrowData);
        escrow.balance += amount;
        escrow.spent -= amount;
        await this.redis.set(`escrow:${userId}`, JSON.stringify(escrow));
    }
    async withdrawFunds(userId, amount, destination) {
        const escrowData = await this.redis.get(`escrow:${userId}`);
        if (!escrowData) {
            throw new Error('Escrow account not found');
        }
        const escrow = JSON.parse(escrowData);
        if (escrow.balance < amount) {
            throw new Error(`Insufficient balance. Available: ${escrow.balance}, Requested: ${amount}`);
        }
        const signature = await this.sendSOLPayment(destination, amount);
        escrow.balance -= amount;
        await this.redis.set(`escrow:${userId}`, JSON.stringify(escrow));
        return signature;
    }
    async getUserHistory(userId, limit = 50) {
        const payments = await this.redis.lrange(`escrow:${userId}:payments`, 0, limit - 1);
        return payments.map((p) => JSON.parse(p));
    }
    getEscrowPublicKey() {
        return this.escrowKeypair.publicKey;
    }
}
exports.EscrowWalletManager = EscrowWalletManager;
//# sourceMappingURL=escrow-wallet.js.map