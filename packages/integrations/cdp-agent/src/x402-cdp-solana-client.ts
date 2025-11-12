import axios, { AxiosInstance, AxiosError } from 'axios';
import { CdpClient } from '@coinbase/cdp-sdk';
import { Connection, Transaction, SystemProgram, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token';

export interface X402CDPSolanaConfig {
  network: 'solana-mainnet' | 'solana-devnet' | 'solana-testnet';
  facilitatorUrl?: string;
  registryUrl?: string;
  rpcUrl?: string;
}

export interface PaymentRequirements {
  scheme: 'exact' | 'estimate';
  network: string;
  asset: string;
  payTo: string;
  amount: string;
  memo?: string;
  timeout: number;
  nonce?: string;
}

export interface ServiceDiscoveryFilters {
  category?: string;
  maxPrice?: number;
  minReputation?: number;
  limit?: number;
}

export interface X402Service {
  id: string;
  name: string;
  description: string;
  resource: string;
  method?: string;
  pricing?: {
    amount: string;
    asset: string;
    network: string;
  };
}

export class X402CDPSolanaClient {
  private cdp: CdpClient;
  private httpClient: AxiosInstance;
  private connection: Connection;
  private network: 'solana-mainnet' | 'solana-devnet' | 'solana-testnet';
  private accountAddress?: string;
  private config: X402CDPSolanaConfig;
  private paymentHistory: Array<{
    timestamp: number;
    service: string;
    amount: string;
    asset: string;
    signature: string;
    status: 'success' | 'failed';
  }>;

  constructor(config: X402CDPSolanaConfig) {
    this.cdp = new CdpClient();
    this.network = config.network;
    this.config = config;
    this.paymentHistory = [];

    const rpcUrl = config.rpcUrl || this.getDefaultRpcUrl();
    this.connection = new Connection(rpcUrl, 'confirmed');

    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'x402-cdp-solana-client/1.0.0',
      },
    });

    this.setupPaymentInterceptor();
  }

  private getDefaultRpcUrl(): string {
    switch (this.network) {
      case 'solana-mainnet':
        return 'https://api.mainnet-beta.solana.com';
      case 'solana-testnet':
        return 'https://api.testnet.solana.com';
      case 'solana-devnet':
      default:
        return 'https://api.devnet.solana.com';
    }
  }

  async createAccount(name?: string): Promise<string> {
    const account = await this.cdp.solana.createAccount({
      name: name || `x402-account-${Date.now()}`,
    });
    this.accountAddress = account.address;
    return account.address;
  }

  getAccountAddress(): string | undefined {
    return this.accountAddress;
  }

  setAccountAddress(address: string): void {
    this.accountAddress = address;
  }

  async requestFaucet(token: 'sol' | 'usdc' = 'sol'): Promise<string> {
    if (this.network !== 'solana-devnet') {
      throw new Error('Faucet only available on devnet');
    }
    if (!this.accountAddress) {
      throw new Error('Account not created. Call createAccount() first');
    }

    const result = await this.cdp.solana.requestFaucet({
      address: this.accountAddress,
      token,
    });

    return result.signature;
  }

  async getBalance(): Promise<number> {
    if (!this.accountAddress) {
      throw new Error('Account not created');
    }
    const balance = await this.connection.getBalance(new PublicKey(this.accountAddress));
    return balance / 1_000_000_000;
  }

  private setupPaymentInterceptor(): void {
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 402) {
          const requirements: PaymentRequirements = error.response.data as PaymentRequirements;

          const paymentHeader = await this.createPayment(requirements);

          const originalRequest = error.config;
          if (!originalRequest) {
            throw error;
          }

          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers['X-Payment'] = paymentHeader;

          return this.httpClient.request(originalRequest);
        }

        throw error;
      }
    );
  }

  private async createPayment(requirements: PaymentRequirements): Promise<string> {
    if (!this.accountAddress) {
      throw new Error('Account not created');
    }

    const fromPubkey = new PublicKey(this.accountAddress);
    const toPubkey = new PublicKey(requirements.payTo);
    const amount = parseFloat(requirements.amount);

    let transaction: Transaction;
    let signature: string;

    if (requirements.asset === 'SOL' || requirements.asset === SystemProgram.programId.toBase58()) {
      const lamports = Math.floor(amount * 1_000_000_000);

      transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      const serializedTx = transaction.serialize({ requireAllSignatures: false }).toString('base64');

      const result = await this.cdp.solana.sendTransaction({
        network: this.network,
        transaction: serializedTx,
      });

      signature = result.signature;
    } else {
      const assetPubkey = new PublicKey(requirements.asset);

      transaction = new Transaction();

      const fromTokenAccount = await getAssociatedTokenAddress(assetPubkey, fromPubkey);
      const toTokenAccount = await getAssociatedTokenAddress(assetPubkey, toPubkey);

      try {
        await getAccount(this.connection, toTokenAccount);
      } catch {
        const createATAIx = createAssociatedTokenAccountInstruction(
          fromPubkey,
          toTokenAccount,
          toPubkey,
          assetPubkey
        );
        transaction.add(createATAIx);
      }

      const decimals = 6;
      const transferAmount = Math.floor(amount * Math.pow(10, decimals));

      const transferIx = createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        fromPubkey,
        transferAmount
      );
      transaction.add(transferIx);

      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      const serializedTx = transaction.serialize({ requireAllSignatures: false }).toString('base64');

      const result = await this.cdp.solana.sendTransaction({
        network: this.network,
        transaction: serializedTx,
      });

      signature = result.signature;
    }

    this.paymentHistory.push({
      timestamp: Date.now(),
      service: requirements.payTo,
      amount: requirements.amount,
      asset: requirements.asset,
      signature,
      status: 'success',
    });

    const payload = {
      network: requirements.network,
      asset: requirements.asset,
      from: this.accountAddress,
      to: requirements.payTo,
      amount: requirements.amount,
      signature,
      timestamp: Date.now(),
      nonce: requirements.nonce || this.generateNonce(),
      memo: requirements.memo,
    };

    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  async get<T = any>(url: string, params?: Record<string, any>): Promise<T> {
    const response = await this.httpClient.get(url, { params });
    return response.data;
  }

  async post<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.httpClient.post(url, data);
    return response.data;
  }

  async put<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.httpClient.put(url, data);
    return response.data;
  }

  async delete<T = any>(url: string): Promise<T> {
    const response = await this.httpClient.delete(url);
    return response.data;
  }

  async discoverServices(filters?: ServiceDiscoveryFilters): Promise<X402Service[]> {
    const registryUrl = this.config.registryUrl || 'http://localhost:3001/services/discover';
    const response = await axios.get(registryUrl, { params: filters });
    return response.data;
  }

  getPaymentHistory(): Array<{ timestamp: number; service: string; amount: string; asset: string; signature: string; status: string }> {
    return [...this.paymentHistory];
  }

  getTotalSpent(): { [asset: string]: number } {
    const totals: { [asset: string]: number } = {};

    for (const payment of this.paymentHistory) {
      if (payment.status === 'success') {
        const amount = parseFloat(payment.amount);
        totals[payment.asset] = (totals[payment.asset] || 0) + amount;
      }
    }

    return totals;
  }

  getNetwork(): string {
    return this.network;
  }

  private generateNonce(): string {
    const crypto = globalThis.crypto || require('crypto').webcrypto;
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Buffer.from(array).toString('hex');
  }

  async close(): Promise<void> {
    this.paymentHistory = [];
  }
}
