"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolanaX402Client = exports.CASH_MINT = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const axios_1 = __importDefault(require("axios"));
exports.CASH_MINT = new web3_js_1.PublicKey('CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH');
class SolanaX402Client {
    connection;
    config;
    httpClient;
    metrics = {
        totalSpent: 0,
        totalEarned: 0,
        netProfit: 0,
        transactionCount: 0,
        averageCostPerInference: 0,
    };
    paymentHistory = [];
    hourlySpending = new Map();
    spendingLimitPerHour;
    constructor(config) {
        this.config = config;
        const rpcUrl = config.rpcUrl ||
            (config.network === 'mainnet-beta'
                ? 'https://api.mainnet-beta.solana.com'
                : 'https://api.devnet.solana.com');
        this.connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
        this.httpClient = axios_1.default.create();
        this.spendingLimitPerHour = config.spendingLimitPerHour || Infinity;
    }
    async get(url, params) {
        return this.request('GET', url, undefined, params);
    }
    async post(url, data, params) {
        return this.request('POST', url, data, params);
    }
    async request(method, url, data, params) {
        try {
            const response = await this.httpClient.request({
                method,
                url,
                data,
                params,
            });
            return response.data;
        }
        catch (error) {
            if (error.response?.status === 402) {
                const requirements = error.response.data;
                const paymentHeader = await this.createPayment(requirements);
                const paidResponse = await this.httpClient.request({
                    method,
                    url,
                    data,
                    params,
                    headers: {
                        'X-Payment': paymentHeader,
                    },
                });
                return paidResponse.data;
            }
            throw error;
        }
    }
    async createPayment(requirements) {
        const recipientPubkey = new web3_js_1.PublicKey(requirements.payTo);
        const assetPubkey = new web3_js_1.PublicKey(requirements.asset);
        const amount = parseFloat(requirements.amount);
        this.trackPayment(amount, 'sent', requirements.payTo);
        let signature;
        if (requirements.asset === 'SOL' || assetPubkey.equals(web3_js_1.SystemProgram.programId)) {
            const lamports = Math.floor(amount * 1_000_000_000);
            const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
                fromPubkey: this.config.wallet.publicKey,
                toPubkey: recipientPubkey,
                lamports,
            }));
            signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [this.config.wallet], { commitment: 'confirmed' });
        }
        else {
            const isCash = assetPubkey.equals(exports.CASH_MINT);
            const programId = isCash ? spl_token_1.TOKEN_2022_PROGRAM_ID : spl_token_1.TOKEN_PROGRAM_ID;
            let decimals = 6;
            try {
                const mintInfo = await (0, spl_token_1.getMint)(this.connection, assetPubkey, 'confirmed', programId);
                decimals = mintInfo.decimals;
            }
            catch {
                decimals = 6;
            }
            const fromTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(assetPubkey, this.config.wallet.publicKey, false, programId);
            const toTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(assetPubkey, recipientPubkey, false, programId);
            const transaction = new web3_js_1.Transaction();
            try {
                await (0, spl_token_1.getAccount)(this.connection, toTokenAccount, 'confirmed', programId);
            }
            catch {
                const createATAIx = (0, spl_token_1.createAssociatedTokenAccountInstruction)(this.config.wallet.publicKey, toTokenAccount, recipientPubkey, assetPubkey, programId);
                transaction.add(createATAIx);
            }
            const transferAmount = Math.floor(amount * Math.pow(10, decimals));
            const transferIx = (0, spl_token_1.createTransferInstruction)(fromTokenAccount, toTokenAccount, this.config.wallet.publicKey, transferAmount, [], programId);
            transaction.add(transferIx);
            signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [this.config.wallet], { commitment: 'confirmed' });
        }
        const payload = {
            network: requirements.network,
            asset: requirements.asset,
            from: this.config.wallet.publicKey.toBase58(),
            to: requirements.payTo,
            amount: requirements.amount,
            signature,
            timestamp: Date.now(),
            nonce: requirements.nonce || this.generateNonce(),
            memo: requirements.memo,
        };
        return Buffer.from(JSON.stringify(payload)).toString('base64');
    }
    generateNonce() {
        const crypto = globalThis.crypto || require('crypto').webcrypto;
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Buffer.from(array).toString('hex');
    }
    getConnection() {
        return this.connection;
    }
    getWallet() {
        return this.config.wallet;
    }
    async getBalance(asset = 'SOL') {
        if (asset === 'SOL') {
            const balance = await this.connection.getBalance(this.config.wallet.publicKey);
            return balance / 1_000_000_000;
        }
        const tokenMint = asset === 'CASH' ? exports.CASH_MINT : new web3_js_1.PublicKey(asset);
        const isCash = tokenMint.equals(exports.CASH_MINT);
        const programId = isCash ? spl_token_1.TOKEN_2022_PROGRAM_ID : spl_token_1.TOKEN_PROGRAM_ID;
        let decimals = 6;
        try {
            const mintInfo = await (0, spl_token_1.getMint)(this.connection, tokenMint, 'confirmed', programId);
            decimals = mintInfo.decimals;
        }
        catch {
            decimals = 6;
        }
        const tokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(tokenMint, this.config.wallet.publicKey, false, programId);
        try {
            const account = await (0, spl_token_1.getAccount)(this.connection, tokenAccount, 'confirmed', programId);
            return Number(account.amount) / Math.pow(10, decimals);
        }
        catch {
            return 0;
        }
    }
    getWalletAddress() {
        return this.config.wallet.publicKey.toBase58();
    }
    getMetrics() {
        return { ...this.metrics };
    }
    getPaymentHistory(limit) {
        const history = [...this.paymentHistory].reverse();
        return limit ? history.slice(0, limit) : history;
    }
    async fetchPaymentHistory(limit = 100) {
        const signatures = await this.connection.getSignaturesForAddress(this.config.wallet.publicKey, { limit });
        const records = [];
        for (const sig of signatures) {
            const tx = await this.connection.getParsedTransaction(sig.signature, {
                maxSupportedTransactionVersion: 0,
            });
            if (!tx || !tx.meta)
                continue;
            const preBalance = tx.meta.preBalances[0] || 0;
            const postBalance = tx.meta.postBalances[0] || 0;
            const diff = (postBalance - preBalance) / 1_000_000_000;
            if (diff !== 0) {
                records.push({
                    signature: sig.signature,
                    timestamp: sig.blockTime ? sig.blockTime * 1000 : Date.now(),
                    amount: Math.abs(diff),
                    asset: 'SOL',
                    type: diff < 0 ? 'sent' : 'received',
                    from: this.config.wallet.publicKey.toBase58(),
                    to: '',
                });
            }
        }
        return records;
    }
    getSpentThisHour() {
        const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
        return this.hourlySpending.get(currentHour) || 0;
    }
    getRemainingHourlyBudget() {
        const spent = this.getSpentThisHour();
        return Math.max(0, this.spendingLimitPerHour - spent);
    }
    trackPayment(amount, type, counterparty) {
        const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
        if (type === 'sent') {
            this.metrics.totalSpent += amount;
            this.hourlySpending.set(currentHour, (this.hourlySpending.get(currentHour) || 0) + amount);
        }
        else {
            this.metrics.totalEarned += amount;
        }
        this.metrics.netProfit = this.metrics.totalEarned - this.metrics.totalSpent;
        this.metrics.transactionCount++;
        this.metrics.averageCostPerInference =
            this.metrics.transactionCount > 0
                ? this.metrics.totalSpent / this.metrics.transactionCount
                : 0;
        this.paymentHistory.push({
            signature: '',
            timestamp: Date.now(),
            amount,
            asset: 'SOL',
            type,
            from: type === 'sent' ? this.config.wallet.publicKey.toBase58() : counterparty,
            to: type === 'sent' ? counterparty : this.config.wallet.publicKey.toBase58(),
        });
        this.cleanupOldHourlyData();
    }
    cleanupOldHourlyData() {
        const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
        const cutoffHour = currentHour - 24;
        for (const [hour] of this.hourlySpending) {
            if (hour < cutoffHour) {
                this.hourlySpending.delete(hour);
            }
        }
    }
    recordEarnings(amount, from) {
        this.trackPayment(amount, 'received', from);
    }
}
exports.SolanaX402Client = SolanaX402Client;
//# sourceMappingURL=solana-x402-client.js.map