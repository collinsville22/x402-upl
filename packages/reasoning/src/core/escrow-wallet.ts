import { Connection, PublicKey, Transaction, Keypair, SystemProgram } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import Redis from 'ioredis';

export interface EscrowConfig {
  connection: Connection;
  escrowKeypair: Keypair;
  redis: Redis;
}

export interface UserEscrow {
  userId: string;
  userWallet: string;
  balance: number;
  spent: number;
  createdAt: number;
  lastTopUpAt: number;
}

export class EscrowWalletManager {
  private connection: Connection;
  private escrowKeypair: Keypair;
  private redis: Redis;

  constructor(config: EscrowConfig) {
    this.connection = config.connection;
    this.escrowKeypair = config.escrowKeypair;
    this.redis = config.redis;
  }

  async createUserEscrow(userId: string, userWallet: string): Promise<UserEscrow> {
    const escrow: UserEscrow = {
      userId,
      userWallet,
      balance: 0,
      spent: 0,
      createdAt: Date.now(),
      lastTopUpAt: Date.now(),
    };

    await this.redis.set(`escrow:${userId}`, JSON.stringify(escrow));

    return escrow;
  }

  async depositFunds(
    userId: string,
    amount: number,
    signature: string
  ): Promise<UserEscrow> {
    const escrowData = await this.redis.get(`escrow:${userId}`);

    if (!escrowData) {
      throw new Error('Escrow account not found');
    }

    const escrow: UserEscrow = JSON.parse(escrowData);

    const txInfo = await this.connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!txInfo) {
      throw new Error('Transaction not found');
    }

    const recipientPubkey = this.escrowKeypair.publicKey.toBase58();
    const accountKeys = txInfo.transaction.message.getAccountKeys();

    let verified = false;
    const postBalances = txInfo.meta?.postBalances || [];
    const preBalances = txInfo.meta?.preBalances || [];

    for (let i = 0; i < accountKeys.length; i++) {
      if (accountKeys.get(i)?.toBase58() === recipientPubkey) {
        const received = (postBalances[i] - preBalances[i]) / 1_000_000_000;
        if (Math.abs(received - amount) < 0.000001) {
          verified = true;
          break;
        }
      }
    }

    if (!verified) {
      throw new Error('Payment verification failed');
    }

    escrow.balance += amount;
    escrow.lastTopUpAt = Date.now();

    await this.redis.set(`escrow:${userId}`, JSON.stringify(escrow));

    return escrow;
  }

  async getBalance(userId: string): Promise<number> {
    const escrowData = await this.redis.get(`escrow:${userId}`);

    if (!escrowData) {
      return 0;
    }

    const escrow: UserEscrow = JSON.parse(escrowData);
    return escrow.balance;
  }

  async deductFunds(userId: string, amount: number): Promise<boolean> {
    const escrowData = await this.redis.get(`escrow:${userId}`);

    if (!escrowData) {
      throw new Error('Escrow account not found');
    }

    const escrow: UserEscrow = JSON.parse(escrowData);

    if (escrow.balance < amount) {
      throw new Error(`Insufficient balance. Available: ${escrow.balance}, Required: ${amount}`);
    }

    escrow.balance -= amount;
    escrow.spent += amount;

    await this.redis.set(`escrow:${userId}`, JSON.stringify(escrow));

    return true;
  }

  async executePayment(
    userId: string,
    recipient: PublicKey,
    amount: number,
    mint?: PublicKey
  ): Promise<string> {
    await this.deductFunds(userId, amount);

    try {
      let signature: string;

      if (!mint) {
        signature = await this.sendSOLPayment(recipient, amount);
      } else {
        signature = await this.sendTokenPayment(recipient, mint, amount);
      }

      await this.redis.lpush(
        `escrow:${userId}:payments`,
        JSON.stringify({
          signature,
          amount,
          recipient: recipient.toBase58(),
          asset: mint ? mint.toBase58() : 'SOL',
          timestamp: Date.now(),
        })
      );

      return signature;
    } catch (error) {
      await this.refundFunds(userId, amount);
      throw error;
    }
  }

  private async sendSOLPayment(recipient: PublicKey, amount: number): Promise<string> {
    const lamports = Math.floor(amount * 1_000_000_000);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.escrowKeypair.publicKey,
        toPubkey: recipient,
        lamports,
      })
    );

    const signature = await this.connection.sendTransaction(transaction, [this.escrowKeypair]);
    await this.connection.confirmTransaction(signature, 'confirmed');

    return signature;
  }

  private async sendTokenPayment(
    recipient: PublicKey,
    mint: PublicKey,
    amount: number
  ): Promise<string> {
    const fromTokenAccount = await getAssociatedTokenAddress(
      mint,
      this.escrowKeypair.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    const toTokenAccount = await getAssociatedTokenAddress(
      mint,
      recipient,
      false,
      TOKEN_PROGRAM_ID
    );

    const mintInfo = await this.connection.getParsedAccountInfo(mint);
    const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals || 6;

    const adjustedAmount = Math.floor(amount * Math.pow(10, decimals));

    const transaction = new Transaction().add(
      createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        this.escrowKeypair.publicKey,
        adjustedAmount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    const signature = await this.connection.sendTransaction(transaction, [this.escrowKeypair]);
    await this.connection.confirmTransaction(signature, 'confirmed');

    return signature;
  }

  private async refundFunds(userId: string, amount: number): Promise<void> {
    const escrowData = await this.redis.get(`escrow:${userId}`);

    if (!escrowData) {
      return;
    }

    const escrow: UserEscrow = JSON.parse(escrowData);
    escrow.balance += amount;
    escrow.spent -= amount;

    await this.redis.set(`escrow:${userId}`, JSON.stringify(escrow));
  }

  async withdrawFunds(
    userId: string,
    amount: number,
    destination: PublicKey
  ): Promise<string> {
    const escrowData = await this.redis.get(`escrow:${userId}`);

    if (!escrowData) {
      throw new Error('Escrow account not found');
    }

    const escrow: UserEscrow = JSON.parse(escrowData);

    if (escrow.balance < amount) {
      throw new Error(`Insufficient balance. Available: ${escrow.balance}, Requested: ${amount}`);
    }

    const signature = await this.sendSOLPayment(destination, amount);

    escrow.balance -= amount;
    await this.redis.set(`escrow:${userId}`, JSON.stringify(escrow));

    return signature;
  }

  async getUserHistory(userId: string, limit: number = 50): Promise<any[]> {
    const payments = await this.redis.lrange(`escrow:${userId}:payments`, 0, limit - 1);
    return payments.map((p) => JSON.parse(p));
  }

  getEscrowPublicKey(): PublicKey {
    return this.escrowKeypair.publicKey;
  }
}
