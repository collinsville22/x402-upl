import { Context, Next } from 'koa';
import { PublicKey } from '@solana/web3.js';
import { PaymentVerifier } from '../payment/verifier.js';
import { SignatureStore, RedisSignatureStore, InMemorySignatureStore } from '../storage/signature-store.js';
import type { X402Config, PaymentPayload, PaymentRequirements } from '../types.js';

export interface KoaX402Config extends Omit<X402Config, 'rpcUrl'> {
  rpcUrl?: string;
  onPaymentVerified?: (payment: PaymentPayload & { resource: string }, ctx: Context) => void | Promise<void>;
  onPaymentFailed?: (reason: string, ctx: Context) => void | Promise<void>;
}

export interface RouteX402Config {
  price: number;
  asset?: string;
  description?: string;
}

export function createX402KoaMiddleware(config: KoaX402Config) {
  const rpcUrl = config.rpcUrl ||
    (config.network === 'mainnet-beta'
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com');

  const fullConfig: X402Config = {
    ...config,
    rpcUrl,
    timeout: config.timeout || 120000,
  };

  let signatureStore: SignatureStore;
  if (config.redisUrl) {
    signatureStore = new RedisSignatureStore(config.redisUrl);
  } else {
    signatureStore = new InMemorySignatureStore();
    if (config.network === 'mainnet-beta') {
      throw new Error('Redis configuration required for mainnet-beta');
    }
  }

  const verifier = new PaymentVerifier(fullConfig, signatureStore);

  return async function middleware(ctx: Context, next: Next): Promise<void> {
    if (ctx.method === 'OPTIONS') {
      await next();
      return;
    }

    const paymentHeader = ctx.get('x-payment');

    if (!paymentHeader) {
      const requirements: PaymentRequirements = {
        scheme: 'exact',
        network: getNetworkString(config.network),
        asset: 'SOL',
        payTo: config.treasuryWallet.toBase58(),
        amount: '0.01',
        timeout: fullConfig.timeout,
        nonce: generateNonce(),
      };

      ctx.status = 402;
      ctx.set('Content-Type', 'application/json');
      ctx.set('X-Payment-Required', 'true');
      ctx.body = requirements;
      return;
    }

    try {
      const paymentPayload: PaymentPayload = JSON.parse(
        Buffer.from(paymentHeader, 'base64').toString('utf-8')
      );

      const result = await verifier.verifyPayment(
        paymentPayload,
        0.01,
        new PublicKey(config.treasuryWallet)
      );

      if (!result.valid) {
        if (config.onPaymentFailed) {
          await config.onPaymentFailed(result.reason || 'Payment verification failed', ctx);
        }

        ctx.status = 402;
        ctx.body = {
          error: result.reason || 'Payment verification failed',
        };
        return;
      }

      if (config.onPaymentVerified) {
        await config.onPaymentVerified(
          {
            ...paymentPayload,
            resource: ctx.path,
          },
          ctx
        );
      }

      ctx.set('X-Payment-Verified', 'true');
      ctx.set('X-Payment-Signature', paymentPayload.signature);

      ctx.state.x402 = {
        verified: true,
        signature: paymentPayload.signature,
        from: paymentPayload.from,
        to: paymentPayload.to,
        amount: paymentPayload.amount,
        asset: paymentPayload.asset,
      };

      await next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment processing error';

      if (config.onPaymentFailed) {
        await config.onPaymentFailed(errorMessage, ctx);
      }

      ctx.status = 500;
      ctx.body = {
        error: errorMessage,
      };
    }
  };
}

export function withX402(
  routeConfig: RouteX402Config,
  globalConfig: KoaX402Config
) {
  const rpcUrl = globalConfig.rpcUrl ||
    (globalConfig.network === 'mainnet-beta'
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com');

  const fullConfig: X402Config = {
    ...globalConfig,
    rpcUrl,
    timeout: globalConfig.timeout || 120000,
  };

  let signatureStore: SignatureStore;
  if (globalConfig.redisUrl) {
    signatureStore = new RedisSignatureStore(globalConfig.redisUrl);
  } else {
    signatureStore = new InMemorySignatureStore();
    if (globalConfig.network === 'mainnet-beta') {
      throw new Error('Redis configuration required for mainnet-beta');
    }
  }

  const verifier = new PaymentVerifier(fullConfig, signatureStore);

  return async function middleware(ctx: Context, next: Next): Promise<void> {
    if (ctx.method === 'OPTIONS') {
      await next();
      return;
    }

    const paymentHeader = ctx.get('x-payment');

    if (!paymentHeader) {
      const requirements: PaymentRequirements = {
        scheme: 'exact',
        network: getNetworkString(globalConfig.network),
        asset: routeConfig.asset || 'SOL',
        payTo: globalConfig.treasuryWallet.toBase58(),
        amount: routeConfig.price.toString(),
        timeout: fullConfig.timeout,
        nonce: generateNonce(),
      };

      ctx.status = 402;
      ctx.set('Content-Type', 'application/json');
      ctx.set('X-Payment-Required', 'true');
      ctx.body = requirements;
      return;
    }

    try {
      const paymentPayload: PaymentPayload = JSON.parse(
        Buffer.from(paymentHeader, 'base64').toString('utf-8')
      );

      const result = await verifier.verifyPayment(
        paymentPayload,
        routeConfig.price,
        new PublicKey(globalConfig.treasuryWallet)
      );

      if (!result.valid) {
        if (globalConfig.onPaymentFailed) {
          await globalConfig.onPaymentFailed(result.reason || 'Payment verification failed', ctx);
        }

        ctx.status = 402;
        ctx.body = {
          error: result.reason || 'Payment verification failed',
        };
        return;
      }

      if (globalConfig.onPaymentVerified) {
        await globalConfig.onPaymentVerified(
          {
            ...paymentPayload,
            resource: ctx.path,
          },
          ctx
        );
      }

      ctx.set('X-Payment-Verified', 'true');
      ctx.set('X-Payment-Signature', paymentPayload.signature);

      ctx.state.x402 = {
        verified: true,
        signature: paymentPayload.signature,
        from: paymentPayload.from,
        to: paymentPayload.to,
        amount: paymentPayload.amount,
        asset: paymentPayload.asset,
      };

      await next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment processing error';

      if (globalConfig.onPaymentFailed) {
        await globalConfig.onPaymentFailed(errorMessage, ctx);
      }

      ctx.status = 500;
      ctx.body = {
        error: errorMessage,
      };
    }
  };
}

function getNetworkString(network: string): 'solana-mainnet' | 'solana-devnet' | 'solana-testnet' {
  if (network === 'mainnet-beta') return 'solana-mainnet';
  if (network === 'testnet') return 'solana-testnet';
  return 'solana-devnet';
}

function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}
