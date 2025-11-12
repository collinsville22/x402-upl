import { Connection, PublicKey, SystemProgram, Transaction, } from "@solana/web3.js";
import { CdpClient as BaseCdpClient } from "@coinbase/cdp-sdk";
export class CDPSolanaClient {
    cdp;
    connection;
    network;
    constructor(network = 'devnet') {
        this.cdp = new BaseCdpClient();
        this.network = network;
        const rpcUrl = network === 'mainnet-beta'
            ? 'https://api.mainnet-beta.solana.com'
            : 'https://api.devnet.solana.com';
        this.connection = new Connection(rpcUrl, 'confirmed');
    }
    async createAccount() {
        const account = await this.cdp.solana.createAccount();
        return {
            accountId: account.address,
            address: account.address,
            created: new Date(),
        };
    }
    async requestFaucet(address) {
        if (this.network !== 'devnet') {
            throw new Error('Faucet only available on devnet');
        }
        await this.cdp.solana.requestFaucet({
            address,
            token: 'sol',
        });
    }
    async getBalance(address) {
        const balance = await this.connection.getBalance(new PublicKey(address));
        return balance;
    }
    async waitForBalance(address, maxAttempts = 30) {
        let balance = 0;
        let attempts = 0;
        while (balance === 0 && attempts < maxAttempts) {
            balance = await this.connection.getBalance(new PublicKey(address));
            if (balance === 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
            }
        }
        if (balance === 0) {
            throw new Error('Account not funded after multiple attempts');
        }
        return balance;
    }
    async sendTransaction(fromAddress, toAddress, lamports) {
        const fromPubkey = new PublicKey(fromAddress);
        const toPubkey = new PublicKey(toAddress);
        const { blockhash } = await this.connection.getLatestBlockhash();
        const transaction = new Transaction();
        transaction.add(SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports,
        }));
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;
        const serializedTx = Buffer.from(transaction.serialize({ requireAllSignatures: false })).toString('base64');
        const { signature: txSignature } = await this.cdp.solana.signTransaction({
            address: fromAddress,
            transaction: serializedTx,
        });
        const decodedSignedTx = Buffer.from(txSignature, 'base64');
        const txSendSignature = await this.connection.sendRawTransaction(decodedSignedTx);
        const latestBlockhash = await this.connection.getLatestBlockhash();
        const confirmation = await this.connection.confirmTransaction({
            signature: txSendSignature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        });
        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
        }
        return {
            signature: txSendSignature,
            confirmed: true,
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
    async close() {
        await this.cdp.close();
    }
}
//# sourceMappingURL=cdp-client.js.map