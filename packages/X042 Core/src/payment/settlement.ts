import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import type { X402Config, PaymentReceipt } from '../types.js';

export class SettlementCoordinator {
  private connection: Connection;
  private config: X402Config;
  private facilitatorKeypair?: Keypair;

  constructor(config: X402Config) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl, 'confirmed');

    if (config.facilitatorPrivateKey) {
      this.facilitatorKeypair = Keypair.fromSecretKey(config.facilitatorPrivateKey);
    }
  }

  async executeSettlement(
    fromPubkey: PublicKey,
    toPubkey: PublicKey,
    amount: number,
    tokenMint: PublicKey,
    fromKeypair: Keypair
  ): Promise<PaymentReceipt> {
    try {
      const fromTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        fromPubkey
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        toPubkey
      );

      const transaction = new Transaction();

      const transferInstruction = createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        fromPubkey,
        amount,
        [],
        TOKEN_PROGRAM_ID
      );

      transaction.add(transferInstruction);

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [fromKeypair],
        {
          commitment: 'confirmed',
        }
      );

      const confirmedTx = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!confirmedTx) {
        throw new Error('Transaction confirmation failed');
      }

      const receipt: PaymentReceipt = {
        transactionId: signature,
        from: fromPubkey.toBase58(),
        to: toPubkey.toBase58(),
        amount: amount.toString(),
        asset: tokenMint.toBase58(),
        timestamp: Date.now(),
        blockHash: confirmedTx.transaction.message.recentBlockhash || '',
        slot: confirmedTx.slot,
        signature,
        verifiable: true,
      };

      return receipt;
    } catch (error) {
      throw new Error(
        `Settlement failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async executeFacilitatedSettlement(
    fromPubkey: PublicKey,
    toPubkey: PublicKey,
    amount: number,
    tokenMint: PublicKey
  ): Promise<PaymentReceipt> {
    if (!this.facilitatorKeypair) {
      throw new Error('Facilitator private key not configured');
    }

    return this.executeSettlement(
      fromPubkey,
      toPubkey,
      amount,
      tokenMint,
      this.facilitatorKeypair
    );
  }

  async getTransactionStatus(signature: string): Promise<'confirmed' | 'failed' | 'pending'> {
    try {
      const status = await this.connection.getSignatureStatus(signature);

      if (!status || !status.value) {
        return 'pending';
      }

      if (status.value.err) {
        return 'failed';
      }

      if (status.value.confirmationStatus === 'confirmed' || status.value.confirmationStatus === 'finalized') {
        return 'confirmed';
      }

      return 'pending';
    } catch {
      return 'pending';
    }
  }

  async waitForConfirmation(
    signature: string,
    timeout: number = 60000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const status = await this.getTransactionStatus(signature);

      if (status === 'confirmed') {
        return true;
      }

      if (status === 'failed') {
        return false;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return false;
  }
}
