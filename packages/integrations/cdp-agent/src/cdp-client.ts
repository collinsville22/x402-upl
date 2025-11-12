import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { CdpClient as BaseCdpClient } from "@coinbase/cdp-sdk";

export interface SolanaAccount {
  accountId: string;
  address: string;
  created: Date;
}

export interface TransactionResult {
  signature: string;
  confirmed: boolean;
}

export class CDPSolanaClient {
  private cdp: BaseCdpClient;
  private connection: Connection;
  private network: 'devnet' | 'mainnet-beta';

  constructor(network: 'devnet' | 'mainnet-beta' = 'devnet') {
    this.cdp = new BaseCdpClient();
    this.network = network;

    const rpcUrl = network === 'mainnet-beta'
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';

    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async createAccount(): Promise<SolanaAccount> {
    const account = await this.cdp.solana.createAccount();

    return {
      accountId: account.address,
      address: account.address,
      created: new Date(),
    };
  }

  async requestFaucet(address: string): Promise<void> {
    if (this.network !== 'devnet') {
      throw new Error('Faucet only available on devnet');
    }

    await this.cdp.solana.requestFaucet({
      address,
      token: 'sol',
    });
  }

  async getBalance(address: string): Promise<number> {
    const balance = await this.connection.getBalance(new PublicKey(address));
    return balance;
  }

  async waitForBalance(
    address: string,
    maxAttempts: number = 30
  ): Promise<number> {
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

  async sendTransaction(
    fromAddress: string,
    toAddress: string,
    lamports: number
  ): Promise<TransactionResult> {
    const fromPubkey = new PublicKey(fromAddress);
    const toPubkey = new PublicKey(toAddress);

    const { blockhash } = await this.connection.getLatestBlockhash();

    const transaction = new Transaction();
    transaction.add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports,
      })
    );

    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    const serializedTx = Buffer.from(
      transaction.serialize({ requireAllSignatures: false })
    ).toString('base64');

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

  async verifyTransaction(signature: string): Promise<boolean> {
    try {
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      return tx !== null && !tx.meta?.err;
    } catch (error) {
      return false;
    }
  }

  async getTransactionDetails(signature: string) {
    return await this.connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
  }

  async close(): Promise<void> {
    await this.cdp.close();
  }
}
