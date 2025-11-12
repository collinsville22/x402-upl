import { Connection, PublicKey, Transaction, VersionedTransactionResponse } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import type { PaymentPayload, PaymentVerificationResult, PaymentReceipt, X402Config } from '../types.js';
import { SignatureStore, RedisSignatureStore, InMemorySignatureStore } from '../storage/signature-store.js';

export class PaymentVerifier {
  private connection: Connection;
  private config: X402Config;
  private signatureStore: SignatureStore;

  constructor(config: X402Config, signatureStore?: SignatureStore) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl, 'confirmed');

    if (signatureStore) {
      this.signatureStore = signatureStore;
    } else if (config.redisUrl) {
      this.signatureStore = new RedisSignatureStore(config.redisUrl);
    } else {
      this.signatureStore = new InMemorySignatureStore();
      if (config.network === 'mainnet-beta') {
        throw new Error('Redis configuration required for mainnet-beta. Configure redisUrl in X402Config.');
      }
    }
  }

  async verifyPayment(
    payload: PaymentPayload,
    requiredAmount: number,
    requiredRecipient: PublicKey
  ): Promise<PaymentVerificationResult> {
    try {
      if (!this.validatePayloadStructure(payload)) {
        return {
          valid: false,
          reason: 'Invalid payload structure',
        };
      }

      if (await this.signatureStore.has(payload.signature)) {
        return {
          valid: false,
          reason: 'Payment already processed',
        };
      }

      const signatureBuffer = bs58.decode(payload.signature);

      const transaction = await this.fetchTransaction(payload.signature);
      if (!transaction) {
        return {
          valid: false,
          reason: 'Transaction not found on blockchain',
        };
      }

      if (transaction.meta?.err) {
        return {
          valid: false,
          reason: 'Transaction failed on blockchain',
        };
      }

      const validationResult = this.validateTransaction(
        transaction,
        payload,
        requiredAmount,
        requiredRecipient
      );

      if (!validationResult.valid) {
        return validationResult;
      }

      await this.signatureStore.add(payload.signature, this.config.timeout / 1000);

      const receipt = this.generateReceipt(transaction, payload);

      return {
        valid: true,
        transactionId: payload.signature,
        receipt,
      };
    } catch (error) {
      return {
        valid: false,
        reason: error instanceof Error ? error.message : 'Unknown verification error',
      };
    }
  }

  private validatePayloadStructure(payload: PaymentPayload): boolean {
    if (!payload.network || !payload.asset || !payload.from || !payload.to) {
      return false;
    }

    if (!payload.amount || !payload.signature || !payload.timestamp) {
      return false;
    }

    const validAssets = ['SOL', 'USDC', 'CASH'];
    if (!validAssets.includes(payload.asset)) {
      return false;
    }

    try {
      new PublicKey(payload.from);
      new PublicKey(payload.to);
    } catch {
      return false;
    }

    const age = Date.now() - payload.timestamp;
    if (age > this.config.timeout * 1000 || age < 0) {
      return false;
    }

    return true;
  }

  private async fetchTransaction(signature: string): Promise<VersionedTransactionResponse | null> {
    try {
      const tx = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
      return tx;
    } catch {
      return null;
    }
  }

  private validateTransaction(
    transaction: VersionedTransactionResponse,
    payload: PaymentPayload,
    requiredAmount: number,
    requiredRecipient: PublicKey
  ): PaymentVerificationResult {
    const fromPubkey = new PublicKey(payload.from);
    const toPubkey = new PublicKey(payload.to);

    if (!transaction.transaction.message.staticAccountKeys.some(
      key => key.equals(fromPubkey)
    )) {
      return {
        valid: false,
        reason: 'Sender does not match transaction',
      };
    }

    if (!toPubkey.equals(requiredRecipient)) {
      return {
        valid: false,
        reason: 'Recipient does not match required recipient',
      };
    }

    let transferredAmount = 0;

    if (payload.asset === 'SOL') {
      const preBalances = transaction.meta?.preBalances || [];
      const postBalances = transaction.meta?.postBalances || [];

      const fromIndex = transaction.transaction.message.staticAccountKeys.findIndex(
        key => key.equals(fromPubkey)
      );
      const toIndex = transaction.transaction.message.staticAccountKeys.findIndex(
        key => key.equals(toPubkey)
      );

      if (fromIndex !== -1 && toIndex !== -1) {
        const fromPreBalance = preBalances[fromIndex] || 0;
        const fromPostBalance = postBalances[fromIndex] || 0;
        const toPreBalance = preBalances[toIndex] || 0;
        const toPostBalance = postBalances[toIndex] || 0;

        const fromDiff = fromPreBalance - fromPostBalance;
        const toDiff = toPostBalance - toPreBalance;

        transferredAmount = toDiff / 1e9;
      }
    } else {
      const tokenMintMap: Record<string, string> = {
        USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        CASH: 'CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT',
      };

      const tokenMintAddress = tokenMintMap[payload.asset];
      if (!tokenMintAddress) {
        return {
          valid: false,
          reason: `Unknown asset: ${payload.asset}`,
        };
      }

      const preBalances = transaction.meta?.preTokenBalances || [];
      const postBalances = transaction.meta?.postTokenBalances || [];

      for (let i = 0; i < preBalances.length; i++) {
        const pre = preBalances[i];
        const post = postBalances.find(p => p.accountIndex === pre.accountIndex);

        if (post && pre.mint === tokenMintAddress) {
          const preAmount = parseFloat(pre.uiTokenAmount.uiAmountString || '0');
          const postAmount = parseFloat(post.uiTokenAmount.uiAmountString || '0');

          if (preAmount > postAmount) {
            const accountKey = transaction.transaction.message.staticAccountKeys[pre.accountIndex];
            if (accountKey.equals(fromPubkey)) {
              transferredAmount += preAmount - postAmount;
            }
          }
        }
      }
    }

    const expectedAmount = parseFloat(payload.amount);

    if (transferredAmount < expectedAmount * 0.99) {
      return {
        valid: false,
        reason: `Insufficient payment: expected ${expectedAmount}, received ${transferredAmount}`,
      };
    }

    return { valid: true };
  }

  private generateReceipt(
    transaction: VersionedTransactionResponse,
    payload: PaymentPayload
  ): PaymentReceipt {
    return {
      transactionId: payload.signature,
      from: payload.from,
      to: payload.to,
      amount: payload.amount,
      asset: payload.asset,
      timestamp: payload.timestamp,
      blockHash: transaction.transaction.message.recentBlockhash || '',
      slot: transaction.slot,
      signature: payload.signature,
      verifiable: true,
    };
  }

  async clearProcessedSignatures(): Promise<void> {
    await this.signatureStore.clear();
  }

  async disconnect(): Promise<void> {
    if ('disconnect' in this.signatureStore && typeof this.signatureStore.disconnect === 'function') {
      await this.signatureStore.disconnect();
    }
  }
}
