import { Connection, PublicKey } from '@solana/web3.js';
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
      this.signatureStore = new RedisSignatureStore(redisUrl, 'switchboard:payments:');
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

      if (!transaction || !transaction.meta || transaction.meta.err) {
        return false;
      }

      const instructions = transaction.transaction.message.instructions;

      for (const instruction of instructions) {
        if ('parsed' in instruction && instruction.program === 'spl-token') {
          const parsed = instruction.parsed;

          if (parsed.type === 'transferChecked' || parsed.type === 'transfer') {
            const info = parsed.info;

            const destinationMatches =
              info.destination === this.paymentRecipient.toBase58() ||
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

              await this.signatureStore.add(proof.signature, 86400);
              return true;
            }
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Payment verification error:', error);
      return false;
    }
  }

  async isPaymentVerified(signature: string): Promise<boolean> {
    return await this.signatureStore.has(signature);
  }

  async disconnect(): Promise<void> {
    if ('disconnect' in this.signatureStore && typeof this.signatureStore.disconnect === 'function') {
      await this.signatureStore.disconnect();
    }
  }
}
