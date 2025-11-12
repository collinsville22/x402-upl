import { Connection, PublicKey, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL, } from '@solana/web3.js';
import { createTransferInstruction, getOrCreateAssociatedTokenAccount, getAccount, TOKEN_2022_PROGRAM_ID, } from '@solana/spl-token';
export const CASH_MINT = new PublicKey('CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH');
export const CASH_DECIMALS = 6;
export class PhantomCashClient {
    connection;
    wallet;
    network;
    constructor(wallet, network = 'mainnet-beta') {
        this.wallet = wallet;
        this.network = network;
        const rpcUrl = network === 'mainnet-beta'
            ? 'https://api.mainnet-beta.solana.com'
            : 'https://api.devnet.solana.com';
        this.connection = new Connection(rpcUrl, 'confirmed');
    }
    async getWalletAddress() {
        return this.wallet.publicKey.toBase58();
    }
    async getSolBalance() {
        const balance = await this.connection.getBalance(this.wallet.publicKey);
        return balance / LAMPORTS_PER_SOL;
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
    async sendCash(recipientAddress, amount, memo) {
        const recipient = new PublicKey(recipientAddress);
        const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(this.connection, this.wallet, CASH_MINT, this.wallet.publicKey, false, 'confirmed', undefined, TOKEN_2022_PROGRAM_ID);
        const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(this.connection, this.wallet, CASH_MINT, recipient, false, 'confirmed', undefined, TOKEN_2022_PROGRAM_ID);
        const transferAmount = Math.floor(amount * Math.pow(10, CASH_DECIMALS));
        const transaction = new Transaction().add(createTransferInstruction(sourceTokenAccount.address, destinationTokenAccount.address, this.wallet.publicKey, transferAmount, [], TOKEN_2022_PROGRAM_ID));
        const signature = await sendAndConfirmTransaction(this.connection, transaction, [this.wallet], { commitment: 'confirmed' });
        return {
            signature,
            amount,
            recipient: recipientAddress,
        };
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
    async getTransactionDetails(signature) {
        return await this.connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
        });
    }
    async requestAirdrop(lamports = LAMPORTS_PER_SOL) {
        if (this.network !== 'devnet') {
            throw new Error('Airdrop only available on devnet');
        }
        const signature = await this.connection.requestAirdrop(this.wallet.publicKey, lamports);
        await this.connection.confirmTransaction(signature);
        return signature;
    }
}
//# sourceMappingURL=cash-client.js.map