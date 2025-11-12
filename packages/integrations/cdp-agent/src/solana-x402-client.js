import { Connection, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token';
import axios from 'axios';
export class SolanaX402Client {
    connection;
    config;
    httpClient;
    constructor(config) {
        this.config = config;
        const rpcUrl = config.rpcUrl ||
            (config.network === 'mainnet-beta'
                ? 'https://api.mainnet-beta.solana.com'
                : 'https://api.devnet.solana.com');
        this.connection = new Connection(rpcUrl, 'confirmed');
        this.httpClient = axios.create();
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
        const recipientPubkey = new PublicKey(requirements.payTo);
        const assetPubkey = new PublicKey(requirements.asset);
        const amount = parseFloat(requirements.amount);
        let signature;
        if (requirements.asset === 'SOL' || assetPubkey.equals(SystemProgram.programId)) {
            const lamports = Math.floor(amount * 1_000_000_000);
            const transaction = new Transaction().add(SystemProgram.transfer({
                fromPubkey: this.config.wallet.publicKey,
                toPubkey: recipientPubkey,
                lamports,
            }));
            signature = await sendAndConfirmTransaction(this.connection, transaction, [this.config.wallet], { commitment: 'confirmed' });
        }
        else {
            const fromTokenAccount = await getAssociatedTokenAddress(assetPubkey, this.config.wallet.publicKey);
            const toTokenAccount = await getAssociatedTokenAddress(assetPubkey, recipientPubkey);
            const transaction = new Transaction();
            try {
                await getAccount(this.connection, toTokenAccount);
            }
            catch {
                const createATAIx = createAssociatedTokenAccountInstruction(this.config.wallet.publicKey, toTokenAccount, recipientPubkey, assetPubkey);
                transaction.add(createATAIx);
            }
            const decimals = 6;
            const transferAmount = Math.floor(amount * Math.pow(10, decimals));
            const transferIx = createTransferInstruction(fromTokenAccount, toTokenAccount, this.config.wallet.publicKey, transferAmount);
            transaction.add(transferIx);
            signature = await sendAndConfirmTransaction(this.connection, transaction, [this.config.wallet], { commitment: 'confirmed' });
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
}
//# sourceMappingURL=solana-x402-client.js.map