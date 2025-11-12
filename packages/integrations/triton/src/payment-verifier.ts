import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { PaymentProof, PaymentRequirement } from './types.js';
import { SignatureStore, RedisSignatureStore, InMemorySignatureStore } from '@x402-upl/core';

const CASH_MINT = new PublicKey('CASHVDm2wsJXfhj6VWxb7GiMdoLc17Du7paH4bNr5woT');

export class PaymentVerifier {
  private connection: Connection;
  private paymentRecipient: PublicKey;
  private signatureStore: SignatureStore;

  constructor(
    solanaRpcUrl: string,
    paymentRecipient: string,
    redisUrl?: string,
    signatureStore?: SignatureStore
  ) {
    this.connection = new Connection(solanaRpcUrl, 'confirmed');
    this.paymentRecipient = new PublicKey(paymentRecipient);

    if (signatureStore) {
      this.signatureStore = signatureStore;
    } else if (redisUrl) {
      this.signatureStore = new RedisSignatureStore(redisUrl, 'triton:payments:');
    } else {
      this.signatureStore = new InMemorySignatureStore();
    }
  }

  async verifyPayment(
    proof: PaymentProof,
    requirement: PaymentRequirement
  ): Promise<boolean> {
    if (await this.signatureStore.has(proof.signature)) {
      return false;
    }

    if (proof.requestId !== requirement.requestId) {
      return false;
    }

    if (proof.amount < requirement.amount) {
      return false;
    }

    if (Date.now() > requirement.expiresAt) {
      return false;
    }

    try {
      const transaction = await this.connection.getParsedTransaction(
        proof.signature,
        {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed',
        }
      );

      if (!transaction) {
        return false;
      }

      const isValid = this.validateTransaction(
        transaction,
        proof,
        requirement
      );

      if (isValid) {
        await this.signatureStore.add(proof.signature, 86400);
      }

      return isValid;
    } catch (error) {
      return false;
    }
  }

  private validateTransaction(
    transaction: ParsedTransactionWithMeta,
    proof: PaymentProof,
    requirement: PaymentRequirement
  ): boolean {
    if (!transaction.meta || transaction.meta.err) {
      return false;
    }

    const instructions = transaction.transaction.message.instructions;

    for (const instruction of instructions) {
      if ('parsed' in instruction && instruction.program === 'spl-token') {
        const parsed = instruction.parsed;

        if (parsed.type === 'transferChecked' || parsed.type === 'transfer') {
          const info = parsed.info;

          const destinationMatches = info.destination === this.paymentRecipient.toBase58() ||
                                   info.destination === requirement.recipient;

          if (!destinationMatches) {
            continue;
          }

          let amount: number;
          if ('tokenAmount' in info) {
            amount = parseFloat(info.tokenAmount.uiAmountString);
          } else {
            amount = parseFloat(info.amount) / 1_000_000_000;
          }

          if (amount >= requirement.amount) {
            if (requirement.mint) {
              const mintMatches = info.mint === requirement.mint;
              if (!mintMatches) {
                continue;
              }
            }

            return true;
          }
        }
      }
    }

    return false;
  }

  async getTokenBalance(wallet: string, mint: string = CASH_MINT.toBase58()): Promise<number> {
    try {
      const walletPubkey = new PublicKey(wallet);
      const mintPubkey = new PublicKey(mint);

      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        walletPubkey,
        { mint: mintPubkey }
      );

      if (tokenAccounts.value.length === 0) {
        return 0;
      }

      const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
      return balance || 0;
    } catch (error) {
      return 0;
    }
  }

  isPaymentVerified(signature: string): boolean {
    return this.verifiedPayments.has(signature);
  }

  clearVerifiedPayment(signature: string): void {
    this.verifiedPayments.delete(signature);
  }

  getVerifiedPaymentCount(): number {
    return this.verifiedPayments.size;
  }
}
