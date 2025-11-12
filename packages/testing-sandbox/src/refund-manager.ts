import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import Redis from 'ioredis';
import type { Logger } from 'pino';

export interface RefundRecord {
  transactionSignature: string;
  payerAddress: string;
  amount: number;
  asset: string;
  refundSignature?: string;
  refundedAt?: number;
  status: 'pending' | 'refunded' | 'failed';
  endpoint: string;
  requestTimestamp: number;
}

export interface RefundStats {
  totalRefunds: number;
  totalAmount: number;
  successfulRefunds: number;
  failedRefunds: number;
  averageRefundTimeMs: number;
}

export class RefundManager {
  private connection: Connection;
  private refundWallet: Keypair;
  private redis: Redis;
  private logger: Logger;

  constructor(
    connection: Connection,
    refundWallet: Keypair,
    redis: Redis,
    logger: Logger
  ) {
    this.connection = connection;
    this.refundWallet = refundWallet;
    this.redis = redis;
    this.logger = logger;
  }

  async recordPayment(
    signature: string,
    payerAddress: string,
    amount: number,
    asset: string,
    endpoint: string
  ): Promise<void> {
    const record: RefundRecord = {
      transactionSignature: signature,
      payerAddress,
      amount,
      asset,
      status: 'pending',
      endpoint,
      requestTimestamp: Date.now(),
    };

    await this.redis.setex(
      `refund:${signature}`,
      86400,
      JSON.stringify(record)
    );

    await this.redis.lpush('refund:queue', signature);

    this.logger.info({
      signature,
      payerAddress,
      amount,
      asset,
      endpoint,
    }, 'Payment recorded for refund');
  }

  async processRefund(signature: string): Promise<boolean> {
    const recordData = await this.redis.get(`refund:${signature}`);

    if (!recordData) {
      this.logger.warn({ signature }, 'Refund record not found');
      return false;
    }

    const record: RefundRecord = JSON.parse(recordData);

    if (record.status === 'refunded') {
      this.logger.debug({ signature }, 'Already refunded');
      return true;
    }

    try {
      const txInfo = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!txInfo || !txInfo.meta) {
        this.logger.warn({ signature }, 'Transaction not found on-chain');
        return false;
      }

      const payerPubkey = new PublicKey(record.payerAddress);

      let refundSignature: string;

      if (record.asset === 'SOL') {
        refundSignature = await this.refundSOL(payerPubkey, record.amount);
      } else {
        const mintPubkey = new PublicKey(record.asset);
        refundSignature = await this.refundToken(payerPubkey, mintPubkey, record.amount);
      }

      record.refundSignature = refundSignature;
      record.refundedAt = Date.now();
      record.status = 'refunded';

      await this.redis.setex(
        `refund:${signature}`,
        86400,
        JSON.stringify(record)
      );

      await this.redis.hincrby('refund:stats', 'successful', 1);
      await this.redis.hincrbyfloat('refund:stats', 'totalAmount', record.amount);

      this.logger.info({
        originalSignature: signature,
        refundSignature,
        amount: record.amount,
        payer: record.payerAddress,
        asset: record.asset,
      }, 'Refund processed successfully');

      return true;
    } catch (error) {
      record.status = 'failed';
      await this.redis.setex(
        `refund:${signature}`,
        86400,
        JSON.stringify(record)
      );

      await this.redis.hincrby('refund:stats', 'failed', 1);

      this.logger.error({
        signature,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Refund processing failed');

      return false;
    }
  }

  private async refundSOL(recipient: PublicKey, amount: number): Promise<string> {
    const lamports = Math.floor(amount * 1_000_000_000);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.refundWallet.publicKey,
        toPubkey: recipient,
        lamports,
      })
    );

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.refundWallet],
      { commitment: 'confirmed' }
    );

    return signature;
  }

  private async refundToken(
    recipient: PublicKey,
    mint: PublicKey,
    amount: number
  ): Promise<string> {
    const fromTokenAccount = await getAssociatedTokenAddress(
      mint,
      this.refundWallet.publicKey,
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
        this.refundWallet.publicKey,
        adjustedAmount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.refundWallet],
      { commitment: 'confirmed' }
    );

    return signature;
  }

  async getRefundStatus(signature: string): Promise<RefundRecord | null> {
    const recordData = await this.redis.get(`refund:${signature}`);

    if (!recordData) {
      return null;
    }

    return JSON.parse(recordData);
  }

  async getStats(): Promise<RefundStats> {
    const stats = await this.redis.hgetall('refund:stats');

    return {
      totalRefunds: parseInt(stats.successful || '0') + parseInt(stats.failed || '0'),
      totalAmount: parseFloat(stats.totalAmount || '0'),
      successfulRefunds: parseInt(stats.successful || '0'),
      failedRefunds: parseInt(stats.failed || '0'),
      averageRefundTimeMs: parseFloat(stats.avgRefundTime || '0'),
    };
  }

  async startRefundProcessor(): Promise<void> {
    this.logger.info('Starting refund processor');

    setInterval(async () => {
      try {
        const signature = await this.redis.rpop('refund:queue');

        if (signature) {
          await this.processRefund(signature);
        }
      } catch (error) {
        this.logger.error({
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Error in refund processor');
      }
    }, 5000);
  }

  async getWalletBalance(): Promise<{ sol: number; usdc: number }> {
    const solBalance = await this.connection.getBalance(this.refundWallet.publicKey);

    const usdcMint = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

    let usdcBalance = 0;
    try {
      const tokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        this.refundWallet.publicKey,
        false,
        TOKEN_PROGRAM_ID
      );

      const accountInfo = await this.connection.getParsedAccountInfo(tokenAccount);

      if (accountInfo.value) {
        const data = (accountInfo.value.data as any).parsed.info;
        usdcBalance = parseFloat(data.tokenAmount.uiAmount);
      }
    } catch (error) {
      usdcBalance = 0;
    }

    return {
      sol: solBalance / 1_000_000_000,
      usdc: usdcBalance,
    };
  }
}
