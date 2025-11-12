import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token';
import axios, { AxiosInstance } from 'axios';

export interface SolanaX402Config {
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  rpcUrl?: string;
  wallet: Keypair;
  facilitatorUrl?: string;
}

export interface PaymentRequirements {
  scheme: string;
  network: string;
  asset: string;
  payTo: string;
  amount: string;
  memo?: string;
  timeout: number;
  nonce?: string;
}

export class SolanaX402Client {
  private connection: Connection;
  private config: SolanaX402Config;
  private httpClient: AxiosInstance;

  constructor(config: SolanaX402Config) {
    this.config = config;

    const rpcUrl = config.rpcUrl ||
      (config.network === 'mainnet-beta'
        ? 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com');

    this.connection = new Connection(rpcUrl, 'confirmed');
    this.httpClient = axios.create();
  }

  async get<T = any>(url: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>('GET', url, undefined, params);
  }

  async post<T = any>(url: string, data?: any, params?: Record<string, any>): Promise<T> {
    return this.request<T>('POST', url, data, params);
  }

  private async request<T = any>(
    method: 'GET' | 'POST',
    url: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
    try {
      const response = await this.httpClient.request({
        method,
        url,
        data,
        params,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 402) {
        const requirements: PaymentRequirements = error.response.data;
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

  private async createPayment(requirements: PaymentRequirements): Promise<string> {
    const recipientPubkey = new PublicKey(requirements.payTo);
    const assetPubkey = new PublicKey(requirements.asset);
    const amount = parseFloat(requirements.amount);

    let signature: string;

    if (requirements.asset === 'SOL' || assetPubkey.equals(SystemProgram.programId)) {
      const lamports = Math.floor(amount * 1_000_000_000);
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.config.wallet.publicKey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );

      signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.config.wallet],
        { commitment: 'confirmed' }
      );
    } else {
      const fromTokenAccount = await getAssociatedTokenAddress(
        assetPubkey,
        this.config.wallet.publicKey
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        assetPubkey,
        recipientPubkey
      );

      const transaction = new Transaction();

      try {
        await getAccount(this.connection, toTokenAccount);
      } catch {
        const createATAIx = createAssociatedTokenAccountInstruction(
          this.config.wallet.publicKey,
          toTokenAccount,
          recipientPubkey,
          assetPubkey
        );
        transaction.add(createATAIx);
      }

      const decimals = 6;
      const transferAmount = Math.floor(amount * Math.pow(10, decimals));

      const transferIx = createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        this.config.wallet.publicKey,
        transferAmount
      );

      transaction.add(transferIx);

      signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.config.wallet],
        { commitment: 'confirmed' }
      );
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

  private generateNonce(): string {
    const crypto = globalThis.crypto || require('crypto').webcrypto;
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Buffer.from(array).toString('hex');
  }

  getConnection(): Connection {
    return this.connection;
  }

  getWallet(): Keypair {
    return this.config.wallet;
  }
}
