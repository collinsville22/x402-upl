import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createTransferInstruction, getOrCreateAssociatedTokenAccount, getAccount, TOKEN_2022_PROGRAM_ID, } from '@solana/spl-token';
import axios from 'axios';
export const CASH_MINT = new PublicKey('CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH');
export const CASH_DECIMALS = 6;
export class PhantomCashX402Error extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'PhantomCashX402Error';
    }
}
export class PhantomCashX402Client {
    connection;
    wallet;
    config;
    httpClient;
    metrics;
    paymentHistory = [];
    hourlySpending = new Map();
    constructor(config) {
        this.config = config;
        this.wallet = config.wallet;
        const rpcUrl = config.rpcUrl ||
            (config.network === 'mainnet-beta'
                ? 'https://api.mainnet-beta.solana.com'
                : 'https://api.devnet.solana.com');
        this.connection = new Connection(rpcUrl, 'confirmed');
        this.httpClient = axios.create({
            timeout: config.timeout || 30000,
            validateStatus: (status) => status < 600,
        });
        this.metrics = {
            totalSpent: 0,
            totalEarned: 0,
            netProfit: 0,
            transactionCount: 0,
            averageCostPerInference: 0,
        };
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
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'PhantomCashX402Client/1.0',
                },
            });
            if (response.status === 402) {
                const requirements = this.parsePaymentRequirements(response.data);
                const paymentHeader = await this.createPayment(requirements);
                const retryResponse = await this.httpClient.request({
                    method,
                    url,
                    data,
                    params,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'PhantomCashX402Client/1.0',
                        'X-Payment': paymentHeader,
                    },
                });
                if (!retryResponse.data) {
                    throw new PhantomCashX402Error('Empty response after payment', 'EMPTY_RESPONSE');
                }
                return retryResponse.data;
            }
            if (response.status >= 400) {
                throw new PhantomCashX402Error(`HTTP ${response.status}: ${response.statusText}`, 'HTTP_ERROR', { status: response.status, data: response.data });
            }
            return response.data;
        }
        catch (error) {
            if (error instanceof PhantomCashX402Error) {
                throw error;
            }
            if (axios.isAxiosError(error)) {
                const axiosError = error;
                throw new PhantomCashX402Error(`Network error: ${axiosError.message}`, 'NETWORK_ERROR', { originalError: axiosError });
            }
            throw new PhantomCashX402Error(`Unknown error: ${error.message}`, 'UNKNOWN_ERROR', { originalError: error });
        }
    }
    parsePaymentRequirements(data) {
        if (!data || typeof data !== 'object') {
            throw new PhantomCashX402Error('Invalid payment requirements format', 'INVALID_PAYMENT_REQUIREMENTS');
        }
        const required = ['scheme', 'network', 'asset', 'payTo', 'amount'];
        for (const field of required) {
            if (!data[field]) {
                throw new PhantomCashX402Error(`Missing required field: ${field}`, 'MISSING_FIELD', { field });
            }
        }
        if (data.scheme !== 'solana') {
            throw new PhantomCashX402Error(`Unsupported payment scheme: ${data.scheme}`, 'UNSUPPORTED_SCHEME', { scheme: data.scheme });
        }
        return {
            scheme: data.scheme,
            network: data.network,
            asset: data.asset,
            payTo: data.payTo,
            amount: data.amount,
            timeout: data.timeout,
            resource: data.resource,
            description: data.description,
            nonce: data.nonce,
        };
    }
    async createPayment(requirements) {
        const amount = parseFloat(requirements.amount);
        if (isNaN(amount) || amount <= 0) {
            throw new PhantomCashX402Error(`Invalid payment amount: ${requirements.amount}`, 'INVALID_AMOUNT');
        }
        const currentHour = Math.floor(Date.now() / 3600000);
        const spentThisHour = this.hourlySpending.get(currentHour) || 0;
        const limit = this.config.spendingLimitPerHour || Infinity;
        if (spentThisHour + amount > limit) {
            throw new PhantomCashX402Error(`Spending limit exceeded: ${spentThisHour + amount} > ${limit}`, 'SPENDING_LIMIT_EXCEEDED', { spent: spentThisHour, limit, requested: amount });
        }
        let recipient;
        try {
            recipient = new PublicKey(requirements.payTo);
        }
        catch (error) {
            throw new PhantomCashX402Error(`Invalid recipient address: ${requirements.payTo}`, 'INVALID_ADDRESS', { address: requirements.payTo });
        }
        let signature;
        if (requirements.asset === 'SOL') {
            signature = await this.sendSolPayment(recipient, amount);
        }
        else if (requirements.asset === 'CASH' || requirements.asset === CASH_MINT.toBase58()) {
            signature = await this.sendCashPayment(recipient, amount);
        }
        else {
            try {
                const mintPubkey = new PublicKey(requirements.asset);
                signature = await this.sendTokenPayment(recipient, amount, mintPubkey);
            }
            catch (error) {
                throw new PhantomCashX402Error(`Unsupported asset: ${requirements.asset}`, 'UNSUPPORTED_ASSET', { asset: requirements.asset });
            }
        }
        this.trackPayment(amount, 'sent', requirements.payTo, requirements.asset);
        const payload = {
            network: requirements.network,
            asset: requirements.asset,
            from: this.wallet.publicKey.toBase58(),
            to: requirements.payTo,
            amount: requirements.amount,
            signature,
            timestamp: Date.now(),
            nonce: requirements.nonce || this.generateNonce(),
        };
        return Buffer.from(JSON.stringify(payload)).toString('base64');
    }
    async sendSolPayment(recipient, amount) {
        const lamports = Math.floor(amount * 1_000_000_000);
        const balance = await this.connection.getBalance(this.wallet.publicKey);
        if (balance < lamports) {
            throw new PhantomCashX402Error(`Insufficient SOL balance: ${balance / 1_000_000_000} < ${amount}`, 'INSUFFICIENT_BALANCE', { required: amount, available: balance / 1_000_000_000 });
        }
        const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
        const transaction = new Transaction({
            feePayer: this.wallet.publicKey,
            blockhash,
            lastValidBlockHeight: (await this.connection.getLatestBlockhash()).lastValidBlockHeight,
        }).add(SystemProgram.transfer({
            fromPubkey: this.wallet.publicKey,
            toPubkey: recipient,
            lamports,
        }));
        transaction.sign(this.wallet);
        const signature = await this.connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false, preflightCommitment: 'confirmed' });
        await this.connection.confirmTransaction(signature, 'confirmed');
        return signature;
    }
    async sendCashPayment(recipient, amount) {
        return this.sendTokenPayment(recipient, amount, CASH_MINT, TOKEN_2022_PROGRAM_ID);
    }
    async sendTokenPayment(recipient, amount, mint, programId = TOKEN_2022_PROGRAM_ID) {
        const transferAmount = Math.floor(amount * Math.pow(10, CASH_DECIMALS));
        const sourceAccount = await getOrCreateAssociatedTokenAccount(this.connection, this.wallet, mint, this.wallet.publicKey, false, 'confirmed', undefined, programId);
        const accountInfo = await getAccount(this.connection, sourceAccount.address, 'confirmed', programId);
        if (Number(accountInfo.amount) < transferAmount) {
            throw new PhantomCashX402Error(`Insufficient token balance: ${Number(accountInfo.amount) / Math.pow(10, CASH_DECIMALS)} < ${amount}`, 'INSUFFICIENT_BALANCE', { required: amount, available: Number(accountInfo.amount) / Math.pow(10, CASH_DECIMALS) });
        }
        const destAccount = await getOrCreateAssociatedTokenAccount(this.connection, this.wallet, mint, recipient, false, 'confirmed', undefined, programId);
        const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
        const transaction = new Transaction({
            feePayer: this.wallet.publicKey,
            blockhash,
            lastValidBlockHeight: (await this.connection.getLatestBlockhash()).lastValidBlockHeight,
        }).add(createTransferInstruction(sourceAccount.address, destAccount.address, this.wallet.publicKey, transferAmount, [], programId));
        transaction.sign(this.wallet);
        const signature = await this.connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false, preflightCommitment: 'confirmed' });
        await this.connection.confirmTransaction(signature, 'confirmed');
        return signature;
    }
    trackPayment(amount, type, counterparty, asset) {
        const currentHour = Math.floor(Date.now() / 3600000);
        if (type === 'sent') {
            this.metrics.totalSpent += amount;
            this.hourlySpending.set(currentHour, (this.hourlySpending.get(currentHour) || 0) + amount);
        }
        else {
            this.metrics.totalEarned += amount;
        }
        this.metrics.netProfit = this.metrics.totalEarned - this.metrics.totalSpent;
        this.metrics.transactionCount += 1;
        this.metrics.averageCostPerInference =
            this.metrics.transactionCount > 0
                ? this.metrics.totalSpent / this.metrics.transactionCount
                : 0;
        const record = {
            signature: '',
            timestamp: Date.now(),
            amount,
            asset,
            type,
            from: type === 'sent' ? this.wallet.publicKey.toBase58() : counterparty,
            to: type === 'sent' ? counterparty : this.wallet.publicKey.toBase58(),
        };
        this.paymentHistory.push(record);
        this.cleanupOldHourlyData();
    }
    cleanupOldHourlyData() {
        const currentHour = Math.floor(Date.now() / 3600000);
        const cutoffHour = currentHour - 24;
        for (const [hour] of this.hourlySpending) {
            if (hour < cutoffHour) {
                this.hourlySpending.delete(hour);
            }
        }
    }
    generateNonce() {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
    async getWalletAddress() {
        return this.wallet.publicKey.toBase58();
    }
    async getSolBalance() {
        const balance = await this.connection.getBalance(this.wallet.publicKey);
        return balance / 1_000_000_000;
    }
    async getCashBalance() {
        try {
            const tokenAccount = await getOrCreateAssociatedTokenAccount(this.connection, this.wallet, CASH_MINT, this.wallet.publicKey, false, 'confirmed', undefined, TOKEN_2022_PROGRAM_ID);
            const accountInfo = await getAccount(this.connection, tokenAccount.address, 'confirmed', TOKEN_2022_PROGRAM_ID);
            return Number(accountInfo.amount) / Math.pow(10, CASH_DECIMALS);
        }
        catch (error) {
            return 0;
        }
    }
    getMetrics() {
        return { ...this.metrics };
    }
    getPaymentHistory(limit) {
        const history = [...this.paymentHistory].reverse();
        return limit ? history.slice(0, limit) : history;
    }
    getSpentThisHour() {
        const currentHour = Math.floor(Date.now() / 3600000);
        return this.hourlySpending.get(currentHour) || 0;
    }
    getRemainingHourlyBudget() {
        const limit = this.config.spendingLimitPerHour || Infinity;
        if (!isFinite(limit))
            return Infinity;
        const spent = this.getSpentThisHour();
        return Math.max(0, limit - spent);
    }
    async verifyTransaction(signature) {
        try {
            const tx = await this.connection.getTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0,
            });
            return tx !== null && !tx.meta?.err;
        }
        catch (error) {
            return false;
        }
    }
}
//# sourceMappingURL=phantom-cash-x402-client.js.map