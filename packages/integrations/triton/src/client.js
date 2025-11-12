import { Connection, PublicKey } from '@solana/web3.js';
export class TritonClient {
    connection;
    apiKey;
    constructor(config) {
        this.apiKey = config.apiKey;
        const rpcUrl = config.rpcUrl || 'https://api.mainnet-beta.solana.com';
        const headers = {
            'X-API-Key': this.apiKey,
        };
        this.connection = new Connection(rpcUrl, {
            commitment: 'confirmed',
            httpHeaders: headers,
        });
    }
    async getBlock(query) {
        const config = {
            maxSupportedTransactionVersion: query.maxSupportedTransactionVersion ?? 0,
        };
        const block = await this.connection.getBlock(query.slot, config);
        return block;
    }
    async getTransaction(query) {
        const transaction = await this.connection.getTransaction(query.signature, {
            maxSupportedTransactionVersion: query.maxSupportedTransactionVersion ?? 0,
        });
        return transaction;
    }
    async getAccountHistory(query) {
        const pubkey = new PublicKey(query.address);
        const signatures = await this.connection.getSignaturesForAddress(pubkey, {
            before: query.before,
            limit: query.limit || 1000,
        });
        const transactions = await Promise.all(signatures.map(sig => this.connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
        })));
        return {
            address: query.address,
            transactions: transactions.filter(tx => tx !== null),
            signatures: signatures,
        };
    }
    async getTokenTransfers(params) {
        const mintPubkey = new PublicKey(params.mint);
        const tokenAccounts = await this.connection.getTokenLargestAccounts(mintPubkey);
        const transfers = [];
        for (const account of tokenAccounts.value.slice(0, params.limit || 100)) {
            const accountPubkey = account.address;
            const signatures = await this.connection.getSignaturesForAddress(accountPubkey, {
                limit: 100,
            });
            for (const sig of signatures) {
                if (params.fromSlot && sig.slot < params.fromSlot)
                    continue;
                if (params.toSlot && sig.slot > params.toSlot)
                    break;
                const tx = await this.connection.getTransaction(sig.signature, {
                    maxSupportedTransactionVersion: 0,
                });
                if (tx) {
                    transfers.push({
                        signature: sig.signature,
                        slot: sig.slot,
                        blockTime: sig.blockTime,
                        transaction: tx,
                    });
                }
            }
        }
        return {
            mint: params.mint,
            transfers,
        };
    }
    async getTokenHolders(mint, minBalance, limit) {
        const mintPubkey = new PublicKey(mint);
        const largestAccounts = await this.connection.getTokenLargestAccounts(mintPubkey);
        let holders = largestAccounts.value.map(account => ({
            address: account.address.toBase58(),
            amount: account.amount,
            decimals: account.decimals,
            uiAmount: account.uiAmount,
            uiAmountString: account.uiAmountString,
        }));
        if (minBalance !== undefined) {
            holders = holders.filter(h => (h.uiAmount ?? 0) >= minBalance);
        }
        if (limit) {
            holders = holders.slice(0, limit);
        }
        return {
            mint,
            holders,
            totalHolders: holders.length,
        };
    }
    async getProgramAccounts(programId) {
        const programPubkey = new PublicKey(programId);
        const accounts = await this.connection.getProgramAccounts(programPubkey);
        return {
            programId,
            accounts: accounts.map(account => ({
                pubkey: account.pubkey.toBase58(),
                account: {
                    lamports: account.account.lamports,
                    owner: account.account.owner.toBase58(),
                    data: account.account.data.toString('base64'),
                    executable: account.account.executable,
                    rentEpoch: account.account.rentEpoch,
                },
            })),
        };
    }
    async getBlockTime(slot) {
        return await this.connection.getBlockTime(slot);
    }
    async getRecentTransactions(address, limit) {
        const pubkey = new PublicKey(address);
        const signatures = await this.connection.getSignaturesForAddress(pubkey, {
            limit: limit || 20,
        });
        const transactions = await Promise.all(signatures.map(sig => this.connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
        })));
        return {
            address,
            transactions: transactions.filter(tx => tx !== null),
            count: transactions.filter(tx => tx !== null).length,
        };
    }
    async searchTransactions(filters) {
        if (!filters.accounts || filters.accounts.length === 0) {
            throw new Error('At least one account address is required');
        }
        const pubkey = new PublicKey(filters.accounts[0]);
        const signatures = await this.connection.getSignaturesForAddress(pubkey, {
            limit: filters.limit || 100,
        });
        const filteredSignatures = signatures.filter(sig => {
            if (filters.fromSlot && sig.slot < filters.fromSlot)
                return false;
            if (filters.toSlot && sig.slot > filters.toSlot)
                return false;
            return true;
        });
        const transactions = await Promise.all(filteredSignatures.map(sig => this.connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
        })));
        return {
            transactions: transactions.filter(tx => tx !== null),
            count: transactions.filter(tx => tx !== null).length,
        };
    }
    async getSlot() {
        return await this.connection.getSlot();
    }
    async getBlockHeight() {
        return await this.connection.getBlockHeight();
    }
    async getAccountInfo(address) {
        const pubkey = new PublicKey(address);
        const accountInfo = await this.connection.getAccountInfo(pubkey);
        if (!accountInfo) {
            return null;
        }
        return {
            address,
            lamports: accountInfo.lamports,
            owner: accountInfo.owner.toBase58(),
            executable: accountInfo.executable,
            rentEpoch: accountInfo.rentEpoch,
            data: accountInfo.data.toString('base64'),
        };
    }
}
//# sourceMappingURL=client.js.map