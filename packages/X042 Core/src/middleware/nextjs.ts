import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import type { X402Config, PaymentPayload, PaymentRequirements } from '../types.js';
import { PaymentVerifier } from '../payment/verifier.js';
import { SignatureStore, RedisSignatureStore, InMemorySignatureStore } from '../storage/signature-store.js';

export interface NextJsX402Config extends Omit<X402Config, 'rpcUrl'> {
  rpcUrl?: string;
  onPaymentVerified?: (payment: PaymentPayload & { resource: string }) => void | Promise<void>;
  onPaymentFailed?: (reason: string, request: NextRequest) => void | Promise<void>;
}

export interface RouteX402Config {
  price: number;
  asset?: string;
  description?: string;
}

export function createX402Middleware(config: NextJsX402Config) {
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

  return async function middleware(request: NextRequest): Promise<NextResponse> {
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204 });
    }

    const paymentHeader = request.headers.get('x-payment');

    if (!paymentHeader) {
      const requirements: PaymentRequirements = {
        network: config.network,
        asset: 'SOL',
        payTo: config.treasuryWallet,
        amount: '0.01',
        timeout: fullConfig.timeout,
        nonce: generateNonce(),
      };

      return NextResponse.json(requirements, {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'X-Payment-Required': 'true',
        },
      });
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
          await config.onPaymentFailed(result.reason || 'Payment verification failed', request);
        }

        return NextResponse.json(
          { error: result.reason || 'Payment verification failed' },
          { status: 402 }
        );
      }

      if (config.onPaymentVerified) {
        await config.onPaymentVerified({
          ...paymentPayload,
          resource: request.nextUrl.pathname,
        });
      }

      const response = NextResponse.next();
      response.headers.set('X-Payment-Verified', 'true');
      response.headers.set('X-Payment-Signature', paymentPayload.signature);

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment processing error';

      if (config.onPaymentFailed) {
        await config.onPaymentFailed(errorMessage, request);
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  };
}

export function withX402<T = any>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>,
  routeConfig: RouteX402Config,
  globalConfig: NextJsX402Config
): (request: NextRequest) => Promise<NextResponse<T | PaymentRequirements>> {
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

  return async (request: NextRequest): Promise<NextResponse<T | PaymentRequirements>> => {
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204 }) as NextResponse<T>;
    }

    const paymentHeader = request.headers.get('x-payment');

    if (!paymentHeader) {
      const requirements: PaymentRequirements = {
        network: globalConfig.network,
        asset: routeConfig.asset || 'SOL',
        payTo: globalConfig.treasuryWallet,
        amount: routeConfig.price.toString(),
        timeout: fullConfig.timeout,
        nonce: generateNonce(),
      };

      return NextResponse.json(requirements, {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'X-Payment-Required': 'true',
        },
      }) as NextResponse<PaymentRequirements>;
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
          await globalConfig.onPaymentFailed(result.reason || 'Payment verification failed', request);
        }

        return NextResponse.json(
          { error: result.reason || 'Payment verification failed' },
          { status: 402 }
        ) as NextResponse<T>;
      }

      if (globalConfig.onPaymentVerified) {
        await globalConfig.onPaymentVerified({
          ...paymentPayload,
          resource: request.nextUrl.pathname,
        });
      }

      const response = await handler(request);
      response.headers.set('X-Payment-Verified', 'true');
      response.headers.set('X-Payment-Signature', paymentPayload.signature);

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment processing error';

      if (globalConfig.onPaymentFailed) {
        await globalConfig.onPaymentFailed(errorMessage, request);
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      ) as NextResponse<T>;
    }
  };
}

function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
