import { Injectable, Inject } from '@nestjs/common';
import { Connection, PublicKey } from '@solana/web3.js';
import { PaymentVerifier } from '../../payment/verifier.js';
import { SignatureStore, RedisSignatureStore, InMemorySignatureStore } from '../../storage/signature-store.js';
import { X402ModuleOptions } from './x402.types.js';
import { X402_MODULE_OPTIONS } from './x402.constants.js';
import type { X402Config, PaymentPayload } from '../../types.js';

@Injectable()
export class X402Service {
  private verifier: PaymentVerifier;
  private config: X402Config;

  constructor(@Inject(X402_MODULE_OPTIONS) private options: X402ModuleOptions) {
    const rpcUrl = options.rpcUrl ||
      (options.network === 'mainnet-beta'
        ? 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com');

    this.config = {
      network: options.network,
      rpcUrl,
      treasuryWallet: new PublicKey(options.treasuryWallet),
      acceptedTokens: [],
      timeout: options.timeout || 120000,
      redisUrl: options.redisUrl,
    };

    let signatureStore: SignatureStore;
    if (options.redisUrl) {
      signatureStore = new RedisSignatureStore(options.redisUrl);
    } else {
      signatureStore = new InMemorySignatureStore();
      if (options.network === 'mainnet-beta') {
        throw new Error('Redis configuration required for mainnet-beta');
      }
    }

    this.verifier = new PaymentVerifier(this.config, signatureStore);
  }

  async verifyPayment(
    payload: PaymentPayload,
    expectedAmount: number,
    recipient: PublicKey
  ): Promise<{ valid: boolean; reason?: string; transactionId?: string }> {
    return this.verifier.verifyPayment(payload, expectedAmount, recipient);
  }

  getConfig(): X402Config {
    return this.config;
  }

  getTreasuryWallet(): PublicKey {
    return this.config.treasuryWallet;
  }
}
