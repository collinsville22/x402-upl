import { PublicKey } from '@solana/web3.js';

export interface PaymentRequirements {
  scheme: 'exact' | 'estimate';
  network: 'solana-mainnet' | 'solana-devnet' | 'solana-testnet';
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

export interface PaymentReceipt {
  transactionId: string;
  from: string;
  to: string;
  amount: string;
  asset: string;
  timestamp: number;
  blockHash: string;
  slot: number;
  signature: string;
  verifiable: boolean;
}

export interface PaymentVerificationResult {
  valid: boolean;
  reason?: string;
  transactionId?: string;
  receipt?: PaymentReceipt;
}

export interface X402Config {
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  rpcUrl: string;
  treasuryWallet: PublicKey;
  facilitatorPrivateKey?: Uint8Array;
  acceptedTokens: PublicKey[];
  timeout: number;
  redisUrl?: string;
}

export interface ServicePricing {
  pricePerCall: number;
  currency: 'USDC' | 'CASH' | 'SOL';
  minPrice?: number;
  maxPrice?: number;
}

export interface TransactionRecord {
  id: string;
  agentWallet: string;
  serviceId: string;
  amount: number;
  token: string;
  signature: string;
  status: 'pending' | 'confirming' | 'confirmed' | 'failed';
  createdAt: Date;
  confirmedAt?: Date;
}
