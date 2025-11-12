import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getMint,
} from '@solana/spl-token';
import axios, { AxiosInstance } from 'axios';

export const CASH_MINT = new PublicKey('CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH');

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

export interface PaymentPayload {
  network: string;
  asset: string;
  from: string;
  to: string;
  amount: string;
  signature: string;
  timestamp: number;
  nonce: string;
  memo?: string;
}

export interface PaymentMetrics {
  totalSpent: number;
  totalEarned: number;
  netProfit: number;
  transactionCount: number;
  averageCostPerInference: number;
}

export interface PaymentRecord {
  signature: string;
  timestamp: number;
  amount: number;
  asset: string;
  type: 'sent' | 'received';
  from: string;
  to: string;
}

export class SolanaX402Client {
  private connection: Connection;
  private config: SolanaX402Config;
  private httpClient: AxiosInstance;
  private metrics: PaymentMetrics = {
    totalSpent: 0,
    totalEarned: 0,
    netProfit: 0,
    transactionCount: 0,
    averageCostPerInference: 0,
  };
  private paymentHistory: PaymentRecord[] = [];
  private hourlySpending: Map<number, number> = new Map();
  private spendingLimitPerHour: number;

  constructor(config: SolanaX402Config & { spendingLimitPerHour?: number }) {
    this.config = config;

    const rpcUrl = config.rpcUrl ||
      (config.network === 'mainnet-beta'
        ? 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com');

    this.connection = new Connection(rpcUrl, 'confirmed');
    this.httpClient = axios.create();
    this.spendingLimitPerHour = config.spendingLimitPerHour || Infinity;
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

    this.trackPayment(amount, 'sent', requirements.payTo);

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
      const isCash = assetPubkey.equals(CASH_MINT);
      const programId = isCash ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

      let decimals = 6;
      try {
        const mintInfo = await getMint(this.connection, assetPubkey, 'confirmed', programId);
        decimals = mintInfo.decimals;
      } catch {
        decimals = 6;
      }

      const fromTokenAccount = await getAssociatedTokenAddress(
        assetPubkey,
        this.config.wallet.publicKey,
        false,
        programId
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        assetPubkey,
        recipientPubkey,
        false,
        programId
      );

      const transaction = new Transaction();

      try {
        await getAccount(this.connection, toTokenAccount, 'confirmed', programId);
      } catch {
        const createATAIx = createAssociatedTokenAccountInstruction(
          this.config.wallet.publicKey,
          toTokenAccount,
          recipientPubkey,
          assetPubkey,
          programId
        );
        transaction.add(createATAIx);
      }

      const transferAmount = Math.floor(amount * Math.pow(10, decimals));

      const transferIx = createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        this.config.wallet.publicKey,
        transferAmount,
        [],
        programId
      );

      transaction.add(transferIx);

      signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.config.wallet],
        { commitment: 'confirmed' }
      );
    }

    const payload: PaymentPayload = {
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

  async getBalance(asset: string = 'SOL'): Promise<number> {
    if (asset === 'SOL') {
      const balance = await this.connection.getBalance(this.config.wallet.publicKey);
      return balance / 1_000_000_000;
    }

    const tokenMint = asset === 'CASH' ? CASH_MINT : new PublicKey(asset);
    const isCash = tokenMint.equals(CASH_MINT);
    const programId = isCash ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

    let decimals = 6;
    try {
      const mintInfo = await getMint(this.connection, tokenMint, 'confirmed', programId);
      decimals = mintInfo.decimals;
    } catch {
      decimals = 6;
    }

    const tokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      this.config.wallet.publicKey,
      false,
      programId
    );

    try {
      const account = await getAccount(this.connection, tokenAccount, 'confirmed', programId);
      return Number(account.amount) / Math.pow(10, decimals);
    } catch {
      return 0;
    }
  }

  getWalletAddress(): string {
    return this.config.wallet.publicKey.toBase58();
  }

  getMetrics(): PaymentMetrics {
    return { ...this.metrics };
  }

  getPaymentHistory(limit?: number): PaymentRecord[] {
    const history = [...this.paymentHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  async fetchPaymentHistory(limit: number = 100): Promise<PaymentRecord[]> {
    const signatures = await this.connection.getSignaturesForAddress(
      this.config.wallet.publicKey,
      { limit }
    );

    const records: PaymentRecord[] = [];

    for (const sig of signatures) {
      const tx = await this.connection.getParsedTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !tx.meta) continue;

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

  getSpentThisHour(): number {
    const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
    return this.hourlySpending.get(currentHour) || 0;
  }

  getRemainingHourlyBudget(): number {
    const spent = this.getSpentThisHour();
    return Math.max(0, this.spendingLimitPerHour - spent);
  }

  private trackPayment(amount: number, type: 'sent' | 'received', counterparty: string): void {
    const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));

    if (type === 'sent') {
      this.metrics.totalSpent += amount;
      this.hourlySpending.set(
        currentHour,
        (this.hourlySpending.get(currentHour) || 0) + amount
      );
    } else {
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

  private cleanupOldHourlyData(): void {
    const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
    const cutoffHour = currentHour - 24;

    for (const [hour] of this.hourlySpending) {
      if (hour < cutoffHour) {
        this.hourlySpending.delete(hour);
      }
    }
  }

  recordEarnings(amount: number, from: string): void {
    this.trackPayment(amount, 'received', from);
  }
}
