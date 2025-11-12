import { CronJob } from 'cron';
import { Connection, PublicKey, Transaction, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createTransferInstruction,
  getMint
} from '@solana/spl-token';
import { prisma } from '../db/client.js';
import { webhookService } from '../webhooks/delivery.js';

interface ScheduleConfig {
  serviceId: string;
  merchantWallet: string;
  schedule: string;
  minimumAmount: number;
  enabled: boolean;
}

interface SettlementResult {
  settlementId: string;
  amount: number;
  signature: string;
  transactionCount: number;
  fee: number;
}

export class SettlementScheduler {
  private jobs: Map<string, CronJob> = new Map();
  private connection: Connection;
  private treasuryKeypair: Keypair;
  private tokenMint: PublicKey;
  private platformFeeRate: number;
  private logger: any;

  constructor(logger?: any) {
    this.connection = new Connection(
      process.env.RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    this.treasuryKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(process.env.TREASURY_PRIVATE_KEY || '[]'))
    );

    this.tokenMint = new PublicKey(
      process.env.TOKEN_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
    );

    this.platformFeeRate = parseFloat(process.env.PLATFORM_FEE_RATE || '0.02');
    this.logger = logger || console;
  }

  async initialize(): Promise<void> {
    const schedules = await prisma.settlementSchedule.findMany({
      where: { enabled: true }
    });

    for (const schedule of schedules) {
      this.scheduleSettlement({
        serviceId: schedule.serviceId,
        merchantWallet: schedule.merchantWallet,
        schedule: schedule.cronExpression,
        minimumAmount: parseFloat(schedule.minimumAmount),
        enabled: schedule.enabled
      });
    }
  }

  scheduleSettlement(config: ScheduleConfig): void {
    if (!config.enabled) {
      return;
    }

    const jobKey = `${config.serviceId}-${config.merchantWallet}`;

    if (this.jobs.has(jobKey)) {
      this.jobs.get(jobKey)?.stop();
    }

    const job = new CronJob(
      config.schedule,
      async () => {
        try {
          await this.processScheduledSettlement(config);
        } catch (error) {
          this.logger.error({
            err: error,
            serviceId: config.serviceId,
            merchantWallet: config.merchantWallet
          }, 'Scheduled settlement failed');
        }
      },
      null,
      true
    );

    this.jobs.set(jobKey, job);
  }

  private async processScheduledSettlement(config: ScheduleConfig): Promise<void> {
    const transactions = await prisma.transaction.findMany({
      where: {
        serviceId: config.serviceId,
        recipientAddress: config.merchantWallet,
        status: 'confirmed',
        settledAt: null
      }
    });

    if (transactions.length === 0) {
      return;
    }

    const totalAmount = transactions.reduce(
      (sum, tx) => sum + parseFloat(tx.amount),
      0
    );

    if (totalAmount < config.minimumAmount) {
      return;
    }

    try {
      const result = await this.executeSettlement(
        config.merchantWallet,
        config.serviceId,
        transactions.map(tx => tx.id)
      );

      await this.notifyMerchant(config.merchantWallet, result);
    } catch (error) {
      throw error;
    }
  }

  async executeSettlement(
    merchantWallet: string,
    serviceId: string,
    transactionIds: string[]
  ): Promise<SettlementResult> {
    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: transactionIds },
        status: 'confirmed',
        settledAt: null
      }
    });

    if (transactions.length === 0) {
      throw new Error('No unsettled transactions found');
    }

    const totalAmount = transactions.reduce(
      (sum, tx) => sum + parseFloat(tx.amount),
      0
    );

    const platformFee = totalAmount * this.platformFeeRate;
    const merchantAmount = totalAmount - platformFee;

    const settlement = await prisma.settlement.create({
      data: {
        merchantWallet,
        serviceId,
        totalAmount: totalAmount.toString(),
        platformFee: platformFee.toString(),
        merchantAmount: merchantAmount.toString(),
        transactionCount: transactions.length,
        status: 'pending',
        settlementType: 'automatic',
        requestedAt: new Date()
      }
    });

    try {
      const signature = await this.transferTokens(merchantWallet, merchantAmount);

      await prisma.$transaction(async (tx) => {
        await tx.settlement.update({
          where: { id: settlement.id },
          data: {
            status: 'completed',
            transactionSignature: signature,
            completedAt: new Date()
          }
        });

        await tx.transaction.updateMany({
          where: {
            id: { in: transactionIds }
          },
          data: {
            settledAt: new Date(),
            settlementId: settlement.id,
            settlementSignature: signature
          }
        });
      });

      return {
        settlementId: settlement.id,
        amount: merchantAmount,
        signature,
        transactionCount: transactions.length,
        fee: platformFee
      };
    } catch (error) {
      await prisma.settlement.update({
        where: { id: settlement.id },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date()
        }
      });

      throw error;
    }
  }

  private async transferTokens(merchantWallet: string, amount: number): Promise<string> {
    const merchantPubkey = new PublicKey(merchantWallet);

    const treasuryTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      this.treasuryKeypair.publicKey
    );

    const merchantTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      merchantPubkey
    );

    const mintInfo = await getMint(this.connection, this.tokenMint);
    const decimals = mintInfo.decimals;
    const amountInTokens = Math.floor(amount * Math.pow(10, decimals));

    const transaction = new Transaction().add(
      createTransferInstruction(
        treasuryTokenAccount,
        merchantTokenAccount,
        this.treasuryKeypair.publicKey,
        amountInTokens,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    transaction.feePayer = this.treasuryKeypair.publicKey;
    transaction.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;

    transaction.sign(this.treasuryKeypair);

    const signature = await this.connection.sendRawTransaction(
      transaction.serialize()
    );

    await this.connection.confirmTransaction(signature, 'confirmed');

    return signature;
  }

  private async notifyMerchant(
    merchantWallet: string,
    result: SettlementResult
  ): Promise<void> {
    const service = await prisma.service.findFirst({
      where: { merchantWallet },
      select: { webhookUrl: true, webhookSecret: true }
    });

    if (!service?.webhookUrl) {
      return;
    }

    await webhookService.enqueueWebhook(
      service.webhookUrl,
      'settlement.completed',
      {
        settlementId: result.settlementId,
        amount: result.amount,
        fee: result.fee,
        transactionCount: result.transactionCount,
        signature: result.signature,
        timestamp: new Date().toISOString()
      }
    );
  }

  removeSchedule(serviceId: string, merchantWallet: string): void {
    const jobKey = `${serviceId}-${merchantWallet}`;
    const job = this.jobs.get(jobKey);

    if (job) {
      job.stop();
      this.jobs.delete(jobKey);
    }
  }

  stopAll(): void {
    for (const [key, job] of this.jobs.entries()) {
      job.stop();
      this.jobs.delete(key);
    }
  }
}

export const settlementScheduler = new SettlementScheduler();
