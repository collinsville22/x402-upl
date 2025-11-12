"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionWallet = void 0;
exports.createPhantomAdapter = createPhantomAdapter;
exports.createSolflareAdapter = createSolflareAdapter;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const web3_js_2 = require("@solana/web3.js");
class SessionWallet {
    connection;
    adapter;
    approval;
    spent = 0;
    pendingTransactions = new Map();
    constructor(connection, adapter, approval) {
        this.connection = connection;
        this.adapter = adapter;
        this.approval = approval;
    }
    async createPaymentTransaction(recipient, amount, mint) {
        if (Date.now() > this.approval.expiresAt) {
            throw new Error('Payment approval expired');
        }
        if (this.spent + amount > this.approval.maxTotalAmount) {
            throw new Error(`Total spending limit exceeded. Spent: ${this.spent}, Requested: ${amount}, Limit: ${this.approval.maxTotalAmount}`);
        }
        if (amount > this.approval.maxPerTransaction) {
            throw new Error(`Per-transaction limit exceeded. Requested: ${amount}, Limit: ${this.approval.maxPerTransaction}`);
        }
        if (this.approval.allowedRecipients) {
            const recipientStr = recipient.toBase58();
            if (!this.approval.allowedRecipients.includes(recipientStr)) {
                throw new Error(`Recipient ${recipientStr} not in allowed list`);
            }
        }
        const transaction = new web3_js_1.Transaction();
        const { blockhash } = await this.connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = this.adapter.publicKey;
        if (!mint) {
            const lamports = Math.floor(amount * 1_000_000_000);
            transaction.add(web3_js_2.SystemProgram.transfer({
                fromPubkey: this.adapter.publicKey,
                toPubkey: recipient,
                lamports,
            }));
        }
        else {
            const fromTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(mint, this.adapter.publicKey, false, spl_token_1.TOKEN_PROGRAM_ID);
            const toTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(mint, recipient, false, spl_token_1.TOKEN_PROGRAM_ID);
            const mintInfo = await this.connection.getParsedAccountInfo(mint);
            const decimals = mintInfo.value?.data?.parsed?.info?.decimals || 6;
            const adjustedAmount = Math.floor(amount * Math.pow(10, decimals));
            transaction.add((0, spl_token_1.createTransferInstruction)(fromTokenAccount, toTokenAccount, this.adapter.publicKey, adjustedAmount, [], spl_token_1.TOKEN_PROGRAM_ID));
        }
        return {
            transaction,
            requiresApproval: false,
        };
    }
    async executePayment(recipient, amount, mint) {
        const { transaction } = await this.createPaymentTransaction(recipient, amount, mint);
        const signed = await this.adapter.signTransaction(transaction);
        const signature = await this.connection.sendRawTransaction(signed.serialize());
        await this.connection.confirmTransaction(signature, 'confirmed');
        this.spent += amount;
        return signature;
    }
    async batchPayments(payments) {
        const transactions = [];
        for (const payment of payments) {
            const { transaction } = await this.createPaymentTransaction(payment.recipient, payment.amount, payment.mint);
            transactions.push(transaction);
        }
        const signed = await this.adapter.signAllTransactions(transactions);
        const signatures = [];
        for (const tx of signed) {
            const sig = await this.connection.sendRawTransaction(tx.serialize());
            signatures.push(sig);
        }
        await Promise.all(signatures.map((sig) => this.connection.confirmTransaction(sig, 'confirmed')));
        const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0);
        this.spent += totalSpent;
        return signatures;
    }
    getRemainingBudget() {
        return this.approval.maxTotalAmount - this.spent;
    }
    getSpent() {
        return this.spent;
    }
    isExpired() {
        return Date.now() > this.approval.expiresAt;
    }
    getApproval() {
        return { ...this.approval };
    }
    getPublicKey() {
        return this.adapter.publicKey;
    }
}
exports.SessionWallet = SessionWallet;
function createPhantomAdapter() {
    if (typeof window === 'undefined') {
        return null;
    }
    const provider = window.phantom?.solana;
    if (!provider) {
        return null;
    }
    return {
        get publicKey() {
            return provider.publicKey;
        },
        get connected() {
            return provider.isConnected;
        },
        async connect() {
            await provider.connect();
        },
        async disconnect() {
            await provider.disconnect();
        },
        async signTransaction(transaction) {
            return await provider.signTransaction(transaction);
        },
        async signAllTransactions(transactions) {
            return await provider.signAllTransactions(transactions);
        },
        async signMessage(message) {
            return await provider.signMessage(message);
        },
    };
}
function createSolflareAdapter() {
    if (typeof window === 'undefined') {
        return null;
    }
    const provider = window.solflare;
    if (!provider) {
        return null;
    }
    return {
        get publicKey() {
            return provider.publicKey;
        },
        get connected() {
            return provider.isConnected;
        },
        async connect() {
            await provider.connect();
        },
        async disconnect() {
            await provider.disconnect();
        },
        async signTransaction(transaction) {
            return await provider.signTransaction(transaction);
        },
        async signAllTransactions(transactions) {
            return await provider.signAllTransactions(transactions);
        },
        async signMessage(message) {
            return await provider.signMessage(message);
        },
    };
}
//# sourceMappingURL=wallet-adapter.js.map